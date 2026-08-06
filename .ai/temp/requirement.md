# 需求文档 · GeoRank 商业化 MVP
> 版本：v2.6 | 更新：2026-06-01 | 变更：添加项目进度状态（§12），更新优先级标记（§8），更新验收标准状态（§5）

## 1. MVP 摘要

将 GeoRank 从被动监控工具升级为**监控 → 生成 → 分发 → 验证**的完整 GEO 优化平台。MVP 交付两大核心能力：①Freemium 订阅体系（三档计划 + Stripe 支付 + 用量计费）；②AI 内容生成与分发引擎（基于品牌可见度分析结果，自动生成适配多平台的 SEO/GEO 优化内容，并分发至 AI 引擎高权重来源平台）。不包含：全自动发布（需人工审核确认）、企业级定制、白标、API 开放平台。

---

## 2. 市场分析与盈利模式推荐

### 2.1 竞品定价参考

| 竞品 | 定价模式 | 价格区间 | 核心限制维度 |
|------|----------|----------|-------------|
| Otterly.ai | 订阅分层 | $29-99/月 | 查询数、引擎数、品牌数 |
| Profound | 企业定制 | 联系销售 | 全功能、专属支持 |
| AthenaHQ | Freemium | 免费起，付费升级 | 追踪查询/品牌数量 |

### 2.2 推荐盈利模式：Freemium + 订阅分层 + 用量加购

**理由：**
- GEO 市场处于早期教育阶段，Freemium 降低获客门槛
- 品牌方和代理商需求差异大，分层覆盖两个客群
- 用量加购（Add-on）捕获超出套餐的弹性需求，避免收入天花板

**三档定价设计：**

| 维度 | Free | Pro ($49/月) | Agency ($199/月) |
|------|------|-------------|-----------------|
| 品牌数 | 1 | 5 | 25 |
| 查询词/品牌 | 5 | 20 | 50 |
| AI 引擎 | 2（任选） | 全部 6 个 | 全部 6 个 |
| 检查频率 | 手动触发 | 每日自动 | 每 4 小时自动 |
| 历史数据 | 7 天 | 90 天 | 365 天 |
| 竞品分析 | 不可用 | 3 个竞品/品牌 | 10 个竞品/品牌 |
| 统计分析 | 不可用 | 基础 | 高级 + 趋势对比 |
| **AI 内容生成** | 不可用 | **10 篇/月** | **50 篇/月** |
| **内容分发平台** | — | Reddit/Quora/Medium/知乎 | 全平台 + 结构化数据 |
| **内容审核模式** | — | AI 生成 + 人工确认 | AI 生成 + 人工确认 + 批量审核 |
| PDF 报告 | 水印版 | 无水印 | 白标（代理商 Logo） |
| CSV 导出 | 可用 | 可用 | 可用 |
| 多用户 | 1 人 | 1 人 | 5 人（团队管理） |
| API 接入 | 不可用 | 不可用 | REST API（只读） |
| 邮件支持 | 社区 | 48h 响应 | 优先支持 |

**加购项：**
- 额外品牌位：$10/品牌/月
- 额外查询词包（50 个）：$15/月
- 报告生成次数包（100 次）：$20/月
- **额外内容生成包（20 篇）：$15/月**
- **高级分发渠道包（PR 新闻稿 + Schema.org）：$25/月**

---

## 3. 用户角色

| 角色 | 核心目标 | 使用频率 | 专业程度 |
|------|----------|----------|----------|
| 品牌运营（Free） | 了解品牌在 AI 搜索中的基础表现 | 每周 1-2 次 | 初级，SEO 基础 |
| 品牌营销经理（Pro） | 持续监控、竞品对比、优化策略 | 每日 | 中级，数字营销经验 |
| 代理商客户经理（Agency） | 多品牌管理、客户报告、团队协作 | 每日 | 高级，服务多个客户 |
| 系统管理员 | 管理团队成员、计费、权限 | 每周 | 中级 |

---

## 4. 用户故事

### 4.1 订阅与计费

**US-01** 作为品牌运营，我希望注册后直接使用 Free 计划，以便零成本体验产品价值。
**US-02** 作为品牌营销经理，我希望在线升级到 Pro 计划并完成支付，以便解锁更多引擎和竞品分析功能。
**US-03** 作为代理商客户经理，我希望选择 Agency 计划并管理团队成员，以便多人协作管理客户品牌。
**US-04** 作为任何付费用户，我希望查看账单历史和下载发票，以便财务报销。
**US-05** 作为付费用户，我希望随时降级或取消订阅，以便灵活控制支出。

### 4.2 用量追踪与限制

**US-06** 作为用户，我希望在仪表盘看到当前计划的用量概览（品牌数/查询词/检查次数），以便了解剩余配额。
**US-07** 作为 Free 用户，当我尝试添加超出限制的品牌时，系统应提示升级而非静默失败。
**US-08** 作为 Pro 用户，当月检查次数即将耗尽时，我希望收到邮件提醒，以便决定是否加购。

### 4.3 功能门控

**US-09** 作为 Free 用户，我希望在界面上看到 Pro/Agency 功能的存在（标记为"升级解锁"），以便了解付费能获得什么。
**US-10** 作为 Free 用户，当我尝试使用竞品分析时，系统应展示功能预览并引导升级。

### 4.4 AI 内容生成

**US-11** 作为品牌营销经理，我希望基于品牌可见度分析结果一键生成优化内容，以便主动提升品牌在 AI 搜索中的被引用率。
**US-12** 作为品牌营销经理，我希望为每个品牌生成多平台适配的内容（Reddit 帖子、Quora 回答、Medium 文章、FAQ 结构化数据），以便覆盖 AI 引擎的主要内容来源。
**US-13** 作为品牌营销经理，我希望在发布前预览和编辑 AI 生成的内容，以便确保品牌调性和事实准确性。
**US-14** 作为代理商客户经理，我希望批量生成多个品牌的内容并统一审核，以便高效服务多个客户。
**US-15** 作为用户，我希望查看已发布内容的采纳效果（哪些 AI 引擎开始引用这些内容），以便验证内容分发的投资回报。

### 4.5 内容分发

**US-16** 作为品牌营销经理，我希望系统为每篇生成内容提供分发指南（目标平台、发布步骤、最佳发布时间），以便手动高效完成分发。
**US-17** 作为品牌营销经理，我希望一键复制已适配平台格式的内容（Markdown/HTML/纯文本），以便直接粘贴到目标平台发布。
**US-18** 作为用户，我希望系统追踪每篇内容的分发状态（待发布/已发布/已验证），以便管理内容发布进度。

### 4.6 报告与导出

**US-19** 作为代理商用户，我希望在 PDF 报告中使用自己的 Logo 和品牌色，以便向客户交付专业报告。
**US-20** 作为付费用户，我希望通过 API 获取品牌可见度数据，以便集成到内部 BI 系统。

---

## 5. 验收标准

### US-01 注册即用 Free 计划 — ✅ 已完成
- [x] 新用户注册后自动分配 Free 计划，无需手动选择
- [x] Free 计划限制在仪表盘清晰展示
- [ ] 首次登录引导用户添加第一个品牌（未实现引导流程）

### US-02 升级到 Pro — ✅ 已完成
- [x] 用户可在"订阅管理"页面查看三档计划对比表
- [x] 点击"升级"后跳转 Stripe Checkout 完成支付
- [x] 支付成功后 5 秒内权限生效，新功能立即可用
- [ ] 支持信用卡和支付宝（Stripe）（支付宝未确认）

### US-06 用量仪表盘 — ✅ 已完成
- [x] 仪表盘顶部显示：当前计划名称、品牌用量（已用/上限）、查询词用量、本月检查次数
- [x] 用量达到 80% 时显示黄色警告，达到 100% 时显示红色提示
- [x] 用量数据实时更新，误差 ≤5 分钟

### US-07 超限拦截 — ✅ 已完成
- [x] 添加品牌超出限制时弹出升级引导弹窗，而非报错
- [x] 弹窗展示当前计划限制和推荐计划
- [x] 已有数据不受影响，仅阻止新增操作

### US-09 功能门控 UI — ✅ 已完成
- [x] Free 用户可见竞品分析菜单项，带"Pro"标签
- [x] 点击后展示功能预览（截图/说明）+ 升级按钮
- [x] 不展示为 403 或空白页面

### US-11 基于分析结果生成内容 — ✅ 已完成
- [x] 品牌详情页新增"生成内容"入口，仅当可见度分析完成后可用
- [x] 点击后展示可选内容类型：Reddit 帖子、Quora 回答、Medium 长文、FAQ Schema、行业文章
- [x] 每种类型展示预估字数和目标平台说明
- [x] 生成结果包含：标题、正文、标签/关键词、分发指南
- [x] 生成耗时 ≤30 秒（含 LLM 调用）

### US-12 多平台内容适配 — ✅ 已完成
- [x] 同一品牌分析结果可同时生成 5 种平台格式的内容
- [x] Reddit 格式：标题 ≤300 字符，正文含自然语言讨论，不硬广
- [x] Quora 格式：以问答形式组织，首段直接回答，后续展开论证
- [x] Medium 格式：长文 800-1500 字，含小标题、数据引用、结论
- [x] FAQ Schema：JSON-LD 格式，3-5 组问答，可直接嵌入网站
- [x] 行业文章：基于品牌所在行业生成专业分析文，品牌自然植入

### US-13 内容预览与编辑 — ✅ 已完成
- [x] 生成后进入编辑模式，支持富文本编辑（标题/加粗/链接/列表）
- [x] 实时字数统计
- [x] 可标记"需要修改"的部分并附加修改指令，AI 重新生成该段落
- [ ] 编辑后可一键切换查看其他平台格式的同一内容（未实现多格式切换）
- [x] 确认发布前展示最终版本预览

### US-15 采纳效果追踪 — ✅ 已完成
- [x] 内容发布后 7/14/30 天自动检查目标 AI 引擎是否开始引用
- [x] 采纳指标：被引用次数、引用位置、引用准确度
- [x] 采纳效果与发布前基线对比，展示提升幅度
- [x] 效果数据在内容管理列表中可视化展示

### US-19 白标报告 — ⬜ 未开始
- [ ] Agency 用户可在设置中上传 Logo（PNG/SVG，≤2MB）
- [ ] PDF 报告页眉显示代理商 Logo 替换 GeoRank Logo
- [ ] 报告中不出现 GeoRank 品牌标识

---

## 6. 功能需求

### 6.1 订阅管理模块
- 计划定义表：plan_code, name, price_monthly, price_yearly, brand_limit, query_limit, engine_limit, check_interval_hours, history_days, competitor_limit, team_members, api_access, white_label, report_watermark
- 用户订阅表：user_id, plan_code, status(trialing/active/canceled/past_due), current_period_start, current_period_end, cancel_at_period_end
- 年付折扣：8 折（等效 2 个月免费）

### 6.2 支付集成
- Stripe Checkout Session 创建（订阅模式）
- Stripe Webhook 处理：invoice.paid, customer.subscription.updated, customer.subscription.deleted
- 支付失败重试：3 次，间隔 1/3/7 天，之后降级为 Free
- 发票生成与下载（Stripe Invoice API）

### 6.3 用量追踪服务
- 计量维度：active_brands, active_queries, monthly_checks, monthly_reports
- 每次操作前检查配额（middleware 层拦截）
- 用量统计定时任务：每日汇总写入 usage_records 表
- 用量 API：GET /api/usage/current

### 6.4 功能门控中间件
- 基于 plan_code 的功能权限矩阵
- API 层：依赖注入检查 plan.features
- 前端：基于用户计划的条件渲染组件 FeatureGate

### 6.5 团队管理（Agency）
- 团队邀请：邮件邀请 + 邀请码
- 角色：owner, admin, member（只读）
- 成员管理：添加/移除/角色变更

### 6.6 API 接入（Agency）
- API Key 管理：创建/吊销/轮换
- Rate Limit：100 req/min
- 只读端点：GET /api/v1/brands, GET /api/v1/reports, GET /api/v1/analysis

### 6.7 AI 内容生成引擎

**6.7.1 输入数据采集**
- 用户品牌资料：品牌名称、官网、产品/服务描述、核心卖点、目标受众（用户手动输入）
- 分析结果关联：自动拉取最近一次可见度分析中排名低的关键词（mention_rate < 30%）和竞品差距数据
- 可选官网抓取：用户授权 URL 后，爬取首页 + 关于页 + 产品页，提取品牌描述、产品特性、团队信息（需 robots.txt 合规检查）

**6.7.2 内容生成类型**
| 类型 | 输出格式 | 字数范围 | 适用平台 |
|------|----------|----------|----------|
| FAQ/Schema.org | JSON-LD + 人类可读文本 | 每组问答 50-150 字 | 品牌官网、独立站 |
| 社区问答帖 | Markdown（Reddit/Quora 适配） | 300-800 字 | Reddit、Quora、贴吧 |
| 深度行业文章 | Markdown/HTML | 800-1500 字 | Medium、知乎、公众号 |
| 新闻稿/PR | 新闻稿格式（倒金字塔结构） | 500-1000 字 | PR Newswire、美通社、企业官网 |

**6.7.3 生成流程**
1. 用户选择品牌 + 内容类型 → 系统组装 Prompt（品牌资料 + 分析数据 + 平台规范）
2. 调用 LLM 生成初稿（使用现有 6 引擎中已接入的 LLM）
3. 结构化输出：标题、正文、标签/关键词、分发指南（目标平台 + 发布步骤 + 最佳时间）
4. 用户编辑 → 可标记段落附修改指令 → AI 局部重新生成
5. 确认后进入"待分发"状态

**6.7.4 质量控制**
- 事实校验：自动比对品牌资料，确保生成内容中的品牌名/产品名/URL 准确
- 去重检查：与历史生成内容比对，避免重复内容
- 平台合规：每种类型内置平台内容规范检查（如 Reddit 禁硬广、Quora 需真实回答）

### 6.8 内容分发

**6.8.1 分发指南生成**
- 每篇内容附带分发指南：目标平台列表、发布步骤（图文指引）、最佳发布时间（基于平台活跃时段）
- 一键复制：提供 Markdown/HTML/纯文本 三种格式的复制按钮

**6.8.2 分发状态管理**
- 状态机：draft（草稿）→ ready（待分发）→ distributing（分发中）→ published（已发布）→ verified（已验证）
- 用户手动标记状态变更（MVP 阶段，无自动发布）
- 每篇内容记录：创建时间、确认时间、标记发布时间、目标平台 URL

### 6.9 采纳效果验证（全链路追踪）

**6.9.1 平台收录检测**
- 目标：检测已发布内容是否被目标平台收录（如 Google site:reddit.com "品牌关键词"）
- 检测频率：发布后第 3/7/14/30 天
- 结果存储：platform_url, indexed(bool), indexed_at, search_rank

**6.9.2 AI 引擎引用检测**
- 复用现有 6 引擎查询架构，增加"内容溯源"查询模式
- 查询策略：使用品牌关键词 + 内容核心短语作为查询词
- 检测指标：被引用次数、引用位置（第几条回复）、引用准确度（引用内容与原文匹配度）
- 检测频率：发布后第 7/14/30 天

**6.9.3 排名变化对比**
- 基线：内容发布前的品牌可见度分数
- 对比：发布后 7/14/30 天的可见度分数变化
- 归因分析：将分数变化与已发布内容关联（时间窗口匹配）

**6.9.4 效果仪表盘**
- 概览：总发布数、已采纳数、采纳率、平均排名提升
- 单篇详情：平台收录状态、AI 引擎引用详情、排名变化曲线
- 品牌维度：所有内容的整体效果汇总

---

## 7. 非功能需求

| 维度 | 指标 |
|------|------|
| 支付成功率 | ≥99%（Stripe 基础设施保障） |
| 权限变更延迟 | 支付成功后 ≤5 秒生效 |
| 用量统计延迟 | ≤5 分钟（与实际操作的偏差） |
| API Rate Limit | Agency: 100 req/min, 响应时间 <200ms (p95) |
| 并发支付 | 支持 50+ 同时支付会话 |
| 数据安全 | Stripe PCI-DSS L1 合规，不存储卡号 |
| 可用性 | 订阅服务 99.9% uptime |
| 可扩展性 | 计划配置可动态调整，无需重新部署 |
| 内容生成延迟 | 单篇 ≤30 秒（含 LLM 调用） |
| 内容生成并发 | 支持 10+ 同时生成任务 |
| 采纳检测延迟 | 平台收录检测 ≤60 秒/篇，AI 引擎引用检测 ≤120 秒/品牌 |
| 内容存储 | 每用户 ≤500 篇历史内容，超限自动归档 |

---

## 8. 优先级与 MVP 范围

### P0（MVP 必须）— ✅ 全部完成
- ✅ 三档计划定义与展示
- ✅ Stripe 订阅支付（月付/年付）
- ✅ 用量追踪与配额限制
- ✅ 功能门控中间件
- ✅ 用量仪表盘组件
- ✅ 超限升级引导
- ✅ **AI 内容生成引擎**（FAQ/Schema.org + 社区问答帖 + 行业文章 + 新闻稿）
- ✅ **内容编辑器**（预览、编辑、局部重新生成）
- ✅ **分发指南与一键复制**
- ✅ **分发状态管理**

### P1（MVP 后首批）— 3/8 完成
- ⬜ 团队管理（Agency 多用户）— model 存在，无前端 UI
- ⬜ 白标 PDF 报告 — 未实现
- ⬜ API Key 管理与只读 API — 未实现
- ⬜ 邮件通知（用量警告、支付失败、订阅变更）— 未实现
- ⬜ 账单历史与发票下载 — 未实现
- ✅ **采纳效果验证**（平台收录检测 + AI 引擎引用检测 + 排名变化对比）
- ✅ **效果仪表盘**
- ✅ **官网可选抓取**（品牌资料补充）

### P2（后续迭代）— 0/8 完成
- 按量加购（Add-on）购买流程
- 推荐返佣计划
- 企业级定制计划（联系销售）
- Webhook 事件推送
- 多币种支持
- 半自动分发（平台 API 对接：Reddit/Medium/知乎 OAuth 发布）
- 内容模板市场（行业模板库）
- AI 内容 SEO 评分（发布前预估被采纳概率）

---

## 9. 待解决问题与风险

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 1 | Stripe 在中国的可用性？支付宝/微信支付接入？ | 支付成功率 | 调研 Stripe 中国（Alipay+WeChat Pay）或备选：Paddle / LemonSqueezy |
| 2 | 现有 6 个 AI 引擎的 API 成本结构？ | 定价合理性 | 盘点各引擎单次查询成本，确保毛利率 ≥70% |
| 3 | Free 用户是否保留现有功能？ | 用户迁移 | 建议现有用户 grandfathering，新用户按新计划执行 |
| 4 | 检查频率提升后的基础设施成本？ | 运营成本 | Pro 每日、Agency 每 4 小时，需评估服务器/API 成本增量 |
| 5 | 是否需要试用期？ | 转化率 | 建议 Pro 计划 14 天免费试用，无需绑卡 |
| 6 | 竞品数据是否受法律限制？ | 合规风险 | 竞品分析仅聚合公开数据，不含爬虫行为，需法务确认 |
| 7 | AI 生成内容的版权归属？ | 法律风险 | 用户确认内容归其所有，平台保留使用权；需在用户协议中明确 |
| 8 | 生成内容被平台判定为垃圾/spam？ | 用户体验 | 内置平台合规检查、生成质量评分、建议人工审核后再发布 |
| 9 | 爬虫检测频率带来的 AI 引擎 API 成本？ | 运营成本 | 采纳检测复用现有引擎，但频率增加需评估增量成本；建议按需触发而非全量轮询 |
| 10 | 官网抓取的 robots.txt 合规？ | 法律风险 | 抓取前检查 robots.txt，仅抓取允许的页面；用户需确认授权 |

---

## 附录：定价依据

### 成本估算（单品牌/月，按 20 查询词 × 6 引擎 × 30 天计算）

| 成本项 | 单价 | 月成本 |
|--------|------|--------|
| AI 引擎查询（6 引擎 × 20 词 × 30 天） | ~$0.002-0.01/次 | $7.2-36 |
| 服务器（分摊） | — | ~$2 |
| Redis 缓存 | — | ~$1 |
| **单品牌月成本** | — | **$10-39** |

Pro 计划 $49/月，5 品牌上限，实际使用 2-3 品牌时毛利率 60-80%，定价合理。

### 内容生成成本估算（单篇）

| 成本项 | 单价 | 备注 |
|--------|------|------|
| LLM 生成（GPT-4/Claude 级） | ~$0.02-0.05/篇 | 含 Prompt + 输出 |
| 采纳检测（6 引擎 × 3 次） | ~$0.03-0.06/篇 | 复用现有引擎查询 |
| 平台收录检测 | ~$0.01/篇 | Google Search API |
| **单篇总成本** | **~$0.06-0.12** | |

Pro 计划含 10 篇/月，内容生成成本 ~$0.6-1.2/月，对毛利影响 <3%。

---

## 10. 内容生成优化需求（v1.1 追加）

### 10.1 问题描述

**Bug：AI 生成内容 body 为空**

截图确认（img/1.png）：标题已生成（"小米集团发布最新智能生态产品，引领科技生活新体验"），但正文区域显示"输入内容..."占位符，字数为 0。

**根因定位：**
1. `content_generator.py:260-272` — `_parse_llm_output()` 从 LLM 返回文本中提取 JSON，但 DeepSeek 返回的 JSON 中 `body` 字段可能为空或截断
2. `ai_gateway.py:158` — `max_tokens=4000` 对 800-1500 字中文文章 + JSON 结构可能不够，响应被截断后 JSON 解析失败
3. fallback 逻辑（`content_generator.py:226-231`）在 JSON 解析失败时将原始文本写入 body，但若原始文本本身是截断的 JSON，则 body 仍为空或无效

### 10.2 新增用户故事

**US-21** 作为品牌运营，我希望 AI 生成的文章包含完整正文（而非仅标题），以便直接进入编辑流程。

**US-22** 作为品牌运营，我希望在生成前指定目标字数（≥500 字），以便控制内容篇幅。

**US-23** 作为内容编辑，我希望在富文本编辑器中对 AI 生成的内容进行修改、排版和插入图片，以便产出可发布的成品。

**US-24** 作为内容编辑，我希望上传图片到云端（OSS）或本地存储，并在文章中引用，以便丰富内容表现。

**US-25** 作为品牌运营，我希望在生成内容时选择使用哪个 AI 大模型（默认 MIMO），以便根据内容质量和成本需求灵活选择。

### 10.3 验收标准

#### US-21
- [ ] AI 生成后，body 字段非空且长度 ≥ 500 字
- [ ] 生成的 JSON 解析失败时，fallback 逻辑将原始文本写入 body（而非空字符串）
- [ ] 前端编辑器正确显示生成的正文内容

#### US-22
- [ ] 生成弹窗中新增"目标字数"输入框，最小值 500，无上限
- [ ] 字数参数传递至后端，后端写入 prompt 指导 LLM 控制篇幅
- [ ] 生成完成后，字数统计反映实际正文字数

#### US-23
- [ ] 正文编辑区域替换为 TipTap 富文本编辑器
- [ ] 支持：加粗、斜体、标题（H2/H3）、有序/无序列表、引用、代码块
- [ ] 编辑器支持 Markdown 快捷键（输入 `##` 自动转为标题，需引入 `@tiptap/extension-typography`）
- [ ] 预览模式渲染富文本 HTML
- [ ] 编辑器同时显示目标字数和实际字数（如"目标 1000 字 · 实际 856 字"）

#### US-24
- [ ] 编辑器工具栏提供"插入图片"按钮
- [ ] 支持两种上传模式：OSS（阿里云）和本地存储
- [ ] 上传后图片以 `<img>` HTML 标签插入正文
- [ ] 支持拖拽上传和粘贴上传
- [ ] 图片上传后自动生成缩略图（宽度 300px，高度按比例）

#### US-25
- [ ] 生成弹窗中新增"AI 模型"下拉选择框
- [ ] 可选模型列表：MIMO（默认）、DeepSeek、OpenAI、通义千问
- [ ] 默认选中 MIMO，用户切换后记住上次选择（localStorage）
- [ ] 选定模型传递至后端，后端调用对应引擎的 `generate_text()`
- [ ] 若选定模型调用失败，自动 fallback 至 MIMO（而非 OpenAI）

### 10.4 功能需求

#### 10.4.1 Bug 修复 — 内容生成 body 为空
- 修复 `_parse_llm_output()` 在 JSON body 为空时的 fallback 逻辑
- 将 `generate_text()` 的 `max_tokens` 从 4000 提升至 8000
- 增加 JSON 解析日志，便于排查生成失败
- 增加重试机制：JSON 解析失败时自动重新调用 LLM（最多 2 次）

#### 10.4.2 字数配置
- 前端生成弹窗新增字数输入字段（整数，≥500）
- 后端 `ContentGenerateRequest` 新增 `target_word_count` 字段
- prompt 模板中追加字数要求：「正文不少于 {target_word_count} 字」
- 后端校验：实际字数 < 目标字数 × 0.8 时标记 `quality_score` 为低

#### 10.4.3 图片上传
- 新增 `POST /api/upload/image` 接口
- 支持格式：JPG、PNG、WebP，单文件 ≤ 10MB
- 存储后端可配置：`STORAGE_BACKEND=oss|local`
- OSS 配置项：`OSS_ENDPOINT`、`OSS_BUCKET`、`OSS_ACCESS_KEY`、`OSS_SECRET_KEY`
- OSS 启动校验连通性，配置错误时 fallback 到本地存储
- 本地存储路径：`uploads/images/{YYYY/MM/DD}/{uuid}.{ext}`
- 缩略图：宽度 300px，高度按原图比例缩放
- 返回 `{ "url": "...", "thumbnail_url": "...", "width": 0, "height": 0 }`
- TipTap 通过 `editor.chain().focus().setImage({src: url}).run()` 插入 HTML `<img>` 标签

#### 10.4.4 富文本编辑器（TipTap）
- 前端引入 `@tiptap/react`、`@tiptap/starter-kit`、`@tiptap/extension-image`、`@tiptap/extension-typography`
- 替换现有 `<textarea>` 为 TipTap 编辑器实例
- 工具栏：加粗、斜体、H2、H3、有序列表、无序列表、引用、代码块、插入图片
- Markdown 快捷键：输入 `##` + 空格自动转为 H2 标题（由 typography 扩展提供）
- 编辑器内容以 HTML 格式存储（body 字段新数据存 HTML，旧 plain text 数据保持原样不迁移）
- 预览模式直接渲染 HTML
- 编辑器头部同时显示"目标 {N} 字 · 实际 {M} 字"

#### 10.4.5 AI 模型选择
- 前端生成弹窗新增模型下拉框，选项：MIMO（默认）、DeepSeek、OpenAI、通义千问
- 用户选择存入 `localStorage`，下次打开自动回填
- 后端 `ContentGenerateRequest` 新增 `engine` 字段（枚举：mimo/deepseek/openai/qianwen，默认 mimo）
- `content_generator.py` 中 `generate_content()` 接收 `engine` 参数，优先调用选定引擎
- fallback 策略调整：选定引擎失败 → fallback 到 MIMO → 再失败报错
- 模型调用日志记录：记录每次生成使用的引擎名称
- 重新生成时使用当前内容已记录的 `engine`，不支持切换模型（简化 MVP）

### 10.5 非功能需求（追加）

| 维度 | 指标 |
|------|------|
| 生成响应时间 | ≤ 30s（含 LLM 调用） |
| 图片上传 | 单文件上传 ≤ 5s（10MB 以内） |
| 并发 | 支持 50 用户同时生成内容 |
| 存储 | OSS 月存储量无硬上限；本地存储单磁盘 ≥ 50GB |
| 兼容性 | Chrome 90+、Edge 90+、Safari 15+ |
| 可维护性 | 存储后端通过配置切换，无需改代码 |

### 10.6 优先级

| 优先级 | 功能 | MVP 内 | 状态 |
|--------|------|--------|------|
| P0 | Bug 修复：body 为空 | 是 | ✅ |
| P0 | 字数配置 | 是 | ✅ |
| P0 | AI 模型选择（默认 MIMO） | 是 | ✅ |
| P1 | TipTap 富文本编辑器 | 是 | ✅ |
| P1 | 图片上传（OSS + 本地） | 是 | ✅ |
| P2 | AI 自动配图 | 否 | ⬜ |
| P2 | 图片裁剪/滤镜 | 否 | ⬜ |
| P2 | 内容版本历史 | 否 | ⬜ |

### 10.7 待解决问题

| 问题 | 说明 | 建议 |
|------|------|------|
| OSS 服务商选型 | MVP 仅阿里云 OSS + 本地存储 | 已确认 |
| body 字段迁移 | 旧 plain text 数据不迁移，新数据存 HTML，TEXT 类型兼容两者 | 无需迁移脚本 |
| 图片版权 | 用户上传图片的版权责任归属 | 在服务条款中声明用户自负版权责任 |

---

## 11. 页面信息架构重构（v2.4）

### 11.1 重构动机

当前页面结构存在以下问题：
- **层级太深**：`/brands/[id]/content/[contentId]/adoption` 嵌套 4 层
- **功能堆砌**：Dashboard 混杂总览、图表、快捷操作
- **品牌绑定过强**：所有功能挂在 `/brands/[id]/` 下，跨品牌操作困难
- **内容分散**：创建、编辑、发布、追踪分散在不同路由
- **分析割裂**：可见性检测、竞品分析、品牌对比各一个页面

### 11.2 新信息架构

**核心思路：** 按用户任务（而非品牌维度）组织页面，扁平化路由结构。

```
公开页面：
  /                    → Landing
  /login               → 登录
  /register            → 注册

应用页面（需登录）：
  /dashboard           → 工作台
  /brands              → 品牌管理
  /content             → 内容中心
  /analytics           → 数据分析
  /subscription        → 订阅管理
```

### 11.3 各页面职责

| 页面 | 路由 | 核心功能 | 用户场景 |
|------|------|----------|----------|
| 工作台 | `/dashboard` | 关键指标卡片 + 最近内容 + 快捷入口 | 每日打开看一眼 |
| 品牌管理 | `/brands` | 品牌列表 + 创建/编辑（弹窗或侧边抽屉） | 管理品牌信息 |
| 内容中心 | `/content` | 跨品牌内容列表 + 筛选/搜索 | 查看所有内容 |
| 内容编辑 | `/content/[id]` | TipTap 编辑器 + 发布 + 采用追踪 | 编辑单篇内容 |
| 数据分析 | `/analytics` | Tabs：可见性监控 \| 竞品分析 \| 品牌对比 | 分析数据 |
| 订阅 | `/subscription` | 套餐选择 + 用量 | 管理订阅 |

### 11.4 关键变化

1. **品牌详情页取消** — 编辑品牌改为弹窗/抽屉，不再跳转独立页面
2. **内容从品牌嵌套中解放** — `/content` 是一级页面，创建时选择品牌
3. **分析合并** — 可见性、竞品、对比合并为一个页面的 Tab
4. **采用追踪内嵌** — 作为内容详情页的一个 Tab，不再独立路由

### 11.5 路由映射（新 → 旧）

| 新路由 | 旧路由 | 变化 |
|--------|--------|------|
| `/dashboard` | `/dashboard` | 简化内容 |
| `/brands` | `/brands` | 编辑改为弹窗 |
| `/brands/[id]` | ~~`/brands/[id]`~~ | 取消，编辑用弹窗 |
| `/brands/[id]/edit` | ~~`/brands/[id]/edit`~~ | 取消，合并到弹窗 |
| `/brands/[id]/analysis` | ~~`/brands/[id]/analysis`~~ | 移至 `/analytics` Tab |
| `/brands/[id]/compare` | ~~`/brands/[id]/compare`~~ | 移至 `/analytics` Tab |
| `/content` | ~~`/brands/[id]/content`~~ | 提升为一级 |
| `/content/[id]` | `/brands/[id]/content/[contentId]` | 层级减少 |
| `/content/[id]#adoption` | ~~`/brands/[id]/content/[contentId]/adoption`~~ | 内嵌为 Tab |
| `/analytics` | 新建 | 合并分析功能 |
| `/subscription` | `/subscription` | 不变 |

### 11.6 Sidebar 导航结构

```
┌─────────────────────────────────────────┐
│  [G] GeoRank                            │
├─────────────────────────────────────────┤
│  📊 工作台        /dashboard            │
│  🏢 品牌管理      /brands               │
│  📝 内容中心      /content              │
│  📈 数据分析      /analytics            │
├─────────────────────────────────────────┤
│  💳 订阅管理      /subscription         │
│  ─────────────────────────────────────  │
│  🌐 语言切换                           │
│  🚪 退出登录                           │
└─────────────────────────────────────────┘
```

### 11.7 优势

- 路由层级从 4 层降到 2 层
- 页面从 12 个减到 6 个
- 跨品牌操作更自然
- Sidebar 导航更清晰（5 个一级入口）

### 11.8 重构策略（评审修正）

采用**新旧并存 → 验证 → 切换**策略：

1. **Phase A**：创建 `(app)/` 路由组 + 新页面（不动旧页面）
2. **Phase B**：新页面功能验证通过
3. **Phase C**：添加旧路由重定向（301）到新路由
4. **Phase D**：删除旧页面文件

### 11.9 旧路由重定向映射

| 旧路由 | 新路由 | 重定向方式 |
|--------|--------|-----------|
| `/brands/[id]` | `/brands` | 301 |
| `/brands/[id]/edit` | `/brands` (打开 Drawer) | 301 + query param |
| `/brands/[id]/analysis` | `/analytics` | 301 |
| `/brands/[id]/compare` | `/analytics?tab=compare` | 301 |
| `/brands/[id]/content` | `/content?brand=[id]` | 301 |
| `/brands/[id]/content/[contentId]` | `/content/[contentId]` | 301 |
| `/brands/[id]/content/[contentId]/adoption` | `/content/[contentId]?tab=adoption` | 301 |

---

## 12. 项目进度状态（v2.6 更新）

### 12.1 总体进度

| 维度 | 总数 | 已完成 | 完成率 |
|------|------|--------|--------|
| P0 功能 | 10 | 10 | 100% |
| P1 功能 | 8 | 3 | 37.5% |
| P2 功能 | 8 | 0 | 0% |
| v1.1 追加需求 | 5 | 5 | 100% |
| v2.4 架构重构 | 4 Phase | 4 Phase | 100% |
| **整体** | **35** | **22** | **62.9%** |

### 12.2 已完成功能清单

#### 订阅与计费
- `SubscriptionPlan` model + `UserSubscription` model + `UsageRecord` model
- `billing.py`：Stripe Checkout / Webhook / Cancel / Reactivate
- `usage_tracker.py`：配额检查 + 用量统计
- `subscription.py` router：7 个端点（plans/current/checkout/webhook/cancel/reactivate/change-plan）
- `usage.py` router：2 个端点（current/history）
- 前端：`/subscription` 页面 + `UsageOverview.js` + `UpgradeModal.js` + `FeatureGate.js`

#### 品牌管理
- `Brand` model + `BrandQuery` model + `BrandProfile` model
- `brand_service.py`：CRUD + 查询词管理 + 品牌资料
- `brands.py` router：11 个端点（CRUD + profile + analytics + competitors）
- 前端：`/brands` 页面 + `CompetitorManager.js`

#### 可见度检测
- `VisibilityReport` model
- `ai_gateway.py`：6 引擎（OpenAI / Claude / Gemini / DeepSeek / 通义千问 / MiMo）
- `reports.py` router：5 个端点（check / list / check-all / latest / export）
- 前端：`VisibilityChart.js` + `EngineCompareChart.js`

#### 统计分析
- `AnalysisRun` model + `AnalysisResult` model
- `statistical_analysis.py`：多采样统计 + 引擎一致性 + 趋势对比
- `analysis.py` router：6 个端点（run / runs / detail / summary / compare / export）
- 前端：`/analytics` + `/analytics/[runId]` + `StatisticalCharts.js`

#### 竞品分析
- `BrandCompetitor` model
- `competitor_analysis.py`：竞品对比 + 历史记录
- `competitor_analysis.py` router：3 个端点（compare / results / history）
- 前端：`/analytics/competitors` + `CompetitorCharts.js`

#### AI 内容生成
- `GeneratedContent` model + `ContentDistribution` model
- `content_generator.py`：4 种类型（FAQ / 社区问答 / 行业文章 / 新闻稿）
- `quality_checker.py`：事实校验 + 去重 + 平台合规
- `content.py` router：9 个端点（generate / list / stats / detail / update / regenerate / confirm / publish / adoption）
- 前端：`/content` + `/content/[id]` + `ContentEditor.js` + `TipTapEditor.js` + `PublishModal.js`

#### 采纳效果验证
- `AdoptionCheck` model
- `adoption_verifier.py`：平台收录检测 + AI 引擎引用检测 + 排名变化
- 前端：`AdoptionTimeline.js`

#### 官网抓取
- `crawler.py`：robots.txt 检查 + 品牌信息提取
- `crawler.py` router：1 个端点（analyze）

#### 图片上传与存储
- `storage.py`：LocalStorage + OSSStorage（阿里云）
- `thumbnail.py`：缩略图生成
- `upload.py` router：1 个端点（image）
- 前端：`ImageUploadDialog.js`

#### CSV/PDF 导出
- `export.py`：4 个导出函数（可见度 CSV/PDF + 统计 CSV/PDF）
- 支持中英文、UTF-8 BOM、CJK 字体、自动换行、页脚页码

#### 页面架构重构（v2.4）
- `(app)/` 路由组 + AppShell + Sidebar
- 新路由：`/dashboard` / `/brands` / `/content` / `/analytics` / `/subscription`
- 旧路由重定向（301）
- 响应式：375px / 768px / 1280px 三档

#### 多语言
- `en.json` + `zh.json` 双语支持
- `LanguageSwitcher.js` 切换组件

### 12.3 未完成功能清单

#### P1 未完成（5 项）

| 功能 | 当前状态 | 需要的工作 |
|------|----------|-----------|
| 团队管理 UI | `TeamMember` model 已有 | 前端：邀请页面 + 成员列表 + 角色管理 |
| 白标 PDF 报告 | 未开始 | 后端：Logo 上传 + PDF 模板替换；前端：设置页 Logo 上传 |
| API Key 管理 | 未开始 | 后端：Key 生成/吊销/轮换 + Rate Limit；前端：Key 管理页面 |
| 邮件通知 | 未开始 | 后端：邮件发送服务 + 用量告警定时任务 |
| 账单历史 | 未开始 | 后端：Stripe Invoice API 对接；前端：账单列表页 |

#### P2 未完成（8 项）
全部未开始，详见 §8 P2 列表。

### 12.4 技术栈总结

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 (App Router) + React + Tailwind CSS + TipTap |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy + Pydantic v2 |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） |
| AI 引擎 | OpenAI / Claude / Gemini / DeepSeek / 通义千问 / MiMo |
| 支付 | Stripe Checkout + Webhook |
| 存储 | 本地文件系统 + 阿里云 OSS |
| 认证 | JWT（access_token） |

### 12.5 已知技术债

| 项目 | 说明 | 建议 |
|------|------|------|
| PDF 导出字体 | 硬编码 `C:\Windows\Fonts\simhei.ttf`，仅 Windows 可用 | 改为可配置字体路径，Linux/macOS 使用 Noto Sans CJK |
| 数据库 | 开发环境用 SQLite，生产需切换 PostgreSQL | 确认 SQLAlchemy 兼容性，添加 Alembic 迁移脚本 |
| 测试 | 无自动化测试 | 补充 pytest 单元测试 + Playwright E2E 测试 |
| CI/CD | 无持续集成 | 添加 GitHub Actions 或类似 CI 流水线 |
| 日志 | 无结构化日志 | 引入 structlog 或 loguru，统一日志格式 |
| 错误监控 | 无 Sentry 等监控 | 接入 Sentry 或类似服务 |

---

## 附录 B：内容生成闭环流程

```
可见度分析 → 识别薄弱关键词/竞品差距
        ↓
AI 内容生成（4 种类型 × 多平台适配）
        ↓
人工编辑 & 确认
        ↓
手动分发（复制内容到目标平台）
        ↓
采纳效果验证（平台收录 → AI 引擎引用 → 排名变化）
        ↓
反馈至下一轮分析（验证优化效果）
```

---

## 13. v3.0 迭代需求（技术债清理 + 按量加购）

> 版本：v3.0-r2 | 创建：2026-06-04 | 修订：2026-06-04（评审 r1 修订） | 范围：技术债全量清理 + Add-on 购买流程

### 13.1 MVP 摘要

v3.0 聚焦两类工作：①清理全部 6 项技术债（TypeScript 迁移、中文分词、前端体验优化），提升代码质量和可维护性；②实现按量加购（Add-on）功能，允许用户购买额外品牌位、查询词包等弹性资源。不包含：内容模板市场、AI SEO 评分、半自动分发（归入 v3.1）。

### 13.2 用户故事

**技术债相关：**

**US-TD-01** 作为开发者，我希望前端代码全部使用 TypeScript，以便在编译期捕获类型错误，减少运行时 Bug。
- [ ] 全部 `.js` 文件迁移为 `.ts` / `.tsx`（按 4 阶段执行，见 §13.3.1）
- [ ] `tsconfig.json` 配置 `strict: true`
- [ ] `npm run build` 零类型错误
- [ ] `tsc --noEmit` 零类型错误
- [ ] 所有 API 响应类型定义在 `types/` 目录
- [ ] 核心流程冒烟测试通过：登录 → 添加品牌 → 生成内容 → 订阅管理
- [ ] 各页面手动验证无报错（Dashboard / Brands / Content / Analytics / Subscription）

**US-TD-02** 作为内容编辑，我希望字数统计仅计算中文字数（不含标点空格），以便准确控制内容篇幅。
- [ ] 安装 `@tiptap/extension-character-count` 并配置到编辑器
- [ ] 前端中文字数统计使用正则 `/[一-鿿]/g` 匹配中文字符（轻量方案）
- [ ] 编辑器头部显示"目标 {N} 字 · 实际 {M} 字"，M = 中文字符数 + 英文单词数
- [ ] 英文单词按空格分词计数
- [ ] 后端质量检测 `quality_checker.py` 引入 `jieba` 分词，替换 `_calculate_overlap` 中的空格分割逻辑

**US-TD-03** 作为内容编辑，我希望拖拽或粘贴图片到编辑器时自动触发上传，以便提升编辑效率。
- [ ] TipTap 编辑器监听 `drop` 事件，自动触发图片上传
- [ ] TipTap 编辑器监听 `paste` 事件，检测剪贴板图片并上传
- [ ] 上传成功后图片自动插入编辑器光标位置
- [ ] 上传过程中显示内联进度条（非弹窗）

**US-TD-04** 作为用户，我希望大数据量列表页面加载流畅，不出现卡顿。
- [ ] 内容列表使用虚拟滚动（引入 `@tanstack/react-virtual`）
- [ ] 100+ 条数据时首屏渲染 <100ms
- [ ] 滚动帧率 ≥30fps
- [ ] 使用动态测量模式（`measureElement`），预估行高 80px

**US-TD-05** 作为开发者，我希望质量检测的中文标题相似度计算准确，以便有效去重。
- [ ] 引入 `jieba` 分词库对中文标题分词
- [ ] 相似度计算基于分词后的 token 集合（而非按空格分割）
- [ ] 纯中文标题（无空格）的相似度检测正确工作

**Add-on 相关：**

**US-AO-01** 作为 Pro 用户，我希望在配额即将耗尽时购买额外资源包（如额外品牌位、查询词包），以便不升级计划也能继续使用。
- [ ] 订阅管理页面"加购"Tab 展示可用 Add-on 列表（卡片网格布局，3 列）
- [ ] 用户点击购买后跳转 Stripe Checkout 完成支付（无需二次确认弹窗）
- [ ] 支付成功回调后 Toast 提示"购买成功，配额已更新"
- [ ] 支付成功后 5 秒内配额生效
- [ ] Add-on 与当前订阅周期绑定，到期后自动失效，不自动续期
- [ ] 中途购买的 Add-on 有效期 = 当前订阅周期剩余时间
- [ ] 降级计划后已购 Add-on 保留至到期
- [ ] 同一 Add-on 可重复购买，额度累加

**US-AO-02** 作为用户，我希望查看已购买的 Add-on 和剩余配额，以便了解当前可用资源。
- [ ] 仪表盘用量进度条分段展示：基础配额（蓝色）+ Add-on 配额（绿色）
- [ ] 已购 Add-on 列表展示：类型、数量、到期时间、剩余配额
- [ ] Add-on 到期前 3 天显示提醒

### 13.3 功能需求

#### 13.3.1 TypeScript 迁移

- 迁移范围：`frontend/src/` 下全部 `.js` / `.jsx` 文件（约 40+ 文件）
- 迁移策略：自底向上，分 4 阶段执行：

| 阶段 | 范围 | 预估工作量 | 交付物 |
|------|------|-----------|--------|
| Phase 1 | 基础层：`types/`、`lib/`、`services/` | 3 天 | `npm run build` 通过 |
| Phase 2 | 组件层：`components/` | 3 天 | `npm run build` 通过 |
| Phase 3 | 页面层：`app/` | 4 天 | `npm run build` 通过 |
| Phase 4 | 验证与回归测试 | 2 天 | 核心流程冒烟通过 |

- `tsconfig.json`：`strict: true`、`jsx: "preserve"`、`paths` 别名保持
- 禁止 `any` 类型——所有 API 响应使用 `interface` 定义
- 每迁移一个模块，确保 `npm run build` 通过
- 迁移期间冻结新功能开发，仅修 Bug
- TS 迁移由 1 人专注执行；Add-on 后端可并行开发（Python 不受影响）
- 前端功能（拖拽上传、虚拟滚动）需等 Phase 3 完成后执行

#### 13.3.2 中文分词与字数统计

- 安装 `@tiptap/extension-character-count` 替代 `getText().length` fallback
- 前端字数统计：使用正则 `/[一-鿿]/g` 匹配中文字符（轻量方案，无需引入 jieba）
- 英文单词计数：按空格分词
- 混合内容：中文字符数 + 英文单词数
- 后端质量检测 `quality_checker.py`：引入 `jieba>=0.42.1` 分词，替换 `_calculate_overlap` 中的空格分割逻辑
- jieba 仅用于后端（~20MB），前端不引入，Docker 镜像增量可接受

#### 13.3.3 拖拽/粘贴上传

- TipTap 编辑器注册 `handleDrop` 和 `handlePaste` 事件
- 检测 `dataTransfer.files` / `clipboardData.items` 中的图片文件
- 复用现有 `ImageUploadDialog` 的上传逻辑（`contentAPI.uploadImage`）
- 上传完成后调用 `editor.chain().focus().setImage({src: url}).run()` 插入图片
- 上传中显示内联进度条（非弹窗）

#### 13.3.4 虚拟滚动

- 引入 `@tanstack/react-virtual`（轻量、无依赖，兼容 React 16.8+）
- 适用页面：内容列表（`/content`）、品牌列表（`/brands`）
- 使用动态测量模式（`measureElement`），预估行高 80px（内容列表行高不固定：标题 + 摘要）
- 首屏渲染 ≤100ms（100+ 条数据）

#### 13.3.5 按量加购（Add-on）

**Add-on 定义与分类：**

| Add-on | 价格 | 内容 | 有效期 | 类型 |
|--------|------|------|--------|------|
| 额外品牌位 | $10/个/月 | +1 品牌上限 | 当前订阅周期 | 上限类 |
| 查询词包 | $15/月 | +50 查询词额度 | 当前订阅周期 | 额度类 |
| 内容生成包 | $15/月 | +20 篇生成额度 | 当前订阅周期 | 额度类 |

**Add-on 类型说明：**
- **上限类**（品牌位）：增加的是配额上限，无需消耗逻辑，仅影响"是否可新增"的判断
- **额度类**（查询词包、生成包）：增加的是可用额度，合并到基础计划配额中统一消耗

**配额合并算法：**
```
实际可用配额 = 基础计划配额 + SUM(有效 Add-on 额度)
消耗顺序：统一消耗，不区分基础/Addon（简化实现）
```

**后端 — AddonPurchase model：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| user_id | INTEGER FK | 关联用户 |
| addon_type | VARCHAR(32) | Add-on 类型（brand_slot / query_pack / content_pack） |
| quantity | INTEGER | 购买数量 |
| amount | DECIMAL(18,4) | 支付金额 |
| currency | VARCHAR(3) | 货币代码（USD） |
| stripe_session_id | VARCHAR(255) | Stripe Checkout Session ID |
| status | VARCHAR(16) | 状态（pending / active / expired / cancelled） |
| plan_period_start | TIMESTAMP | 关联订阅周期开始 |
| plan_period_end | TIMESTAMP | 关联订阅周期结束 |
| expires_at | TIMESTAMP | Add-on 到期时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**索引策略：**
- 主索引：`id`（主键）
- 查询索引：`(user_id, status, expires_at)` — 查询用户有效 Add-on
- 唯一约束：`(user_id, addon_type, plan_period_start)` — 防止同一周期重复购买同类 Add-on

**后端 API：**
- 新增 `POST /api/subscription/addon/checkout`：创建 Stripe Checkout Session
- 新增 `GET /api/subscription/addons`：查询用户已购 Add-on 列表
- 修改 `usage_tracker.py`：查询有效 Add-on 额度，合并到基础配额上限中
- Stripe Webhook 扩展处理 `checkout.session.completed` 事件，更新 Add-on 状态

**前端：**
- 订阅管理页面新增"加购"Tab，卡片网格布局（3 列）
- Add-on 卡片展示：名称、价格、内容描述、购买按钮
- 点击购买直接跳转 Stripe Checkout（无二次确认弹窗，Stripe 自带确认页）
- 支付成功回调后 Toast 提示"购买成功，配额已更新"
- 仪表盘用量进度条分段展示：基础配额（蓝色）+ Add-on 配额（绿色）

**业务规则：**
- Add-on 不自动续期，到期后需重新购买
- 中途购买的 Add-on 有效期 = 当前订阅周期剩余时间
- 降级计划后已购 Add-on 保留至到期
- 同一 Add-on 可重复购买，额度累加
- 超出配额后保留数据但阻止新增操作，引导续费
- Add-on 一经购买不退款（与订阅取消策略一致）

### 13.4 非功能需求

| 维度 | 指标 |
|------|------|
| TypeScript 迁移 | `npm run build` 零错误，`tsc --noEmit` 零错误 |
| TS 迁移回归 | 核心流程冒烟测试全部通过 |
| 字数统计准确性 | 中文字数偏差 ≤5%（与人工计数对比） |
| 拖拽上传响应 | 从拖放到图片显示 ≤3s（10MB 以内） |
| 虚拟滚动性能 | 100+ 条数据首屏渲染 <100ms |
| Add-on 支付成功率 | ≥99%（Stripe 基础设施保障） |
| Add-on 生效延迟 | 支付成功后 ≤5 秒 |

### 13.5 优先级与范围

| 优先级 | 功能 | Sprint | 范围 | 并行策略 |
|--------|------|--------|------|----------|
| P0 | TypeScript 迁移 | v3.0 | 全量（4 阶段） | 1 人专注，其他功能冻结 |
| P0 | 中文分词 + 字数统计 | v3.0 | 前端正则 + 后端 jieba | 后端可与 TS 迁移并行 |
| P0 | 拖拽/粘贴上传 | v3.0 | 前端 | 依赖 TS Phase 3 完成 |
| P0 | API Key 迁移到数据库 | v3.0 | 后端 | 当前内存存储，重启丢失 |
| P0 | threading → Celery | v3.0 | 后端 | 进程重启任务丢失 |
| P0 | pytest 自动化测试 | v3.0 | 后端 | 零自动化测试 |
| P1 | 虚拟滚动 | v3.0 | 内容列表 + 品牌列表 | 依赖 TS Phase 3 完成 |
| P1 | Add-on 购买流程 | v3.0 | 全栈 | 后端可与 TS 迁移并行 |
| P1 | N+1 查询优化 | v3.0 | 后端 | get_content_stats、scheduler |
| P1 | Redis 连接池 | v3.0 | 后端 | 无 max_connections 配置 |
| P1 | 外部服务集成规范 | v3.0 | 后端 | SERP API + LLM JSON mode |
| P2 | JSON 解析优化 | v3.0 | 后端 | 贪婪正则可能匹配错误 |
| P2 | 内容模板市场 | v3.1 | — | — |
| P2 | AI 内容 SEO 评分 | v3.1 | — | — |
| P2 | 半自动分发 | v3.1 | — | — |

### 13.6 待解决问题（已全部关闭）

| # | 问题 | 结论 |
|---|------|------|
| 1 | TypeScript 迁移是否需要暂停功能开发？ | ✅ 迁移期间冻结新功能，仅修 Bug |
| 2 | jieba 分词包体积 (~20MB) 是否可接受？ | ✅ 仅后端引入，Docker 镜像增量可接受 |
| 3 | Add-on 是否支持退款？ | ✅ 一经购买不退款 |
| 4 | Add-on 到期后已超出的配额如何处理？ | ✅ 保留数据但阻止新增，引导续费 |
| 5 | API Key 存储方案？ | ✅ 迁移到数据库表 |
| 6 | Celery broker 选择？ | ✅ 使用 Redis 作为 broker |
| 7 | pytest 覆盖范围？ | ✅ 优先覆盖核心路径（配额、内容生成、采纳检测） |

### 13.7 v3.0 技术债务清单（完整）

| 编号 | 项目 | 优先级 | 文件 | 说明 |
|------|------|--------|------|------|
| TD-01 | TypeScript 迁移 | P0 | frontend/src/ | 全量 4 阶段，12 天 |
| TD-02 | API Key 迁移到数据库 | P0 | api_keys.py | 当前内存存储，重启丢失 |
| TD-03 | threading → Celery | P0 | content.py, scheduler.py | 进程重启任务丢失 |
| TD-04 | pytest 自动化测试 | P0 | backend/tests/ | 覆盖核心路径 |
| TD-05 | N+1 查询优化 | P1 | content.py, scheduler.py | get_content_stats、scheduler |
| TD-06 | Redis 连接池 | P1 | usage_tracker.py | max_connections + timeout |
| TD-07 | 外部服务集成规范 | P1 | adoption_verifier.py | SERP API + LLM JSON mode |
| TD-08 | JSON 解析优化 | P2 | content_generator.py | raw_decode 替代贪婪正则 |
| TD-09 | 中文分词 + 字数统计 | P0 | TipTapEditor.py, quality_checker.py | 前端正则 + 后端 jieba |
| TD-10 | 拖拽/粘贴上传 | P0 | TipTapEditor.js | 依赖 TS Phase 3 |
| TD-11 | 虚拟滚动 | P1 | content/page.js, brands/page.js | @tanstack/react-virtual |
| TD-12 | Add-on 购买流程 | P1 | 全栈 | 新增 model + API + 前端 |
