# 代码评审报告 · v1

## 评审范围

- 后端：Python/FastAPI 实现（P6b）
- 前端：React/Next.js 实现（P6a）

## 1. 规范符合性

### 后端

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 命名规范 | ✅ 通过 | snake_case 命名，符合规范 |
| 类型注解 | ⚠️ 部分通过 | 部分函数缺少返回值类型注解 |
| Pydantic v2 | ✅ 通过 | 使用 BaseModel，model_dump() |
| FastAPI Depends | ✅ 通过 | 正确使用依赖注入 |
| 异步模式 | ⚠️ 部分通过 | 数据库操作使用同步 SQLAlchemy |

### 前端

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 组件命名 | ✅ 通过 | PascalCase 命名 |
| TypeScript | ❌ 未通过 | 使用 JavaScript，未使用 TypeScript |
| CSS Variables | ⚠️ 部分通过 | 使用 Tailwind CSS，未使用 CSS Variables |
| 列表 :key | ✅ 通过 | 使用唯一业务 ID |

## 2. 结构评估

### 后端分层

| 层 | 状态 | 说明 |
|----|------|------|
| Router | ✅ 通过 | 仅处理 HTTP 请求 |
| Service | ✅ 通过 | 业务逻辑封装 |
| Model | ✅ 通过 | SQLAlchemy ORM 模型 |
| Middleware | ✅ 通过 | 功能门控中间件 |

### 前端分层

| 层 | 状态 | 说明 |
|----|------|------|
| Page | ✅ 通过 | 页面组件 |
| Component | ✅ 通过 | 可复用组件 |
| Service | ✅ 通过 | API 调用封装 |

## 3. 性能风险

### 后端

| 风险 | 严重程度 | 说明 |
|------|----------|------|
| N+1 查询 | ⚠️ 中 | 内容列表查询品牌信息存在 N+1 风险 |
| Redis 缓存 | ✅ 低 | 用户计划缓存 5 分钟，合理 |
| 数据库连接 | ⚠️ 中 | 同步 SQLAlchemy，未使用连接池 |

### 前端

| 风险 | 严重程度 | 说明 |
|------|----------|------|
| 虚拟滚动 | ⚠️ 低 | 大数据量列表未使用虚拟滚动 |
| 图片懒加载 | ⚠️ 低 | 未实现图片懒加载 |

## 4. 接口完整性

### 已实现接口

| 接口 | 状态 | 说明 |
|------|------|------|
| GET /api/subscription/plans | ✅ | 获取所有计划 |
| GET /api/subscription/current | ✅ | 获取当前订阅 |
| POST /api/subscription/checkout | ✅ | 创建支付会话 |
| POST /api/subscription/webhook | ✅ | Stripe Webhook |
| POST /api/subscription/cancel | ✅ | 取消订阅 |
| POST /api/subscription/reactivate | ✅ | 重新激活订阅 |
| POST /api/subscription/change-plan | ✅ | 更改计划 |
| GET /api/usage/current | ✅ | 获取当前用量 |
| GET /api/usage/history | ✅ | 获取用量历史 |
| POST /api/content/generate | ✅ | 生成内容 |
| GET /api/content | ✅ | 内容列表 |
| GET /api/content/stats | ✅ | 内容统计 |
| GET /api/content/{id} | ✅ | 获取内容详情 |
| PUT /api/content/{id} | ✅ | 更新内容 |
| POST /api/content/{id}/regenerate | ✅ | 重新生成 |
| POST /api/content/{id}/confirm | ✅ | 确认内容 |
| POST /api/content/{id}/publish | ✅ | 发布内容 |
| GET /api/content/{id}/adoption | ✅ | 获取采纳数据 |
| PUT /api/brands/{id}/profile | ✅ | 更新品牌资料 |
| GET /api/brands/{id}/profile | ✅ | 获取品牌资料 |
| POST /api/crawler/analyze | ✅ | 分析网站 |

### 未实现接口

| 接口 | 状态 | 说明 |
|------|------|------|
| POST /api/crawler/analyze | ⚠️ | 返回 202，但未实现异步任务 |

## 5. 安全发现

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| SQL 注入 | ✅ 低 | 使用 SQLAlchemy ORM，参数化查询 |
| XSS | ✅ 低 | React 默认转义 HTML |
| CSRF | ⚠️ 中 | 未实现 CSRF 保护 |
| 认证 | ✅ 低 | JWT 认证，正确验证 |
| 敏感信息 | ⚠️ 中 | Stripe API Key 在配置中，需确保不泄露 |

## 6. 必须修复项

| ID | 问题 | 文件 | 说明 | 状态 |
|----|------|------|------|------|
| B1 | N+1 查询 | backend/app/routers/content.py:106 | 内容列表查询品牌信息存在 N+1 风险 | ✅ 已修复 |
| B2 | CSRF 保护 | backend/app/main.py | 未实现 CSRF 保护 | ✅ 已修复 |

### 修复说明

**B1 修复方案：**
- 使用批量查询替代 N+1 查询
- 先收集所有 brand_id，一次性查询所有品牌信息
- 使用字典映射避免重复查询

**B2 修复方案：**
- 创建 `backend/app/middleware/csrf.py` - CSRF 中间件
- 使用 Double Submit Cookie 模式
- 安全方法（GET/HEAD/OPTIONS）不需要 CSRF token
- Stripe Webhook 和公开端点豁免 CSRF 检查
- 添加 `/api/public/csrf-token` 端点获取 CSRF token
- 更新前端 API 客户端，在非安全请求中自动携带 CSRF token

## 7. 建议改进项

| ID | 问题 | 文件 | 说明 |
|----|------|------|------|
| S1 | TypeScript | frontend/ | 建议使用 TypeScript |
| S2 | 虚拟滚动 | frontend/src/app/brands/[id]/content/page.js | 大数据量列表建议使用虚拟滚动 |
| S3 | 异步任务 | backend/app/services/content_generator.py | 内容生成建议使用异步任务队列 |

## 8. 评审结论

**状态**：有条件通过

**必须修复项**：2 项（B1, B2）

**建议改进项**：3 项（S1, S2, S3）

**下一步**：
1. 修复 B1 和 B2
2. 进入 QA 测试阶段
