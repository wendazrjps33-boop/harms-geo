# 架构设计 · GeoRank 商业化 MVP

## 1. 架构影响分析

### 1.1 受影响模块

| 现有模块 | 变更类型 | 说明 |
|----------|----------|------|
| `models/User` | 扩展 | 新增订阅关联、Stripe 客户 ID、团队关联 |
| `models/Brand` | 扩展 | 新增品牌资料字段（用于内容生成输入） |
| `routers/auth` | 扩展 | 注册时自动分配 Free 计划 |
| `routers/brands` | 扩展 | 添加配额检查中间件拦截 |
| `routers/reports` | 扩展 | 添加配额检查 |
| `routers/analysis` | 扩展 | 添加功能门控检查 |
| `routers/competitor_analysis` | 扩展 | 添加功能门控检查 |
| `scheduler.py` | 扩展 | 检查频率按计划差异化调度 |
| `main.py` | 扩展 | 注册新中间件、新路由 |

### 1.2 新增模块

| 新增模块 | 职责 |
|----------|------|
| `models/subscription` | 订阅计划、用户订阅、用量记录、内容、采纳检测 |
| `routers/subscription` | 订阅管理、计划查询、Stripe Checkout/Webhook |
| `routers/content` | 内容生成、编辑、分发状态管理 |
| `routers/usage` | 用量查询 API |
| `services/billing` | Stripe 集成、Checkout Session、Webhook 处理 |
| `services/usage_tracker` | 用量计量、配额检查、定时汇总 |
| `services/content_generator` | LLM 内容生成、Prompt 组装、质量控制 |
| `services/adoption_verifier` | 平台收录检测、AI 引擎引用检测、排名对比 |
| `services/website_crawler` | 官网抓取（可选）、robots.txt 检查 |
| `middleware/subscription_gate` | 订阅状态验证、配额拦截、功能门控 |
| `task_store` | 内存任务注册表（生成状态跟踪、防重复提交） |
| `celery_tasks/adoption` | 异步采纳检测任务（定时调度） |

### 1.3 新增能力

- **订阅生命周期管理**：创建 → 升级 → 续费 → 降级 → 取消 → 到期降级 Free
- **用量计量与拦截**：每次写操作前检查配额，超出则返回 402 + 升级引导
- **AI 内容生产流水线**：数据采集 → Prompt 组装 → LLM 生成 → 结构化输出 → 质量校验
- **全链路采纳验证**：平台收录 → AI 引擎引用 → 排名变化，三级递进检测

---

## 2. 逻辑架构设计

### 2.1 模块依赖图

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js Frontend                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Dashboard │ │ Brand    │ │ Content  │ │ Subscription│ │
│  │ (用量)    │ │ Detail   │ │ Studio   │ │ Management  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       │            │            │              │         │
│  ┌────┴────────────┴────────────┴──────────────┴──────┐ │
│  │              FeatureGate 组件 + API Client           │ │
│  └────────────────────────┬────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────┘
                            │ HTTP
┌───────────────────────────┼──────────────────────────────┐
│                    FastAPI Backend                         │
│                           │                                │
│  ┌────────────────────────┴────────────────────────────┐ │
│  │         subscription_gate middleware                  │ │
│  │    (JWT解析 → 计划查询 → 配额检查 → 功能门控)        │ │
│  └───┬──────────┬──────────┬──────────┬────────────────┘ │
│      │          │          │          │                    │
│  ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴──────┐            │
│  │ auth  │ │brands │ │content│ │subscription│            │
│  │router │ │router │ │router │ │  router    │            │
│  └───┬───┘ └───┬───┘ └───┬───┘ └───┬──────┘            │
│      │         │         │         │                     │
│  ┌───┴─────────┴─────────┴─────────┴──────────────────┐ │
│  │                  Service Layer                       │ │
│  │  billing │ usage_tracker │ content_generator        │ │
│  │  adoption_verifier │ website_crawler                 │ │
│  │  ai_gateway │ statistical_analysis │ brand_service   │ │
│  └───┬─────────────────────────────────────────────────┘ │
│      │                                                    │
│  ┌───┴──────────────────────────────────────────────────┐│
│  │              Celery Task Queue (Redis)                ││
│  │  content_generation_task │ adoption_check_task        ││
│  └───┬──────────────────────────────────────────────────┘│
│      │                                                    │
│  ┌───┴──────────────────────────────────────────────────┐│
│  │          Data Layer (PostgreSQL + Redis)              ││
│  │  users │ subscriptions │ usage_records │ contents     ││
│  │  content_distributions │ adoption_checks              ││
│  └───────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责（≤2句） | 依赖 | 数据流方向 |
|------|-------------|------|-----------|
| `subscription_gate` (middleware) | 解析 JWT → 查询用户计划 → 检查配额 → 检查功能权限 | `auth_service`, `usage_tracker` | 请求 → 拦截 → 放行/拒绝 |
| `billing` (service) | Stripe Checkout/Webhook 处理、订阅状态同步 | `stripe` SDK, `subscription` model | Stripe ↔ 应用 |
| `usage_tracker` (service) | 计量各维度用量、配额判定、定时汇总 | `subscription` model, Redis | 请求 → 计量 → 存储 |
| `content_generator` (service) | 组装 Prompt → 调用 LLM → 结构化输出 → 质量校验 | `ai_gateway`, `brand_service`, `statistical_analysis` | 分析数据 → 内容 |
| `adoption_verifier` (service) | 平台收录爬取 + AI 引擎引用查询 + 排名对比 | `ai_gateway`, `content` model | 定时触发 → 检测 → 存储 |
| `website_crawler` (service) | 官网 robots.txt 检查 + 页面抓取 + 信息提取 | `httpx`, `beautifulsoup4` | URL → 品牌资料 |

### 2.3 数据流

**订阅支付流：**
```
用户点击升级 → frontend → POST /api/subscription/checkout
  → billing.create_checkout_session() → 返回 Stripe URL
  → 用户在 Stripe 完成支付
  → Stripe Webhook → POST /api/subscription/webhook
  → billing.handle_webhook() → 更新 subscription 状态 → Redis 清除用户计划缓存
```

**内容生成流（v2.1 异步任务模式）：**
```
用户选择品牌+类型 → frontend → POST /api/content/generate
  → subscription_gate 检查功能权限
  → 检查是否有同 brand 的 generating 行（防重复提交）
  → 创建占位 content 记录（status='generating', body=''）
  → 启动后台线程（daemon Thread，自有 SessionLocal）
  → 立即返回 202 + content_id（前端开始轮询）

后台线程（_run_generation）：
  → content_generator.gather_input_data(brand_id)
  → content_generator.generate(..., content_id=content_id)
    → 组装 Prompt → 调用 LLM（ai_gateway, timeout=120s）
    → 结构化输出（title, body, tags, distribution_guide）
    → 更新占位 content 记录（status='draft'）
  → 成功：usage_tracker.increment + task_store.update_task("completed")
  → 失败：更新 content status='failed' + task_store.update_task("failed")
  → finally：db.close() + 释放 generation lock

前端轮询：
  → setInterval 2s 调用 GET /api/content/{id}
  → status !== 'generating' 时停止轮询，加载内容
  → 连续 3 次网络错误后放弃
  → 120s 超时保护
```

**采纳验证流（Celery 定时任务）：**
```
每日定时扫描 → 查找 published 状态且到达检测时间点的内容
  → adoption_verifier.check_platform_indexing(content)
    → Google site: 搜索 → 记录收录状态
  → adoption_verifier.check_ai_citation(content)
    → 复用 ai_gateway 查询品牌关键词 + 内容核心短语
    → 解析响应中是否引用了发布内容
  → adoption_verifier.calculate_ranking_delta(content)
    → 对比发布前后可见度分数
  → 更新 adoption_check 记录
```

---

## 3. 数据与状态设计

### 3.1 新增实体

**SubscriptionPlan（计划定义）**
- 属性：plan_code(PK), name, price_monthly, price_yearly, brand_limit, query_limit, engine_limit, check_interval_hours, history_days, competitor_limit, team_members, content_monthly_limit, content_types_allowed, api_access, white_label, report_watermark
- 生命周期：静态配置表，管理后台可动态调整

**UserSubscription（用户订阅）**
- 属性：id(PK), user_id(FK), plan_code(FK), status, current_period_start, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, trial_end
- 状态机：trialing → active → past_due → canceled → (自动降级 free)
- 一致性风险：Stripe Webhook 与本地状态不同步 → 以 Stripe 为 source of truth，Webhook 处理幂等化

**UsageRecord（用量记录）**
- 属性：id(PK), user_id(FK), dimension(brand/query/check/content), period_start, period_end, used_count, limit_count
- 索引：(user_id, dimension, period_start) 唯一索引

**Content（生成内容）**
- 属性：id(PK), user_id(FK), brand_id(FK), content_type, title, body, tags(JSON), platform_format, distribution_guide(JSON), status(draft/ready/distributing/published/verified), source_analysis_run_id(FK, nullable), published_at, target_platform_url
- 索引：(user_id, status), (brand_id, content_type)

**AdoptionCheck（采纳检测）**
- 属性：id(PK), content_id(FK), check_type(platform_index/ai_citation/ranking_delta), check_date, result(JSON), score_delta, created_at
- 索引：(content_id, check_type, check_date)

### 3.2 现有实体变更

**User 扩展**
- 新增：stripe_customer_id(nullable), default_plan_code(default 'free')

**Brand 扩展**
- 新增：brand_description(TEXT), core_products(TEXT), target_audience(TEXT), website_crawled_at(nullable)

### 3.3 状态管理

- **订阅状态**：Redis 缓存用户当前计划（TTL 5min），Webhook 处理时主动清除缓存
- **用量计数**：Redis INCR 实时计数，每日定时任务写入 PostgreSQL 持久化
- **内容状态**：PostgreSQL 为主，前端乐观更新
- **采纳检测结果**：仅 PostgreSQL 存储，无缓存需求

---

## 4. 非功能性分析

| 维度 | 目标 | 实现策略 |
|------|------|----------|
| 支付一致性 | Webhook 处理幂等，≤5s 生效 | Stripe Webhook 签名验证 + event_id 去重 + Redis 缓存主动失效 |
| 配额检查延迟 | <10ms/次 | Redis INCR 原子操作，不查 PostgreSQL |
| 内容生成延迟 | ≤30s/篇 | Celery 异步任务 + LLM 流式调用 + 结果缓存 |
| 并发生成 | 10+ 并发 | Celery worker 水平扩展（concurrency=10） |
| 采纳检测吞吐 | ≤120s/品牌 | 批量查询 + 并行检测（platform + ai_citation 同时进行） |
| API 响应时间 | <200ms (p95) | Redis 缓存计划数据 + 数据库连接池 + 查询优化 |
| 可扩展性 | 计划动态调整 | 计划配置存数据库，不硬编码；Redis 缓存 + 主动失效 |

---

## 5. 风险与权衡

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Stripe Webhook 丢失或延迟 | 中 | 订阅状态不一致 | Webhook 重试机制 + 每日对账任务（对比 Stripe 与本地状态） |
| LLM 生成内容质量不稳定 | 高 | 用户体验差 | 多轮 Prompt 优化 + 质量评分 + 人工审核环节 |
| Redis 用量计数丢失 | 低 | 用量数据不准 | 每日持久化到 PostgreSQL + 启动时从 DB 恢复计数 |
| 采纳检测误判（AI 引擎引用了但未检测到） | 中 | 效果数据不准 | 多引擎交叉验证 + 引用匹配使用模糊匹配（相似度 >0.7） |
| 内容生成 Prompt 注入 | 低 | 生成不当内容 | 用户输入清洗 + 输出内容过滤 + 平台合规检查 |

---

## 6. 替代方案

### 方案 A（当前选择）：Monolith + Celery 异步任务

- 所有模块在同一 FastAPI 进程，长任务通过 Celery 异步执行
- 优点：部署简单、调试方便、适合当前规模
- 缺点：模块间耦合度较高，扩展受限
- 选择理由：MVP 阶段团队规模小、功能迭代快，单体架构足够

### 方案 B（拒绝）：微服务拆分

- 将订阅、内容生成、采纳检测拆分为独立服务
- 优点：独立部署、独立扩展、技术栈可差异化
- 缺点：运维复杂度高、服务间通信开销、当前团队规模不支撑
- 拒绝理由：MVP 阶段过早微服务化会拖慢交付速度，待用户量 >10K 时再评估

---

## 7. 内容生成优化架构设计（v1.1 追加）

### 7.1 受影响模块

| 模块 | 变更类型 | 说明 |
|------|---------|------|
| `content_generator.py` | 修改 | 新增 engine 参数、字数控制 prompt、JSON 解析重试 |
| `ai_gateway.py` | 修改 | `max_tokens` 4000→8000，generate_text 接口不变 |
| `schemas/content.py` | 修改 | ContentGenerateRequest 新增 target_word_count、engine |
| `routers/content.py` | 修改 | 透传新参数至 service 层 |
| `ContentEditor.js` | 重写 | textarea → TipTap 富文本编辑器 |
| `content/page.js` | 修改 | 生成弹窗新增字数、模型选择控件 |
| 新增 `routers/upload.py` | 新增 | 图片上传接口 |
| 新增 `services/storage.py` | 新增 | 存储抽象层（OSS / local） |
| 新增 `services/thumbnail.py` | 新增 | 缩略图生成（Pillow） |

### 7.2 新增模块职责

| 模块 | 职责 | 依赖 | 数据流 |
|------|------|------|--------|
| `storage.py` | 文件上传、URL 生成、格式校验 | oss2（阿里云）或本地 fs | 文件 → 存储 → URL |
| `upload.py` (router) | 接收文件、校验、调用 storage | storage.py | HTTP → storage |
| `thumbnail.py` | 生成缩略图（宽度 300px，高度按比例） | Pillow | 原图 → 缩略图 → 存储 |

### 7.3 数据流（修改后）

**内容生成流（修改）：**
```
用户选择类型+字数+模型 → POST /api/content/generate
  → router 透传 engine, target_word_count
  → content_generator.gather_input_data(brand_id)
  → content_generator.generate(..., engine="mimo", target_word_count=1000)
    → prompt 追加字数要求
    → ai_gateway.generate_text(sys, user, engine="mimo")
      → 失败 → fallback to mimo（二次）→ 报错
    → _parse_llm_output() → 重试 2 次
  → 存入 generated_contents（含 engine, target_word_count）
```

**图片上传流（新增）：**
```
用户拖拽/粘贴/点击上传 → POST /api/upload/image
  → 校验格式（JPG/PNG/WebP）+ 大小（≤10MB）
  → storage.upload(file) → OSS 或 uploads/images/YYYY/MM/DD/uuid.ext
    → OSS 失败 → fallback 到本地存储
  → thumbnail.generate(file, width=300) → 缩略图
  → 返回 { url, thumbnail_url, width, height }
  → TipTap editor.chain().focus().setImage({src: url}).run()
  → body 中存储 HTML <img> 标签
```

### 7.4 数据与状态设计（变更）

**`generated_contents` 表新增字段：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| engine | VARCHAR(20) | 'mimo' | 生成所用 AI 引擎 |
| target_word_count | INTEGER | 1000 | 用户指定目标字数 |

**无 schema 迁移风险**：body 字段 TEXT 类型兼容 plain text 和 HTML。旧数据保持原样，新数据存储 HTML。

### 7.5 非功能性分析（追加）

| 维度 | 目标 | 实现 |
|------|------|------|
| 生成延迟 | ≤ 30s | max_tokens 8000 + MIMO 低延迟引擎 |
| 上传延迟 | ≤ 5s (10MB) | 后端代理上传（非直传 OSS），MVP 够用 |
| 本地存储清理 | 无（MVP） | 后续加定时任务清理 >90 天无引用文件 |

### 7.6 风险（追加）

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| LLM JSON 截断导致 body 为空 | 中 | Bug 复现 | 重试 2 次 + fallback prompt（纯文本输出） |
| TipTap 输出 HTML 与旧 Markdown 渲染冲突 | 低 | 预览异常 | 预览统一用 dangerouslySetInnerHTML 渲染 HTML |
| OSS 配置错误 | 中 | 上传不可用 | 启动校验连通性；fallback 到本地存储 |
| 图片 XSS 注入 | 低 | 安全风险 | 预览时 DOMPurify 过滤 |

### 7.7 替代方案（追加）

**方案 A（接受）：后端代理上传**
- 文件经后端转存至 OSS
- 优点：实现简单，无需 STS 签名
- 缺点：占用后端带宽
- 理由：MVP 并发低，可接受

**方案 B（拒绝）：前端直传 OSS + STS**
- 优点：不占后端带宽
- 缺点：需实现 STS 签名服务，增加安全复杂度
- 拒绝理由：MVP 阶段无需此复杂度

**方案 C（拒绝）：S3 兼容协议统一接口**
- 优点：可对接 AWS S3 / 阿里云 OSS / MinIO
- 缺点：引入 boto3，与现有技术栈不一致
- 拒绝理由：MVP 仅需阿里云 OSS，后续迭代再考虑

---

## 8. v3.0 架构设计（技术债清理 + Add-on）

> 版本：v3.0 | 创建：2026-06-04

### 8.1 架构影响分析

| 现有模块 | 变更类型 | 说明 |
|----------|----------|------|
| `frontend/src/**` | 重命名 + 类型化 | 全部 .js → .ts/.tsx，添加类型定义 |
| `quality_checker.py` | 修改 | `_calculate_overlap` 引入 jieba 分词 |
| `ContentEditor.js` | 修改 | 安装 characterCount 扩展 + 拖拽/粘贴上传 |
| `content/page.js` | 修改 | 引入虚拟滚动 |
| `brands/page.js` | 修改 | 引入虚拟滚动 |
| `services/usage_tracker.py` | 修改 | 查询 Add-on 额度，合并到配额上限 |
| `routers/subscription.py` | 扩展 | 新增 Add-on checkout 和查询端点 |
| `services/billing.py` | 扩展 | Webhook 处理 Add-on 支付事件 |

### 8.2 新增模块

| 新增模块 | 职责 | 依赖 | 数据流 |
|----------|------|------|--------|
| `models/addon_purchase.py` | Add-on 购买记录 model | SQLAlchemy, User | — |
| `routers/subscription.py` (扩展) | Add-on checkout + 列表 API | billing, usage_tracker | HTTP → Service |
| `types/addon.ts` | Add-on 前端类型定义 | — | — |
| `components/VirtualList.tsx` | 虚拟滚动封装组件 | @tanstack/react-virtual | — |
| `lib/word-count.ts` | 中文字数统计工具函数 | — | — |

### 8.3 逻辑架构变更

**TypeScript 迁移（纯前端，无架构变更）：**
- 自底向上迁移：types/ → lib/ → services/ → components/ → app/
- 每阶段独立可构建，不改变模块边界
- 新增 `types/` 目录统一管理 API 响应类型

**Add-on 数据流：**
```
用户点击"购买" → frontend → POST /api/subscription/addon/checkout
  → billing.create_addon_checkout_session(user_id, addon_type, quantity)
  → 创建 Stripe Checkout Session（metadata 标记为 addon 类型）
  → 返回 Stripe URL → 用户完成支付

Stripe Webhook → POST /api/subscription/webhook
  → 检测 event.data.object.metadata.type === "addon"
  → billing.handle_addon_webhook(event)
    → 创建 AddonPurchase 记录（status=active）
    → Redis 清除用户配额缓存
  → 下次配额检查时 usage_tracker 自动合并 Add-on 额度
```

**配额合并算法（usage_tracker 修改）：**
```
get_effective_limit(user_id, dimension):
  base_limit = subscription.plan.{dimension}_limit
  addon_sum = SUM(AddonPurchase.quantity)
    WHERE user_id = ? AND addon_type = ? AND status = 'active' AND expires_at > NOW()
  return base_limit + addon_sum
```

### 8.4 数据与状态设计

**新增实体：AddonPurchase**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL PK | 主键 |
| user_id | BIGINT FK → users.id | 关联用户 |
| addon_type | VARCHAR(32) | brand_slot / query_pack / content_pack |
| quantity | INT | 购买数量 |
| amount | DECIMAL(18,4) | 支付金额 |
| currency | VARCHAR(3) | 货币代码（USD） |
| stripe_session_id | VARCHAR(255) | Stripe Checkout Session ID |
| status | VARCHAR(16) | pending / active / expired / cancelled |
| plan_period_start | TIMESTAMP | 关联订阅周期开始 |
| plan_period_end | TIMESTAMP | 关联订阅周期结束 |
| expires_at | TIMESTAMP | Add-on 到期时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**索引策略：**
- 主索引：`id`
- 查询索引：`(user_id, status, expires_at)` — 查询用户有效 Add-on
- 唯一约束：`(user_id, addon_type, plan_period_start)` — 防止同一周期重复购买

**状态管理变更：**
- Redis 缓存用户有效 Add-on 额度（TTL 5min），与计划缓存同步失效
- Webhook 处理时主动清除缓存
- 过期 Add-on 由每日定时任务标记为 expired

### 8.5 非功能性分析

| 维度 | 目标 | 实现策略 |
|------|------|----------|
| Add-on 支付一致性 | ≤5s 生效 | Webhook 签名验证 + event_id 幂等 + Redis 缓存主动失效 |
| 配额合并延迟 | <10ms | Redis 缓存 Add-on 额度，与计划缓存同 TTL |
| TypeScript 迁移 | 零功能回归 | 分 4 阶段，每阶段 build 验证 + 冒烟测试 |
| 字数统计准确性 | 偏差 ≤5% | 前端正则匹配中文字符，后端 jieba 分词 |
| 虚拟滚动性能 | <100ms 首屏 | @tanstack/react-virtual 动态测量 |
| 拖拽上传响应 | ≤3s | 复用现有上传逻辑，无额外网络开销 |

### 8.6 风险与权衡

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| TS 迁移引入运行时 Bug | 中 | 功能异常 | 分阶段迁移 + 每阶段冒烟测试 + 保留 JS fallback |
| jieba 首次加载慢（~2s） | 中 | 首次请求延迟 | 应用启动时后台预加载 jieba 词典 |
| Add-on 与订阅周期不同步 | 低 | 配额计算错误 | Webhook 处理时从 Stripe 获取当前周期时间 |
| 虚拟滚动与动态行高 | 中 | 列表跳动 | 使用 measureElement 动态测量 + 预估行高 80px |
| Add-on 过期后用户仍在使用 | 低 | 配额溢出 | 过期检查 + 阻止新增操作（保留数据） |

### 8.7 替代方案

**方案 A（当前选择）：Add-on 合并到配额统一消耗**
- Add-on 额度直接加到基础配额上限中
- 优点：实现简单，usage_tracker 改动最小
- 缺点：无法区分"基础配额"和"Add-on 配额"的消耗比例
- 选择理由：MVP 阶段简化实现，用户仅需看到总可用配额

**方案 B（拒绝）：Add-on 独立消耗池**
- Add-on 配额独立于基础配额，优先消耗 Add-on
- 优点：可精确追踪 Add-on 使用情况
- 缺点：消耗逻辑复杂，需维护两个计数器
- 拒绝理由：增加实现复杂度，MVP 阶段无业务价值
