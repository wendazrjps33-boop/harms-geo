# WBS 任务分解 · GeoRank 商业化 MVP（v2.5）

---

## 1. 任务分解结构

### Epic 1：UI 重构（前端 P6a）

> 目标：完成 Modern SaaS 风格 UI 重设计，6 个页面 + 10 个共享组件 + 响应式 + i18n。

#### Story S1.1 设计系统基础

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T1.1.1 | 扩展 tailwind.config.js | 添加语义化颜色 token（brand/surface/success/warning/danger/muted）+ boxShadow | — | 0.5d |
| T1.1.2 | 扩展 globals.css | CSS 变量 + 基础组件 utility class（.btn/.card/.input/.badge） | T1.1.1 | 0.5d |
| T1.1.3 | 创建 cn.js | className merge 辅助函数 | — | 0.1d |

#### Story S1.2 共享 UI 组件

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T1.2.1 | Button 组件 | variant(primary/secondary/danger/ghost) + size + loading/disabled | T1.1 | 0.5d |
| T1.2.2 | Modal 组件 | 标准弹窗壳（title/body/footer），ESC 关闭 | T1.1 | 0.3d |
| T1.2.3 | Drawer 组件 | 侧边抽屉，translateX 动画 + loading 状态 + side 配置（ARCH-4）；验收标准：①ARCH-8 竞态保护（cancelAnimationFrame）②QA-9 关闭时 pointerEvents 禁用 ③side='right' 和 side='left' 均可正常工作 | T1.1 | 0.5d |
| T1.2.4 | Card 组件 | 内容卡片容器，hover 边框变化 | T1.1 | 0.2d |
| T1.2.5 | Badge 组件 | 状态标签（success/warning/danger/info/neutral） | T1.1 | 0.2d |
| T1.2.6 | Input + Select 组件 | 标准输入框/下拉选择，label + error 状态 | T1.1 | 0.3d |
| T1.2.7 | Skeleton + EmptyState + PageHeader | 加载占位/空状态/页面标题 | T1.1 | 0.3d |
| T1.2.8 | 更新 ui/index.js | barrel export 包含全部 10 个组件 | T1.2.1-T1.2.7 | 0.1d |

#### Story S1.3 共享布局

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T1.3.1 | 创建 Sidebar.js（Client Component） | 5 项导航 + 折叠按钮 + localStorage 持久化 + 移动端汉堡按钮（QA-5）；验收标准：①≥1024px 固定展开可折叠 ②768px-1023px 折叠为图标，hover 展开 ③<768px 隐藏，汉堡按钮触发 Drawer 覆盖层 ④汉堡按钮触摸区域 ≥44x44px | T1.2.1 | 1d |
| T1.3.2 | 创建 (app)/layout.js（Server Component） | AppShell 布局壳：Sidebar + main children（ARCH-1） | T1.3.1 | 0.3d |
| T1.3.3 | 修改根 layout.js | 移除 'use client'（ARCH-6），简化为仅 Providers | — | 0.2d |

#### Story S1.4 页面重设计

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T1.4.1 | Dashboard 页面 | 统计卡片网格 + 最近内容 + 快捷入口 + 新建内容 Modal（PM-9：Modal 含品牌 Select + 类型 Select + 字数 Input + 引擎 Select，确认后跳转编辑器） | T1.2, T1.3 | 1d |
| T1.4.2 | 品牌管理页面 | 卡片网格 + Drawer 编辑（表单分组 PM-7：分组 1 基本信息 + 分组 2 品牌资料，每组标题 12px 小写字标签 + 分隔线）+ EmptyState | T1.2, T1.3 | 1d |
| T1.4.3 | 内容中心页面 | 筛选栏 + 内容表格 + 新建内容 Modal | T1.2, T1.3 | 1d |
| T1.4.4 | 内容编辑页面 | 面包屑导航（PM-5）+ TipTap 编辑器 + 右栏 Tab（预览/分发指南/采用追踪）+ 移动端 accordion（UI-5）；采用追踪 Tab 展示：platform_indexing + ai_citations + ranking_delta + timeline | T1.2, T1.3, T1.5 | 1.5d |
| T1.4.5 | 数据分析页面 | Tab 导航（可见性/竞品/对比）+ 结果卡片 | T1.2, T1.3 | 1d |
| T1.4.6 | 订阅管理页面 | 定价卡片 + 用量进度条 + 当前计划高亮 | T1.2, T1.3 | 0.5d |

#### Story S1.5 TipTap 编辑器

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T1.5.1 | 引入 TipTap 依赖 | @tiptap/react + starter-kit + extension-image + extension-typography | — | 0.2d |
| T1.5.2 | TipTap 编辑器组件 | 工具栏（加粗/斜体/H2/H3/列表/引用/代码块/图片）+ 编辑区 + 字数统计 + Markdown 快捷键 | T1.5.1 | 1d |

#### Story S1.6 前端异步任务集成

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T1.6.1 | 内容生成轮询逻辑 | 2s 间隔轮询 GET /api/content/{id}，status !== 'generating' 时停止，连续 3 次网络错误放弃，120s 超时保护 | T1.4.3, T1.4.4 | 0.5d |
| T1.6.2 | Content Studio i18n | 约 50+ 硬编码中文字符串提取到翻译文件 | T1.4.3, T1.4.4 | 0.5d |

#### Story S1.7 响应式适配

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T1.7.1 | 三档响应式适配 | 375px / 768px / 1280px 布局验证 + 移动端堆叠 | T1.4 | 1d |

---

### Epic 2：订阅管理（后端 P6b）

> 目标：完成 Stripe 订阅支付 + 用量追踪 + 功能门控。

#### Story S2.1 订阅模型

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T2.1.1 | 创建 subscription 相关表 | subscription_plans + user_subscriptions + usage_records + team_members（DB Schema 共 4 张表） | DB Schema | 1d |
| T2.1.2 | 种子数据 | Free/Pro/Agency 三档计划配置写入 subscription_plans | T2.1.1 | 0.2d |
| T2.1.3 | users 表 ALTER | 新增 stripe_customer_id, default_plan_code 字段（brands 表不修改，品牌资料通过 brand_profiles 表 1:1 存储） | — | 0.3d |

#### Story S2.2 Stripe 集成

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T2.2.1 | billing service | Checkout Session 创建 + Webhook 处理（invoice.paid/subscription.updated/deleted）+ event_id 去重 | T2.1.1 | 2d |
| T2.2.2 | 订阅管理 router | GET /plans, GET /current, POST /checkout, POST /webhook, POST /cancel, POST /reactivate, POST /change-plan | T2.2.1 | 1d |
| T2.2.3 | 注册自动分配 Free 计划 | 新用户注册后自动创建 user_subscriptions 记录 | T2.1.1 | 0.5d |

#### Story S2.3 用量追踪

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T2.3.1 | usage_tracker service | Redis INCR 实时计数 + 配额检查 + 每日汇总写入 PostgreSQL | T2.1.1 | 1.5d |
| T2.3.2 | subscription_gate middleware | JWT 解析 → 计划查询 → 配额拦截 → 功能门控 | T2.3.1 | 1d |
| T2.3.3 | GET /api/usage/current | 返回当前用户各维度用量 | T2.3.1 | 0.3d |

---

### Epic 3：AI 内容生成（后端 P6b）

> 目标：完成内容生成引擎 + 内容管理 API + 图片上传。

#### Story S3.1 内容模型

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T3.1.1 | 创建 content 相关表 | generated_contents + content_distributions + brand_profiles（DB Schema 共 3 张表） | DB Schema | 0.5d |

#### Story S3.2 内容生成引擎

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T3.2.1 | content_generator service | Prompt 组装 + LLM 调用 + 结构化输出 + 重试机制（JSON 解析失败重试 2 次） | T3.1.1, ai_gateway | 2d |
| T3.2.2 | engine 参数支持 | MIMO/DeepSeek/OpenAI/通义千问选择 + fallback 策略（选定→MIMO→报错） | T3.2.1 | 0.5d |
| T3.2.3 | target_word_count 支持 | prompt 追加字数要求 + 质量评分（实际<目标×0.8 标记低） | T3.2.1 | 0.3d |
| T3.2.4 | task_store + 异步任务框架 | 内存任务注册表（生成状态跟踪、防重复提交）+ 异步执行（MVP 阶段使用 threading，预留 Celery 迁移接口） | T3.2.1 | 1d |
| T3.2.5 | POST /api/content/generate | 202 异步返回 + 后台任务生成 + 前端轮询（GET /api/content/{id}） | T3.2.4, T2.3.2 | 0.5d |

#### Story S3.3 内容管理

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T3.3.1 | GET/PUT /api/content/{id} | 内容详情 + 更新（标题/正文/状态） | T3.1.1 | 0.5d |
| T3.3.2 | GET /api/content | 内容列表 + 筛选（品牌/类型/状态）+ 分页 | T3.1.1 | 0.5d |
| T3.3.3 | 内容操作端点 | POST regenerate（段落/全文重新生成）+ confirm（draft→ready）+ publish（ready→published） | T3.2.4, T3.3.1 | 0.5d |
| T3.3.4 | 品牌 CRUD + 品牌资料端点 | GET/POST/PUT/DELETE /api/brands + PUT /api/brands/{id}/profile（brand_profiles upsert） | T3.1.1 | 0.5d |

#### Story S3.4 图片上传

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T3.4.1 | storage service | OSS（阿里云）+ 本地存储抽象层，配置切换，启动校验连通性 | — | 1d |
| T3.4.2 | thumbnail service | Pillow 生成缩略图（宽度 300px，高度按比例） | T3.4.1 | 0.3d |
| T3.4.3 | POST /api/upload/image | 格式校验（JPG/PNG/WebP ≤10MB）+ 上传 + 返回 {url, thumbnail_url, width, height} | T3.4.1, T3.4.2 | 0.5d |

---

### Epic 4：采纳效果验证（后端 P6b）

> 目标：完成平台收录 + AI 引用 + 排名变化的全链路检测。

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T4.1 | 创建 adoption_checks 表 | 采纳检测结果存储（DB Schema） | DB Schema | 0.3d |
| T4.2 | adoption_verifier service | 平台收录检测 + AI 引擎引用检测 + 排名对比 | T4.1, ai_gateway | 2d |
| T4.3 | 定时检测任务 | 发布后 7/14/30 天自动触发（MVP 阶段使用 scheduling + threading，预留 Celery 迁移接口） | T4.2 | 0.5d |
| T4.4 | GET /api/content/{id}/adoption | 单篇采纳数据 + 效果概览统计 | T4.1, T4.2 | 0.5d |

---

### Epic 5：基础设施

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T5.1 | 执行 db-init.sql | 创建全部新增表（subscription_plans + user_subscriptions + usage_records + team_members + generated_contents + content_distributions + brand_profiles + adoption_checks）+ 索引 + 种子数据 | — | 0.5d |
| T5.2 | Redis 缓存策略 | 用户计划缓存（TTL 5min）+ 用量实时计数 | T2.1.1 | 0.5d |
| T5.3 | 环境变量配置 | STRIPE_KEY, OSS_CONFIG, REDIS_URL, DATABASE_URL 等 | — | 0.3d |
| T5.4 | 旧路由重定向 | next.config.js 添加 7 条 301 重定向规则（WBS-5），按最具体到最通用排序（WBS-7）；:id 仅匹配数字或 UUID（QA-7） | T1.4 | 0.3d |
| T5.5 | 官网抓取服务 | website_crawler service：robots.txt 检查 + 页面抓取 + 信息提取（POST /api/crawler/analyze） | — | 1d |

---

### Epic 6：测试保障

> 目标：确保 MVP 质量，覆盖核心用户流程 + 旧路由重定向 + 组件交互。

| ID | 任务 | 目标 | 依赖 | 预估 |
|----|------|------|------|------|
| T6.1 | 单元测试 | 核心 service 单元测试：billing, usage_tracker, content_generator, adoption_verifier | T2.2, T3.2, T4.2 | 1d |
| T6.2 | API 集成测试 | 全部 API 端点集成测试：subscription CRUD, content generate/list/update, upload, adoption | T2.2, T3.3, T4.4 | 1d |
| T6.3 | 旧路由重定向测试 | 8 条测试用例（RD-1 至 RD-8）验证所有旧路由 301 跳转正确 + query param 保留 | T5.4 | 0.3d |
| T6.4 | 组件交互测试 | Drawer 动画（ARCH-4/ARCH-8/QA-9）、Sidebar 三档断点（lg/md/sm）、移动端汉堡按钮（QA-5）手动验证 | T1.3, T1.2.3 | 0.5d |
| T6.5 | 回归测试 | 旧页面功能在新路由下完整可用：品牌 CRUD、内容生成→编辑→保存、数据分析 | T1.4, T5.4 | 0.5d |

---

## 2. 关键依赖关系

```
Phase A 基础设施（T5.1, T5.2, T5.3）
  ↓
Phase B 后端核心 ──────────────────────────────────────────→
  T2.1 → T2.2 → T2.3（订阅+用量）                          |
  T3.1 → T3.2 → T3.3.1-T3.3.2（内容生成+CRUD）              |
                    T3.3.3（操作端点，依赖 T3.2.4+T3.3.1）   |
  T3.3.4（品牌 CRUD，依赖 T3.1）                             |
  T3.4（图片上传，独立）                                     |
  T4.1 → T4.2 → T4.3（采纳验证，独立）                      |
  T5.5（官网抓取，独立）                                     |
  ↓                                                          ↓
Phase C 前端 UI 重设计 ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  T1.1 → T1.2 → T1.3 → T1.4 → T1.5 → T1.6 → T1.7
  ↓
Phase D 前后端联调 + 测试
  T5.4（重定向）+ T1.6.2（i18n）+ T6.1-T6.5（测试）
```

**并行点：**
- P6a（前端）与 P6b（后端）可并行执行（需 API 契约先行）
- T3.2（内容生成引擎）与 T3.4（存储服务）可并行
- T4.2（采纳服务）与 T3.3（内容管理）可并行
- T5.5（官网抓取）独立，不阻塞其他任务

**架构决策说明（threading vs Celery）：**
架构师文档 Section 6 选择 Celery 异步任务方案，但 Section 7.3 数据流描述使用 threading。MVP 阶段采用 threading 方案（部署简单、无额外依赖），预留 Celery 迁移接口。用户量 >1K 时迁移至 Celery。

---

## 3. 里程碑

| 里程碑 | 交付物 | 预估 |
|--------|--------|------|
| M1 基础设施就绪 | DB 表创建 + Redis 缓存 + 环境配置 | Day 1 |
| M2 设计系统 + 布局壳 | tailwind tokens + 10 个 UI 组件 + Sidebar + (app)/layout | Day 3 |
| M3 订阅支付闭环 | Stripe Checkout + Webhook + 订阅管理页面 | Day 7 |
| M4 用量追踪闭环 | usage_tracker + middleware + Dashboard 增强 | Day 9 |
| M5 内容生成闭环 | content_generator + TipTap 编辑器 + 内容中心页面 | Day 14 |
| M6 图片上传 | storage service + TipTap 图片插入 | Day 15 |
| M7 采纳验证 | adoption_verifier + 定时任务 + 采用追踪 Tab | Day 17 |
| M8 响应式 + i18n + 重定向 | 三档适配 + 翻译补全 + 旧路由 301 | Day 19 |
| M9 测试保障 | 单元测试 + 集成测试 + 重定向测试 + 回归测试 | Day 21 |

---

## 4. 风险清单

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Stripe Webhook 本地调试困难 | 高 | 订阅功能延迟 | 使用 Stripe CLI 本地转发 Webhook |
| LLM 内容生成质量不稳定 | 高 | 用户体验差 | 多轮 Prompt 优化 + 质量评分 + 重试 2 次 |
| OSS 配置错误导致上传不可用 | 中 | 图片功能不可用 | 启动校验连通性 + fallback 到本地存储 |
| TipTap 与现有编辑器迁移冲突 | 中 | 内容编辑延迟 | 新数据存 HTML，旧 plain text 不迁移 |
| 旧路由重定向遗漏 | 低 | SEO/用户体验 | 8 条测试用例（RD-1 至 RD-8）覆盖所有旧路由 |
| 并行前后端接口不一致 | 中 | 联调返工 | P5a API 契约先行，前后端按契约开发 |
| threading 并发瓶颈 | 中 | 内容生成延迟 | MVP 够用，用户量 >1K 迁移 Celery |
| 测试覆盖不足导致线上缺陷 | 中 | 用户体验差 | Epic 6 测试保障，核心流程 100% 覆盖 |

---

## 5. 任务约束

- 单个任务 ≤ 1–3 人天
- 每个任务有可验证的交付物（代码文件 + 功能验证）
- P6a 前端与 P6b 后端并行执行（需 API 契约先行）
- 不使用"优化功能"等模糊任务名称
- 所有 UI 组件遵循设计系统 token，不硬编码颜色
- 架构决策（Celery vs threading）在 WBS 中显式标注，避免歧义

---

## 6. v3.0 WBS（技术债清理 + Add-on）

> 版本：v3.0 | 创建：2026-06-04

### Epic E-TS：TypeScript 迁移（前端 P6a）

> 目标：将全部 .js/.jsx 文件迁移为 .ts/.tsx，`strict: true`，零类型错误。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-TS-01 | Phase 1: types/ 迁移 | 创建 API 响应类型定义 | 现有 api.js 响应结构 | types/*.ts | — | 类型定义不完整 | 0.5d |
| T-TS-02 | Phase 1: lib/ 迁移 | 工具函数类型化 | 现有 lib/*.js | lib/*.ts | T-TS-01 | — | 0.5d |
| T-TS-03 | Phase 1: services/ 迁移 | API 客户端类型化 | 现有 services/api.js + types/ | services/*.ts | T-TS-01 | axios 类型适配 | 1d |
| T-TS-04 | Phase 1 验证 | `npm run build` 通过 | T-TS-01~03 | build 成功 | T-TS-03 | — | 0.5d |
| T-TS-05 | Phase 2: components/ 迁移 | 组件 props 类型化 | 现有 components/*.js + types/ | components/*.tsx | T-TS-04 | 组件 props 接口定义 | 2d |
| T-TS-06 | Phase 2 验证 | `npm run build` 通过 | T-TS-05 | build 成功 | T-TS-05 | — | 0.5d |
| T-TS-07 | Phase 3: app/ 页面迁移（高频） | content + brands 页面类型化 | T-TS-06 | app/(app)/content/*.tsx + brands/*.tsx | T-TS-06 | 页面状态类型复杂 | 1.5d |
| T-TS-08 | Phase 3: app/ 页面迁移（低频） | dashboard + analytics + subscription 类型化 | T-TS-06 | 其余页面 .tsx | T-TS-06 | — | 1.5d |
| T-TS-09 | Phase 3 验证 | `npm run build` 通过 | T-TS-07~08 | build 成功 | T-TS-08 | — | 0.5d |
| T-TS-10 | Phase 4: 冒烟测试 | 核心流程无回归 | T-TS-09 | 冒烟报告 | T-TS-09 | 运行时类型不匹配 | 1d |

**小计：10 个任务，10 天**

### Epic E-WC：中文分词 + 字数统计（前端 P6a + 后端 P6b）

> 目标：前端字数统计精确到中文字符，后端质量检测引入 jieba 分词。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-WC-01 | 安装 characterCount 扩展 | 替代 getText().length fallback | ContentEditor.js | 安装 @tiptap/extension-character-count + 配置 | T-TS-05（组件迁移后） | 扩展 API 变更 | 0.3d |
| T-WC-02 | 实现 lib/word-count.ts | 中文字符数 + 英文单词数 | 需求 §13.3.2 | word-count.ts + 单元测试 | T-TS-02 | 正则边界情况 | 0.5d |
| T-WC-03 | 集成字数统计到编辑器 | 编辑器头部显示字数 | T-WC-01 + T-WC-02 | ContentEditor.tsx 更新 | T-WC-02 | — | 0.3d |
| T-WC-04 | 后端引入 jieba | requirements.txt + 预加载 | 现有 requirements.txt | jieba>=0.42.1 + startup 预加载 | — | Docker 镜像体积 | 0.3d |
| T-WC-05 | 修改 quality_checker.py | 替换空格分割为 jieba 分词 | 现有 _calculate_overlap() | jieba.lcut() 替换 + 测试 | T-WC-04 | jieba 分词结果差异 | 0.5d |

**小计：5 个任务，2 天（与 TS 迁移并行）**

### Epic E-DU：拖拽/粘贴上传（前端 P6a）

> 目标：TipTap 编辑器支持拖拽和粘贴图片自动上传。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-DU-01 | TipTap 事件注册 | drop/paste 事件监听 | ContentEditor.tsx | handleDrop + handlePaste 实现 | T-TS-05（组件迁移后） | 浏览器兼容性 | 0.5d |
| T-DU-02 | 上传逻辑复用 | 复用 contentAPI.uploadImage | T-DU-01 | processFile 函数提取 | T-DU-01 | — | 0.3d |
| T-DU-03 | 内联进度条 | 上传中显示进度 | T-DU-02 | 进度条组件 | T-DU-02 | XHR 进度事件 | 0.5d |
| T-DU-04 | 图片插入编辑器 | 上传完成后插入 img 标签 | T-DU-03 | editor.chain().focus().setImage() | T-DU-03 | TipTap Image 扩展配置 | 0.3d |

**小计：4 个任务，2 天（依赖 TS Phase 3 完成）**

### Epic E-VS：虚拟滚动（前端 P6a）

> 目标：内容列表和品牌列表支持虚拟滚动，100+ 条数据首屏 <100ms。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-VS-01 | 安装 @tanstack/react-virtual | 添加依赖 | package.json | 安装完成 | — | — | 0.1d |
| T-VS-02 | 封装 VirtualList 组件 | 通用虚拟滚动组件 | T-VS-01 | components/VirtualList.tsx | T-TS-05 + T-VS-01 | 动态行高测量 | 1d |
| T-VS-03 | 内容列表集成 | /content 页面虚拟滚动 | T-VS-02 | content/page.tsx 更新 | T-VS-02 + T-TS-07 | 行高不固定 | 0.5d |
| T-VS-04 | 品牌列表集成 | /brands 页面虚拟滚动 | T-VS-02 | brands/page.tsx 更新 | T-VS-02 + T-TS-07 | — | 0.3d |
| T-VS-05 | 性能验证 | 100+ 条数据首屏 <100ms | T-VS-03~04 | 性能测试报告 | T-VS-04 | — | 0.3d |

**小计：5 个任务，2 天（依赖 TS Phase 3 完成）**

### Epic E-ADD：Add-on 购买流程（后端 P6b + 前端 P6a）

> 目标：用户可购买额外品牌位、查询词包、内容生成包，配额自动合并。

#### 后端任务

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-ADD-01 | AddonPurchase model | 创建 SQLAlchemy model | db-design.md §6.1 | models/addon_purchase.py | — | — | 0.3d |
| T-ADD-02 | Alembic 迁移脚本 | 创建 addon_purchases 表 | T-ADD-01 | alembic/versions/xxx_add_addon_purchases.py | T-ADD-01 | — | 0.2d |
| T-ADD-03 | POST addon/checkout API | 创建 Stripe Checkout Session | T-ADD-01 + billing.py | routers/subscription.py 扩展 | T-ADD-01 | Stripe metadata 配置 | 0.5d |
| T-ADD-04 | GET addons API | 查询用户已购 Add-on 列表 | T-ADD-01 | routers/subscription.py 扩展 | T-ADD-01 | — | 0.3d |
| T-ADD-05 | Webhook 处理扩展 | 处理 Add-on 支付事件 | T-ADD-01 + billing.py | billing.py 扩展 | T-ADD-01 | Webhook 幂等性 | 0.5d |
| T-ADD-06 | usage_tracker 修改 | 合并 Add-on 额度到配额 | T-ADD-01 | usage_tracker.py 扩展 | T-ADD-01 | SQL SUM 查询性能 | 0.5d |
| T-ADD-07 | 过期定时任务 | 每日标记过期 Add-on | T-ADD-01 | 定时任务 + scheduler.py | T-ADD-01 | — | 0.3d |
| T-ADD-08 | 后端单元测试 | 覆盖 Add-on 全流程 | T-ADD-03~07 | test_addon.py | T-ADD-07 | — | 0.5d |

**后端小计：8 个任务，3 天（可与 TS 迁移并行）**

#### 前端任务

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-ADD-09 | types/addon.ts | Add-on 前端类型定义 | api-contract.md | types/addon.ts | T-TS-01 | — | 0.2d |
| T-ADD-10 | API 客户端扩展 | addon checkout + list API | T-ADD-09 | services/api.ts 扩展 | T-ADD-09 + T-TS-03 | — | 0.3d |
| T-ADD-11 | AddonCard 组件 | Add-on 卡片展示 | T-ADD-09 | components/AddonCard.tsx | T-TS-05 | UI 设计细节 | 0.5d |
| T-ADD-12 | 加购 Tab 页面 | 订阅管理页新增加购 Tab | T-ADD-11 | subscription/page.tsx 扩展 | T-ADD-11 + T-TS-08 | — | 0.5d |
| T-ADD-13 | 仪表盘分段进度条 | 基础配额 + Add-on 配额分段展示 | T-ADD-09 | UsageOverview 组件扩展 | T-TS-05 + T-ADD-06 | 进度条样式 | 0.5d |
| T-ADD-14 | 前端集成测试 | 购买流程 + 配额展示验证 | T-ADD-10~13 | 测试报告 | T-ADD-13 | — | 0.5d |

**前端小计：6 个任务，3 天（依赖 TS Phase 3 完成）**

**Epic 小计：14 个任务，6 天（后端 3 天可与 TS 并行，前端 3 天依赖 TS Phase 3）**

---

## 7. v3.0 里程碑与时间线

```
Week 1-2:  TS 迁移 Phase 1-2 (T-TS-01~06) + 后端 Add-on (T-ADD-01~08) + jieba (T-WC-04~05)
           ─────────────────────────────────────────────────────────────────────────────────
           前端专注 TS 迁移                    后端并行开发 Add-on + jieba

Week 3:    TS 迁移 Phase 3 (T-TS-07~09)
           ─────────────────────────────────
           高频页面迁移（content + brands）
           低频页面迁移（dashboard + analytics + subscription）

Week 4:    前端功能开发（依赖 TS Phase 3 完成）
           ─────────────────────────────────────
           拖拽上传 (T-DU-01~04) + 虚拟滚动 (T-VS-01~05)
           字数统计 (T-WC-01~03) + Add-on 前端 (T-ADD-09~14)

Week 5:    验证与回归测试 (T-TS-10) + 性能验证 (T-VS-05)
           ─────────────────────────────────────────────
           冒烟测试 + 性能测试 + Bug 修复
```

**总预估：20 个工作日（4 周）**

| 周次 | 前端工程师 | Python 工程师 |
|------|-----------|--------------|
| Week 1 | TS Phase 1 (types/lib/services) | Add-on model + API + Webhook + jieba |
| Week 2 | TS Phase 2 (components) | usage_tracker + 过期任务 + 测试 |
| Week 3 | TS Phase 3 (页面层) | — |
| Week 4 | 拖拽上传 + 虚拟滚动 + 字数统计 + Add-on 前端 | Bug 修复 + 支持 |
| Week 5 | 冒烟测试 + 性能验证 | Bug 修复 + 支持 |

---

## 8. v3.0 风险清单

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| TS 迁移引入运行时 Bug | 中 | 功能异常 | 分阶段迁移 + 每阶段冒烟测试 + 保留 JS fallback |
| jieba 首次加载慢 (~2s) | 中 | 首次请求延迟 | FastAPI startup 事件后台预加载 |
| Add-on 与订阅周期不同步 | 低 | 配额计算错误 | Webhook 从 Stripe 获取当前周期时间 |
| 虚拟滚动动态行高跳动 | 中 | 列表体验差 | measureElement 动态测量 + 预估行高 80px |
| Add-on 过期后用户仍在使用 | 低 | 配额溢出 | 过期检查 + 阻止新增（保留数据） |
| TS 迁移工作量超预期 | 中 | 迭代延期 | 优先迁移高频页面，低频页面可延后 |
