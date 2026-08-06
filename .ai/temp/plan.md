# 技术实现方案 · GeoRank 商业化 MVP

> 衔接 WBS v2.5 任务与具体代码结构。基于 architect.md + api-contract.md + db-design.md。

---

## Epic 1：UI 重构

### T1.1.1 扩展 tailwind.config.js

**文件：** `frontend/tailwind.config.js`

**实现：** 在 `theme.extend.colors` 中添加 brand/surface/success/warning/danger/muted 语义化 token（值引用 ui-design.md Section 2.1）。`theme.extend.boxShadow` 添加 card/card-hover/modal 三级。

**决策：** 使用 `extend` 而非覆盖默认主题，保留 Tailwind 原生 utility class。

---

### T1.1.2 扩展 globals.css

**文件：** `frontend/src/app/globals.css`

**实现：** `:root` 添加 CSS 自定义属性（ui-design.md Section 5 全部变量）。添加 `.btn`/`.card`/`.input`/`.badge` 基础 utility class，使用 CSS 变量。

**依赖：** T1.1.1

---

### T1.1.3 创建 cn.js

**文件：** `frontend/src/app/lib/cn.js`（新建）

**实现：** 简单 className merge，过滤 falsy 值，不引入新依赖。

---

### T1.2.1 Button 组件

**文件：** `frontend/src/app/components/ui/Button.js`（新建）

**实现：** `variant`（primary/secondary/danger/ghost）+ `size`（sm/md/lg）+ `loading` + `disabled`。使用 `cn()` 合并 className。引用 ui-design.md Section 3.1。

---

### T1.2.2 Modal 组件

**文件：** `frontend/src/app/components/ui/Modal.js`（新建）

**实现：** title + body + footer。ESC 关闭（useEffect keydown）。遮罩点击关闭。`createPortal` 渲染到 document.body。

---

### T1.2.3 Drawer 组件

**文件：** `frontend/src/app/components/ui/Drawer.js`（已有实现，验证验收标准）

**验收标准：**
1. ARCH-8：cancelAnimationFrame 在 useEffect cleanup 中正确取消 pending rAF
2. QA-9：关闭时 closingRef 立即禁用 pointerEvents
3. side='right' 和 side='left' 均可正常工作
4. loading=true 时 footer 显示 spinner + "保存中..."
5. **无障碍（v2.5）：** `role="dialog"` + `aria-modal="true"` + `aria-label={title}` + 关闭按钮 `aria-label="Close drawer"`
6. **焦点陷阱（v2.5）：** Tab 键在 Drawer 内循环（首尾元素），Escape 关闭，关闭后焦点恢复到触发元素

**引用：** ui-design.md Section 7.1

---

### T1.2.4-T1.2.7 其他 UI 组件

**文件：** `frontend/src/app/components/ui/Card.js`, `Badge.js`, `Input.js`, `Select.js`, `Skeleton.js`, `EmptyState.js`, `PageHeader.js`（均新建）

**实现：** 每个组件遵循 ui-design.md Section 3 状态定义。CSS 变量，不硬编码颜色。

**Input 组件无障碍（v2.5）：** 自动生成 `inputId`（`input-{n}`），`label` 通过 `htmlFor` 关联 `input[id]`。

---

### T1.2.8 更新 ui/index.js

**文件：** `frontend/src/app/components/ui/index.js`（新建 barrel export）

**实现：** 统一导出全部 10 个组件。

---

### T1.3.1 创建 Sidebar.js

**文件：** `frontend/src/app/components/AppShell.js`（已重写，验证验收标准）

**验收标准：**
1. ≥1024px：固定展开，可折叠为图标模式
2. 768px-1023px：折叠为图标，hover 展开
3. <768px：隐藏，汉堡按钮触发 Drawer 覆盖层
4. 汉堡按钮触摸区域 ≥44x44px（QA-5）
5. localStorage 持久化 collapsed 状态（ARCH-2）
6. **语言切换器（v2.5）：** 从 Sidebar 底部移至 Main 区域顶部右侧（`h-14` bar，`justify-end`）

---

### T1.3.2 创建 (app)/layout.js

**文件：** `frontend/src/app/(app)/layout.js`（已实现，验证 ARCH-1）

**验收：** 无 'use client'，Server Component，导入 AppShell 包裹 children。

---

### T1.3.3 修改根 layout.js

**文件：** `frontend/src/app/layout.js`

**实现：** 移除 'use client'（ARCH-6），简化为仅 Providers。

---

### T1.4.1 Dashboard 页面

**文件：** `frontend/src/app/(app)/dashboard/page.js`

**实现：**
- PageHeader + "新建内容"按钮 → PM-9 Modal（品牌 Select + 类型 Select + 字数 Input + 引擎 Select → 跳转编辑器）
- 统计卡片网格 4 列 + 最近内容列表 + 快捷入口
- 响应式：`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

**API：** GET /api/content/stats

---

### T1.4.2 品牌管理页面

**文件：** `frontend/src/app/(app)/brands/page.js`

**实现：**
- 卡片网格 + EmptyState
- Drawer 编辑（PM-7 表单分组）：分组 1 基本信息 + 分组 2 品牌资料
- 保存后关闭 Drawer + 刷新列表
- 响应式：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**API：** PUT /api/brands/{id}/profile

---

### T1.4.3 内容中心页面

**文件：** `frontend/src/app/(app)/content/page.js`

**实现：**
- 筛选栏（品牌/类型/状态 Select + 搜索 Input）
- 内容表格（标题/品牌/类型/状态 Badge/字数/日期/操作）
- 新建内容 Modal（同 PM-9）
- 响应式：小屏表格→卡片列表

**API：** GET /api/content

---

### T1.4.4 内容编辑页面

**文件：** `frontend/src/app/(app)/content/[id]/page.js`

**实现：**
- 面包屑导航（PM-5）：`内容中心 / {标题}` + 状态 Badge + 操作按钮组
- 左栏：TipTap 编辑器（固定高度 500px，内部滚动）
- 右栏 Tab：预览 / 分发指南 / 采用追踪
  - 预览区：最大高度 576px（`max-h-[36rem]`），超出滚动
  - 分发指南：结构化渲染平台卡片（名称 + 最佳发布时间 + 步骤列表），非原始 JSON
- 采用追踪 Tab：platform_indexing + ai_citations + ranking_delta + timeline
- 移动端 accordion（UI-5）
- **AbortController（v2.5）：** 轮询 fetch 接入 signal，stopPolling 时中止进行中请求，catch 过滤 AbortError

**API：** GET/PUT /api/content/{id}, GET /api/content/{id}/adoption

---

### T1.4.5 数据分析页面

**文件：** `frontend/src/app/(app)/analytics/page.js`

**实现：** Tab 导航（可见性/竞品/对比）+ 各 Tab 内容区。响应式：Tab 改下拉，图表全宽。

---

### T1.4.6 订阅管理页面

**文件：** `frontend/src/app/(app)/subscription/page.js`

**实现：** 当前计划卡片 + 三档定价卡片 + 用量进度条。响应式：3→1 列。

**API：** GET /api/subscription/plans, GET /api/subscription/current

---

### T1.5.1-T1.5.2 TipTap 编辑器

**文件：** `frontend/src/app/components/TipTapEditor.js`（新建）

**依赖：** `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-image` + `@tiptap/extension-typography`

**实现：**
- 工具栏：加粗/斜体/H2/H3/列表/引用/代码块/图片
- 编辑区 + 字数统计 + Markdown 快捷键
- **编辑区高度（v2.5）：** 固定 `500px`（`h-[500px] overflow-y-auto`），内容超出时内部滚动，工具栏和字数统计固定
- 图片插入：POST /api/upload/image → editor.chain().focus().setImage({src}).run()
- 预览：dangerouslySetInnerHTML + DOMPurify 过滤

---

### T1.6.1 内容生成轮询逻辑

**文件：** `frontend/src/app/(app)/content/[id]/page.js` 或独立 hook

**实现：**
- 2s 间隔轮询 GET /api/content/{id}
- status !== 'generating' 时停止
- 连续 3 次网络错误放弃
- 120s 超时保护
- 建议封装为 `useContentPolling(contentId)` custom hook

---

### T1.6.2 Content Studio i18n

**文件：** `frontend/src/app/(app)/content/page.js`, `content/[id]/page.js`, `frontend/src/app/i18n/translations/*.json`

**实现：** 提取约 50+ 硬编码中文字符串到翻译文件（zh-CN + en）。

**错误文案 i18n（v2.5）：** 6 个页面共 16 个硬编码英文错误字符串替换为 `t()` 调用：
- dashboard: `loadFailed`, `createFailed`
- content: `loadFailed`, `createFailed`
- analytics: `loadFailed`, `loadBrandsFailed`, `startFailed`
- subscription: `loadFailed`, `checkoutFailed`, `cancelFailed`, `reactivateFailed`
- content/[id]: `loadFailed`, `saveFailed`, `confirmFailed`, `regenerateFailed`, `publishFailed`

新增 `content.bestTime` key 用于分发指南最佳发布时间显示。

---

### T1.7.1 三档响应式适配

**文件：** 所有 6 个页面文件

**实现：** 逐页验证 375px / 768px / 1280px 三档宽度下布局正常。

---

## Epic 2：订阅管理

### T2.1.1 创建 subscription 相关表

**文件：** `backend/app/models/subscription.py`（新建）

**实现：** SQLAlchemy 2.x 模型：subscription_plans, user_subscriptions, usage_records, team_members。字段遵循 db-design.md Section 2.1-2.3, 2.8。

---

### T2.1.2 种子数据

**文件：** `backend/app/models/seed.py` 或 `db-init.sql`

**实现：** Free/Pro/Agency 三档计划写入 subscription_plans。遵循 api-contract.md GET /api/subscription/plans 响应 Schema。

---

### T2.1.3 users 表 ALTER

**文件：** `backend/app/models/user.py`

**实现：** 新增 stripe_customer_id (VARCHAR(255), nullable) + default_plan_code (VARCHAR(20), default='free')。brands 表不修改。

---

### T2.2.1 billing service

**文件：** `backend/app/services/billing.py`（新建）

**实现：**
- Checkout Session：stripe.checkout.Session.create()，metadata 携带 user_id + plan_code
- Webhook：验证 Stripe-Signature → event_id 去重（Redis SETNX）→ 按 event.type 分发
- 处理事件：checkout.session.completed / invoice.payment_succeeded / invoice.payment_failed / customer.subscription.deleted
- 处理后清除 Redis 用户计划缓存

**依赖：** stripe SDK, Redis

---

### T2.2.2 订阅管理 router

**文件：** `backend/app/routers/subscription.py`（新建）

**实现：** 7 个端点（GET /plans, GET /current, POST /checkout, POST /webhook, POST /cancel, POST /reactivate, POST /change-plan）。router 层仅处理 HTTP，业务逻辑委托 billing service。

**注意：** POST /webhook 不走 JWT 认证，走 Stripe 签名验证。

---

### T2.2.3 注册自动分配 Free 计划

**文件：** `backend/app/routers/auth.py`（修改）

**实现：** 注册成功后自动创建 user_subscriptions（plan_code='free', status='active'）。

---

### T2.3.1 usage_tracker service

**文件：** `backend/app/services/usage_tracker.py`（新建）

**实现：**
- Redis INCRBY 原子计数（延迟 <10ms）
- 配额检查：Redis GET vs 计划 limit
- 每日汇总：定时任务写入 PostgreSQL usage_records
- Redis key：`usage:{user_id}:{dimension}:{YYYY-MM}`，TTL 2 个月

---

### T2.3.2 subscription_gate middleware

**文件：** `backend/app/middleware/subscription_gate.py`（新建）

**实现：** FastAPI Depends() 模式：
1. 解析 JWT → user_id
2. Redis 查计划（TTL 5min）
3. 检查配额（Redis GET）
4. 检查功能权限
5. 超出返回 402/403

**使用：** `@router.post("/content/generate", dependencies=[Depends(require_quota("content"))])`

---

### T2.3.3 GET /api/usage/current

**文件：** `backend/app/routers/usage.py`（新建）

**实现：** 返回当前用户各维度用量（brand/query/check/content），limit=-1 表示无限制。

---

## Epic 3：AI 内容生成

### T3.1.1 创建 content 相关表

**文件：** `backend/app/models/content.py`（新建）

**实现：** SQLAlchemy 2.x 模型：generated_contents, content_distributions, brand_profiles。字段遵循 db-design.md Section 2.4-2.6。

---

### T3.2.1 content_generator service

**文件：** `backend/app/services/content_generator.py`（已有实现，需扩展）

**实现：**
- Prompt 组装：品牌资料 + 竞品数据 + 弱关键词 → 结构化 Prompt
- LLM 调用：通过 ai_gateway，timeout=120s
- 结构化输出：JSON 解析 → title, body, tags, distribution_guide
- 重试：JSON 解析失败重试 2 次
- 质量评分：实际字数 < 目标 × 0.8 标记低

---

### T3.2.2 engine 参数支持

**文件：** `backend/app/services/content_generator.py`, `backend/app/services/ai_gateway.py`

**实现：**
- engine 透传：mimo/deepseek/openai/qianwen
- fallback：选定引擎 → MIMO → 报错
- ai_gateway max_tokens 4000→8000

---

### T3.2.3 target_word_count 支持

**文件：** `backend/app/services/content_generator.py`

**实现：** prompt 追加字数要求。生成后统计字数，< 目标×0.8 标记 quality_score 低。

---

### T3.2.4 task_store + 异步任务框架

**文件：** `backend/app/task_store.py`（新建）

**实现：**
- 内存任务注册表：dict + Lock 存储 task_id → {status, content_id, created_at}
- 防重复提交：同 brand 有 generating 状态时拒绝
- 异步执行：threading.Thread(daemon=True)，自有 SessionLocal
- 预留 Celery 迁移接口：update_task() 抽象层

---

### T3.2.5 POST /api/content/generate

**文件：** `backend/app/routers/content.py`（修改）

**实现：**
1. subscription_gate 检查功能权限（Pro/Agency）
2. 检查同 brand 无 generating 行
3. 创建占位 content（status='generating', body=''）
4. 启动后台线程
5. 返回 202 + content_id
6. 前端轮询 GET /api/content/{id}

---

### T3.3.1-T3.3.2 内容管理

**文件：** `backend/app/routers/content.py`

**实现：**
- GET/PUT /api/content/{id}：详情 + 更新（仅 draft 可编辑）
- GET /api/content：游标分页（id cursor），筛选 brand_id/content_type/status

---

### T3.3.3 内容操作端点

**文件：** `backend/app/routers/content.py`（修改）

**实现：**
- POST /api/content/{id}/regenerate：复用 task_store + content_generator，支持段落重新生成（section_text 可选）。返回 202 + task_id。
- POST /api/content/{id}/confirm：状态 draft → ready，校验非 draft 返回 409。
- POST /api/content/{id}/publish：状态 ready → published，记录 published_at + target_platform + target_platform_url。

**依赖：** T3.2.4（task_store）、T3.3.1（content CRUD）

---

### T3.3.4 品牌 CRUD + 品牌资料端点

**文件：** `backend/app/routers/brands.py`（修改）

**实现：**
- GET /api/brands：用户品牌列表（offset 分页）
- POST /api/brands：创建品牌（name 必填），同时创建空 brand_profiles 记录
- PUT /api/brands/{id}：更新品牌基本信息（name, website）
- DELETE /api/brands/{id}：软删除品牌（is_deleted=true）
- PUT /api/brands/{id}/profile：更新品牌资料（brand_profiles 表 upsert，1:1 关系）

**注意：** 品牌基本信息和品牌资料分两张表存储（brands + brand_profiles），保存时需分别操作。

---

### T3.4.1 storage service

**文件：** `backend/app/services/storage.py`（新建）

**实现：** 抽象层 StorageBackend(ABC) → LocalStorage + OSSStorage。配置切换，启动校验连通性。OSS 失败 fallback 到本地。

---

### T3.4.2 thumbnail service

**文件：** `backend/app/services/thumbnail.py`（新建）

**实现：** Pillow 生成缩略图（宽度 300px，高度按比例）。

---

### T3.4.3 POST /api/upload/image

**文件：** `backend/app/routers/upload.py`（新建）

**实现：** 格式校验（JPG/PNG/WebP ≤10MB）+ 上传 + 缩略图 + 返回 {url, thumbnail_url, width, height}。

---

## Epic 4：采纳效果验证

### T4.1 创建 adoption_checks 表

**文件：** `backend/app/models/adoption.py`（新建）

**实现：** SQLAlchemy 2.x 模型。字段遵循 db-design.md Section 2.7。

---

### T4.2 adoption_verifier service

**文件：** `backend/app/services/adoption_verifier.py`（新建）

**实现：**
- 平台收录检测：Google site: 搜索
- AI 引擎引用检测：复用 ai_gateway + 模糊匹配（相似度 >0.7）
- 排名对比：发布前后可见度分数
- 多引擎交叉验证

---

### T4.3 定时检测任务

**文件：** `backend/app/scheduler.py`（修改）

**实现：** 每日扫描 published 内容，到达检测时间点（7/14/30 天）时触发。MVP 用 scheduling + threading。

---

### T4.4 GET /api/content/{id}/adoption

**文件：** `backend/app/routers/content.py`（修改）

**实现：** 返回 platform_indexing + ai_citations + ranking_delta + timeline。遵循 api-contract.md 响应 Schema。

---

## Epic 5：基础设施

### T5.1 执行 db-init.sql

**文件：** `backend/db-init.sql`（新建或修改）

**实现：** 完整 DDL 创建全部 8 张表 + 索引 + 种子数据。遵循 db-design.md。

---

### T5.2 Redis 缓存策略

**文件：** `backend/app/config.py`（修改）

**实现：**
- 用户计划缓存：Redis SET user:{id}:plan TTL 300s
- Webhook 时主动 DEL
- 用量计数：Redis INCR usage:{user_id}:{dimension}:{period}

---

### T5.3 环境变量配置

**文件：** `backend/.env.example`, `frontend/.env.local.example`（新建）

**实现：** STRIPE_KEY, STRIPE_WEBHOOK_SECRET, OSS_ACCESS_KEY, OSS_SECRET_KEY, OSS_BUCKET, REDIS_URL, DATABASE_URL 等。

---

### T5.4 旧路由重定向

**文件：** `frontend/next.config.js`

**实现：** 7 条 redirects，最具体到最通用排序（WBS-7）。:id 仅匹配数字/UUID（QA-7）。

---

### T5.5 官网抓取服务

**文件：** `backend/app/services/website_crawler.py`（新建）, `backend/app/routers/crawler.py`（新建）

**实现：** robots.txt 检查 + 页面抓取 + 信息提取。POST /api/crawler/analyze → 202 异步返回。

---

## Epic 6：测试保障

### T6.1 单元测试

**文件：** `backend/tests/unit/`（新建目录）

**实现：** billing, usage_tracker, content_generator, adoption_verifier 单元测试。pytest + pytest-asyncio。

---

### T6.2 API 集成测试

**文件：** `backend/tests/integration/`（新建目录）

**实现：** 全部 API 端点集成测试。httpx AsyncClient + pytest-asyncio。

---

### T6.3 旧路由重定向测试

**文件：** `frontend/__tests__/redirects.test.js`（新建）

**实现：** RD-1 至 RD-8 共 8 条测试用例。

---

### T6.4 组件交互测试

**文件：** `frontend/__tests__/components/`（新建目录）

**实现：** Drawer 动画、Sidebar 断点、汉堡按钮手动验证。

---

### T6.5 回归测试

**文件：** `frontend/__tests__/e2e/`（新建目录）

**实现：** 品牌 CRUD、内容生成→编辑→保存、数据分析全流程。

---

## 依赖关系

```
T1.1.1 → T1.1.2（tokens → globals.css）
T1.1 → T1.2（tokens → 组件）
T1.2.1 → T1.3.1（Button → Sidebar）
T1.2, T1.3 → T1.4（组件+布局 → 页面）
T1.4 → T1.5, T1.6, T1.7（页面 → TipTap/轮询/i18n/响应式）

T2.1.1 → T2.2.1 → T2.2.2（表 → billing → router）
T2.1.1 → T2.3.1 → T2.3.2（表 → usage_tracker → middleware）

T3.1.1 → T3.2.1 → T3.2.4 → T3.2.5（表 → generator → task_store → API）
T3.2.4, T3.3.1 → T3.3.3（task_store + CRUD → 操作端点）
T3.1.1 → T3.3.4（表 → brands CRUD）
T3.4.1 → T3.4.2 → T3.4.3（storage → thumbnail → API）

T4.1 → T4.2 → T4.3（表 → verifier → scheduler）
```

---

## 风险预警

| 任务 | 风险 | 应对 |
|------|------|------|
| T2.2.1 | Stripe Webhook 本地调试困难 | Stripe CLI 本地转发 |
| T3.2.1 | LLM JSON 截断 body 为空 | 重试 2 次 + fallback prompt |
| T3.4.1 | OSS 配置错误 | 启动校验 + fallback 本地 |
| T4.2 | AI 引擎引用误判 | 多引擎交叉验证 + 模糊匹配 |
| T1.2.3 | 快速开关 Drawer 动画竞态 | ARCH-8 cancelAnimationFrame |
| T5.4 | :id 匹配中文品牌名 | :id 仅匹配数字/UUID |
| T3.2.4 | threading 并发瓶颈 | MVP 够用，>1K 用户迁移 Celery |

---

# v3.0 技术实现方案（技术债清理 + Add-on）

> 衔接 WBS v3.0 任务与具体代码结构。基于 architect.md §8 + api-contract.md + db-design.md §6。

---

## Epic E-TS：TypeScript 迁移

### T-TS-01 Phase 1: types/ 迁移

**文件：** `frontend/src/types/*.ts`（新建）

**实现：** 根据现有 `services/api.js` 响应结构，创建以下类型定义文件：
- `types/api.ts` — 通用响应类型 `ApiResponse<T>`, `PaginatedResponse<T>`
- `types/brand.ts` — Brand, BrandQuery, BrandProfile 接口
- `types/content.ts` — GeneratedContent, ContentDistribution, QualityResult 接口
- `types/subscription.ts` — SubscriptionPlan, UserSubscription, UsageRecord 接口
- `types/addon.ts` — AddonPurchase, AddonType, AddonSummary 接口（v3.0 新增）
- `types/analysis.ts` — AnalysisRun, AnalysisResult, CompetitorComparison 接口

**关键实现：**
```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean
  data: T
  error: ApiError | null
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
```

**决策：** 使用 `interface` 而非 `type`（可扩展、可合并）。所有 API 响应类型集中管理，避免内联类型。

---

### T-TS-02 Phase 1: lib/ 迁移

**文件：** `frontend/src/lib/*.ts`

**实现：** 将 `lib/cn.js` → `lib/cn.ts`，`lib/constants.js` → `lib/constants.ts`。纯函数类型化，无复杂依赖。

---

### T-TS-03 Phase 1: services/ 迁移

**文件：** `frontend/src/services/api.ts`

**实现：** API 客户端类型化，所有请求/响应使用 types/ 中定义的接口：
```typescript
// services/api.ts
import type { ApiResponse } from '@/types/api'
import type { Brand } from '@/types/brand'

export const brandAPI = {
  getById: (id: number): Promise<ApiResponse<Brand>> => 
    api.get(`/brands/${id}`),
}
```

**风险：** axios 泛型类型需正确传递，`axios.create()` 的响应拦截器需保持类型安全。

---

### T-TS-05 Phase 2: components/ 迁移

**文件：** `frontend/src/components/*.tsx`

**实现：** 每个组件定义 Props 接口：
```typescript
// components/ContentEditor.tsx
interface ContentEditorProps {
  content: GeneratedContent
  onChange: (content: GeneratedContent) => void
  readOnly?: boolean
}
```

**关键决策：** 组件内部状态使用 `useState<T>` 显式标注类型，不依赖类型推断。

---

### T-TS-07~08 Phase 3: app/ 页面迁移

**文件：** `frontend/src/app/(app)/**/*.tsx`

**实现：** 页面组件通常无 Props（路由参数通过 hooks 获取），重点类型化：
- `useParams()` 返回值
- `useState()` 初始状态
- API 响应处理

**风险：** content/page.tsx 状态最多（15+ useState），需逐一类型化，工作量最大。

---

## Epic E-WC：中文分词 + 字数统计

### T-WC-01 安装 characterCount 扩展

**文件：** `frontend/package.json`, `frontend/src/components/ContentEditor.tsx`

**实现：**
```bash
npm install @tiptap/extension-character-count
```
```typescript
// ContentEditor.tsx
import CharacterCount from '@tiptap/extension-character-count'

const editor = useEditor({
  extensions: [
    StarterKit,
    Image.configure({ inline: false, allowBase64: true }),
    Typography,
    CharacterCount,
  ],
})
```

---

### T-WC-02 实现 lib/word-count.ts

**文件：** `frontend/src/lib/word-count.ts`（新建）

**实现：**
```typescript
// lib/word-count.ts
export function countChineseChars(text: string): number {
  const matches = text.match(/[一-鿿]/g)
  return matches ? matches.length : 0
}

export function countWords(text: string): number {
  const chinese = countChineseChars(text)
  // 移除中文字符后，按空格分词计算英文单词
  const withoutChinese = text.replace(/[一-鿿]/g, '')
  const englishWords = withoutChinese.trim().split(/\s+/).filter(Boolean).length
  return chinese + englishWords
}
```

**决策：** 使用正则 `/[一-鿿]/g` 匹配 CJK 统一汉字基本区，覆盖 99% 常用中文字符。不引入 jieba（前端轻量）。

---

### T-WC-04 后端引入 jieba

**文件：** `backend/requirements.txt`, `backend/app/main.py`

**实现：**
```python
# requirements.txt
jieba>=0.42.1

# main.py — startup 事件预加载
@app.on_event("startup")
async def preload_jieba():
    import jieba
    jieba.initialize()  # 后台预加载词典，避免首次请求延迟
```

**决策：** 使用 `jieba.initialize()` 在启动时预加载，避免首次请求 ~2s 延迟。

---

### T-WC-05 修改 quality_checker.py

**文件：** `backend/app/services/quality_checker.py`

**实现：** 替换 `_calculate_overlap()` 中的空格分割逻辑：
```python
import jieba

def _calculate_overlap(title1: str, title2: str) -> float:
    words1 = set(jieba.lcut(title1))
    words2 = set(jieba.lcut(title2))
    intersection = words1 & words2
    union = words1 | words2
    return len(intersection) / len(union) if union else 0.0
```

**风险：** jieba 分词结果可能与空格分割有差异，需验证现有去重逻辑无回归。

---

## Epic E-DU：拖拽/粘贴上传

### T-DU-01 TipTap 事件注册

**文件：** `frontend/src/components/ContentEditor.tsx`

**实现：** 在 TipTap EditorContent 上注册 drop/paste 事件：
```typescript
const handleDrop = useCallback((e: DragEvent) => {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}, [processFile])

const handlePaste = useCallback((e: ClipboardEvent) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) processFile(file)
      break
    }
  }
}, [processFile])
```

---

### T-DU-02 上传逻辑复用

**文件：** `frontend/src/components/ContentEditor.tsx`

**实现：** 提取 `processFile` 函数，复用现有 `contentAPI.uploadImage`：
```typescript
const processFile = useCallback(async (file: File) => {
  setUploading(true)
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await contentAPI.uploadImage(formData, setUploadProgress)
    editor?.chain().focus().setImage({ src: res.data.url }).run()
  } catch (err) {
    console.error('Upload failed:', err)
  } finally {
    setUploading(false)
  }
}, [editor])
```

**决策：** 复用现有上传 API，不新建端点。进度通过 XHR `upload.onprogress` 回调。

---

## Epic E-VS：虚拟滚动

### T-VS-02 封装 VirtualList 组件

**文件：** `frontend/src/components/VirtualList.tsx`（新建）

**实现：**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
  overscan?: number
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 80,
  overscan = 5,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    measureElement: (element) => element.getBoundingClientRect().height,
  })
  // ... 渲染逻辑
}
```

**决策：** 使用 `measureElement` 动态测量行高（内容列表行高不固定），预估行高 80px 作为初始值。

---

## Epic E-ADD：Add-on 购买流程

### T-ADD-01 AddonPurchase model

**文件：** `backend/app/models/addon_purchase.py`（新建）

**实现：**
```python
from sqlalchemy import Column, BigInteger, String, Integer, Numeric, ForeignKey, DateTime, UniqueConstraint, Index
from app.models.base import Base

class AddonPurchase(Base):
    __tablename__ = 'addon_purchases'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    addon_type = Column(String(32), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    amount = Column(Numeric(18, 4), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default='USD')
    stripe_session_id = Column(String(255), nullable=True)
    status = Column(String(16), nullable=False, default='pending')
    plan_period_start = Column(DateTime(timezone=True), nullable=False)
    plan_period_end = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default='now()')
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default='now()')
    created_by = Column(String(64), nullable=True)
    updated_by = Column(String(64), nullable=True)
    
    __table_args__ = (
        Index('idx_addon_user_status_expires', 'user_id', 'status', 'expires_at'),
        UniqueConstraint('user_id', 'addon_type', 'plan_period_start', name='uq_addon_user_type_period'),
    )
```

---

### T-ADD-03 POST addon/checkout API

**文件：** `backend/app/routers/subscription.py`（扩展）

**实现：**
```python
from pydantic import BaseModel, Field
from enum import Enum

class AddonType(str, Enum):
    brand_slot = 'brand_slot'
    query_pack = 'query_pack'
    content_pack = 'content_pack'

class AddonCheckoutRequest(BaseModel):
    addon_type: AddonType
    quantity: int = Field(ge=1, le=10)

@router.post('/addon/checkout')
async def create_addon_checkout(
    request: AddonCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 获取当前订阅周期
    subscription = await get_active_subscription(db, current_user.id)
    # 创建 Stripe Checkout Session（metadata 标记为 addon）
    session = await billing.create_addon_checkout_session(
        user=current_user,
        addon_type=request.addon_type,
        quantity=request.quantity,
        period_start=subscription.current_period_start,
        period_end=subscription.current_period_end,
    )
    return {'success': True, 'data': {'checkout_url': session.url, 'session_id': session.id}}
```

---

### T-ADD-05 Webhook 处理扩展

**文件：** `backend/app/services/billing.py`（扩展）

**实现：** 在现有 webhook handler 中增加 addon 类型判断：
```python
async def handle_webhook(event):
    if event.type == 'checkout.session.completed':
        session = event.data.object
        if session.metadata.get('type') == 'addon':
            await handle_addon_webhook(session)
        else:
            await handle_subscription_webhook(session)

async def handle_addon_webhook(session):
    addon_type = session.metadata['addon_type']
    quantity = int(session.metadata['quantity'])
    period_start = datetime.fromisoformat(session.metadata['period_start'])
    period_end = datetime.fromisoformat(session.metadata['period_end'])
    
    addon = AddonPurchase(
        user_id=int(session.metadata['user_id']),
        addon_type=addon_type,
        quantity=quantity,
        amount=session.amount_total / 100,
        currency=session.currency.upper(),
        stripe_session_id=session.id,
        status='active',
        plan_period_start=period_start,
        plan_period_end=period_end,
        expires_at=period_end,
    )
    db.add(addon)
    await db.commit()
    # 清除 Redis 配额缓存
    await redis.delete(f'quota:{session.metadata["user_id"]}')
```

**决策：** Stripe metadata 中存储 `type=addon` 标记，复用现有 webhook 端点，不新增路由。

---

### T-ADD-06 usage_tracker 修改

**文件：** `backend/app/services/usage_tracker.py`（扩展）

**实现：** 修改 `get_effective_limit()` 合并 Add-on 额度：
```python
async def get_effective_limit(user_id: int, dimension: str, db: AsyncSession) -> int:
    # 基础计划配额
    subscription = await get_active_subscription(db, user_id)
    plan = await get_plan(subscription.plan_code)
    base_limit = getattr(plan, f'{dimension}_limit', 0)
    
    # Add-on 额度
    addon_type_map = {
        'brand': 'brand_slot',
        'query': 'query_pack',
        'content': 'content_pack',
    }
    addon_type = addon_type_map.get(dimension)
    if addon_type:
        result = await db.execute(
            select(func.coalesce(func.sum(AddonPurchase.quantity), 0))
            .where(
                AddonPurchase.user_id == user_id,
                AddonPurchase.addon_type == addon_type,
                AddonPurchase.status == 'active',
                AddonPurchase.expires_at > datetime.utcnow(),
            )
        )
        addon_sum = result.scalar()
        return base_limit + addon_sum
    return base_limit
```

**风险：** SQL SUM 查询需确保索引命中（`(user_id, status, expires_at)` 索引已覆盖）。

---

## v3.0 任务依赖关系图

```
T-TS-01 → T-TS-02 → T-TS-03 → T-TS-04（Phase 1 验证）
                              ↓
                    T-TS-05 → T-TS-06（Phase 2 验证）
                              ↓
                    T-TS-07 → T-TS-08 → T-TS-09（Phase 3 验证）
                              ↓
                    T-TS-10（冒烟测试）

T-WC-04 → T-WC-05（后端 jieba，与 TS 并行）
T-TS-02 → T-WC-02 → T-WC-03（前端字数统计，依赖 lib/ 迁移）
T-TS-05 → T-WC-01（依赖组件迁移）

T-TS-05 → T-DU-01 → T-DU-02 → T-DU-03 → T-DU-04

T-TS-05 → T-VS-02 → T-VS-03 → T-VS-04 → T-VS-05

T-ADD-01 → T-ADD-02（Alembic）
T-ADD-01 → T-ADD-03 → T-ADD-05（Webhook）
T-ADD-01 → T-ADD-04
T-ADD-01 → T-ADD-06
T-ADD-01 → T-ADD-07 → T-ADD-08
T-TS-01 → T-ADD-09 → T-ADD-10 → T-ADD-11 → T-ADD-12
T-TS-05 → T-ADD-13
```

---

## v3.0 风险预警

| 任务 | 风险 | 应对 |
|------|------|------|
| T-TS-05 | 组件 props 接口定义工作量大 | 优先迁移核心组件（ContentEditor, FeatureGate），次要组件可简化 |
| T-TS-07 | content/page.tsx 状态复杂（15+ useState） | 逐个状态类型化，先完成高频使用状态 |
| T-WC-04 | jieba Docker 镜像体积增加 ~20MB | 使用 `jieba` 官方包，不引入 `jieba-fast`（功能不完整） |
| T-DU-01 | 浏览器 drop/paste 事件兼容性 | 使用标准事件，Chrome/Edge/Safari 均支持 |
| T-VS-02 | 动态行高测量导致列表跳动 | `measureElement` + `estimateSize` 80px 初始值 |
| T-ADD-05 | Stripe Webhook metadata 序列化限制 | metadata 值必须为字符串，数值需 `str()` 转换 |
| T-ADD-06 | SUM 查询在数据量大时性能 | 索引覆盖 + Redis 缓存（TTL 5min） |
