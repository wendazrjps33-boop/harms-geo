# GeoRank 架构设计文档

> 版本：v5.0 | 日期：2026-08-07
> 基于：市场驱动重构 + 现有代码审计

---

## 1. 系统架构概览

### 1.1 整体架构

```
                    +-----------+
                    |  Nginx    |
                    | (反向代理) |
                    +-----+-----+
                          |
              +-----------+-----------+
              |                       |
        +-----+-----+          +-----+-----+
        | Next.js   |          | FastAPI   |
        | Frontend  |  REST    | Backend   |
        | :3000     | -------> | :8000     |
        +-----------+          +-----+-----+
                                    |
                        +-----------+-----------+
                        |           |           |
                   +----+---+  +---+----+  +---+----+
                   |PostgreSQL| | Redis  | | Celery |
                   | 16+     | | 7+     | | Worker |
                   +---------+ +--------+ +--------+
```

### 1.2 技术栈锁定

| 层 | 技术 | 版本 | 备注 |
|----|------|------|------|
| 前端框架 | Next.js + React | 14 / 18 | App Router |
| 前端语言 | TypeScript | 5.x | strict mode |
| 前端样式 | Tailwind CSS | 3.x | + CSS Variables |
| HTTP 客户端 | fetch (原生) | — | API client 已封装 |
| 图表 | Chart.js + react-chartjs-2 | 4.x | |
| 编辑器 | TipTap | 2.x | Rich Text |
| 后端框架 | FastAPI | 0.115+ | |
| ORM | SQLAlchemy | 2.x | sync mode |
| 数据库 | PostgreSQL | 16+ | |
| 缓存/队列 | Redis | 7+ | 缓存 + Celery broker |
| 任务队列 | Celery | 5.3+ | 含 beat scheduler |
| 支付 | Stripe | — | Checkout + Webhook |
| LLM SDK | openai / anthropic / google-generativeai | — | 多引擎 |

---

## 2. 后端架构

### 2.1 请求处理管线

```
HTTP Request
    |
    v
[CSRF Middleware]  -- POST/PUT/DELETE 请求校验 CSRF Token
    |
    v
[CORS Middleware]  -- 跨域配置
    |
    v
[Router Handler]
    |
    v
[Depends(require_feature_with_quota)]  -- 统一鉴权 + 功能门控 + 配额检查
    |  1. JWT 认证 (get_current_user)
    |  2. 功能门控 (FEATURE_PLAN_MAP)
    |  3. 配额检查 (usage_tracker.check_quota)
    v
[Business Logic (Service Layer)]
    |
    v
[Database / Redis / External API]
```

### 2.2 AI 引擎抽象层（待重构）

当前 `ai_gateway.py` 存在的问题：
- 6 个 `query_xxx` 函数代码高度重复
- `generate_text` 引用未定义的 `logger`
- `check_visibility` 无超时/重试
- `_call_llm` 中每个引擎分支重复创建 client

**目标架构：插件化引擎注册**

```python
class EngineAdapter(Protocol):
    """AI 引擎适配器协议"""
    name: str
    base_url: str
    model: str

    def chat(self, messages: list[dict], max_tokens: int, timeout: float) -> str:
        """发送聊天请求，返回纯文本"""
        ...

class OpenAIAdapter:
    """OpenAI / DeepSeek / MiMo / 通义千问 适配器（兼容 OpenAI API）"""
    def __init__(self, name: str, api_key: str, base_url: str, model: str):
        self.name = name
        self.client = OpenAI(api_key=api_key, base_url=base_url, timeout=30)

    def chat(self, messages, max_tokens=500, timeout=30.0):
        resp = self.client.chat.completions.create(
            model=self.model, messages=messages, max_tokens=max_tokens
        )
        return resp.choices[0].message.content or ""

class ClaudeAdapter:
    """Anthropic Claude 适配器"""
    ...

class GeminiAdapter:
    """Google Gemini 适配器"""
    ...

# 引擎注册表
ENGINE_REGISTRY: dict[str, EngineAdapter] = {
    "openai": OpenAIAdapter("openai", settings.OPENAI_API_KEY, "https://api.openai.com/v1", "gpt-3.5-turbo"),
    "deepseek": OpenAIAdapter("deepseek", settings.DEEPSEEK_API_KEY, "https://api.deepseek.com/v1", "deepseek-chat"),
    "mimo": OpenAIAdapter("mimo", settings.MIMO_API_KEY, settings.MIMO_BASE_URL, settings.MIMO_MODEL),
    "qianwen": OpenAIAdapter("qianwen", settings.QIANWEN_API_KEY, "https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-turbo"),
    "claude": ClaudeAdapter("claude", settings.ANTHROPIC_API_KEY, "claude-sonnet-4-20250514"),
    "gemini": GeminiAdapter("gemini", settings.GOOGLE_API_KEY, "gemini-pro"),
}
```

### 2.3 外部服务集成规范

| 服务类型 | 超时 | 重试 | 降级 |
|----------|------|------|------|
| LLM 调用（可见性检测） | 30s | 2 次，指数退避 | 主引擎失败切备用 |
| LLM 调用（内容生成） | 60s | 2 次，指数退避 | 主引擎失败切 mimo |
| SERP API | 30s | 1 次 | 降级到 URL 存活检测 |
| Stripe API | 15s | 0 | 报错，不重试 |
| Redis | 5s | 连接池自动重连 | — |

### 2.4 后台任务架构

```
[API Router]
    |
    v
[Celery Task] (async, persistent)
    |
    +-- generate_content_async     -- 内容生成
    +-- regenerate_content_async   -- 内容重新生成（待切换）
    +-- check_adoption             -- 采纳效果检测（定时）
    +-- sync_usage_to_db           -- 用量数据同步（定时）
    +-- expire_addons              -- Add-on 过期清理（定时）
```

**定时任务：**
- 每小时：sync_usage_to_db（Redis → PostgreSQL）
- 每 6 小时：check_usage_warnings（用量告警）
- 每天 02:00：check_adoption（采纳效果检测）
- 每天 00:05：expire_addons（Add-on 过期）

---

## 3. 前端架构

### 3.1 目录结构

```
frontend/src/
├── app/
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页（重定向到 login/dashboard）
│   ├── login/page.tsx          # 登录页
│   ├── register/page.tsx       # 注册页
│   ├── i18n/context.tsx        # 国际化 Context
│   └── (app)/                  # 已认证布局组
│       ├── layout.tsx          # App Shell（侧边栏 + 顶栏）
│       ├── dashboard/page.tsx  # 仪表盘
│       ├── brands/             # 品牌管理
│       ├── analytics/          # 可见性分析
│       ├── content/            # 内容管理
│       ├── subscription/       # 订阅管理
│       ├── billing/            # 账单
│       ├── api-keys/           # API Key 管理
│       ├── team/               # 团队管理
│       └── white-label/        # 白标设置
├── components/
│   ├── ui/                     # 基础 UI 组件（Button/Card/Modal/Input/Select...）
│   ├── ContentEditor.tsx       # TipTap 编辑器
│   ├── PublishModal.tsx        # 发布弹窗
│   ├── FeatureGate.tsx         # 功能门控组件
│   ├── VisibilityChart.tsx     # 可见性图表
│   └── ...
├── lib/
│   ├── cn.ts                   # className 合并工具
│   ├── constants.ts            # 常量（引擎列表等）
│   ├── status.ts               # 状态/标签映射
│   └── word-count.ts           # 字数统计
├── services/
│   ├── api.ts                  # API 客户端（类型化 fetch 封装）
│   └── auth.ts                 # Token 管理
└── types/
    └── api.ts                  # 全部 API 类型定义
```

### 3.2 状态管理

- 使用 React 本地 state（useState/useEffect）
- 不引入全局状态库（Redux/Zustand），MVP 阶段复杂度不支持
- API 请求通过 services/api.ts 统一封装（CSRF + Auth + 错误处理）
- 国际化通过 React Context（i18n/context.tsx）

### 3.3 认证流程

```
用户登录 → 后端返回 JWT Token → 前端 localStorage 存储
    → 每次请求携带 Authorization: Bearer <token>
    → 401 响应自动清除 Token 并跳转 /login
```

---

## 4. 数据流架构

### 4.1 内容生成数据流

```
前端 POST /api/content/generate
    → Router: require_feature_with_quota("content_generation", "content")
    → 创建 GeneratedContent(status="generating")
    → Celery: generate_content_async.delay(content_id, ...)
    → 返回 202 + content_id

Celery Worker:
    → content_generator.gather_input_data(db, brand_id)
    → content_generator.generate_content(db, ...)
    → ai_gateway.generate_text(system_prompt, user_prompt, engine)
    → _parse_llm_output(text) → JSON
    → check_quality(db, brand_id, content_type, title, body)
    → 更新 GeneratedContent(status="draft")

前端轮询 GET /api/content/{id}:
    → status 从 generating → draft → 展示编辑器
```

### 4.2 采纳效果追踪数据流

```
Celery Beat (每天 02:00):
    → check_adoption task
    → 查询所有已发布且未完成检测的内容
    → 对每个 content：
        → serp_gateway.check_url_indexed(platform_url) → 平台收录
        → ai_gateway.check_visibility(brand_name, query, engine) × 6 → AI 引用
        → 计算排名变化（发布前后对比）
        → 创建 AdoptionCheck 记录
```

---

## 5. 安全架构

### 5.1 认证与授权

- JWT Token（HS256），有效期 24 小时
- CSRF 防护（双提交 Cookie 模式）
- bcrypt 密码哈希
- 角色：owner / admin / member（团队功能）

### 5.2 数据安全

- PII 字段（邮箱）应用层加密存储
- API Key 仅存储 key_prefix，完整 key 只在创建时返回一次
- Redis 密码通过环境变量注入
- CORS 仅允许指定域名

---

## 6. 部署架构

### 6.1 Docker Compose 部署

```yaml
services:
  postgres:    # PostgreSQL 16
  redis:       # Redis 7
  backend:     # FastAPI + Uvicorn
  celery-worker:  # Celery Worker
  celery-beat:    # Celery Beat Scheduler
  frontend:    # Next.js (standalone mode)
  nginx:       # 反向代理
```

### 6.2 环境变量管理

所有敏感配置通过 `.env` 文件或环境变量注入，禁止硬编码：
- DATABASE_URL, REDIS_URL, REDIS_PASSWORD
- SECRET_KEY, JWT 签名密钥
- 各 AI 引擎 API Key
- Stripe 密钥
- SMTP 配置
