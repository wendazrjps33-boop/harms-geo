# 全员评审报告 · R5（P7 完成后 — 缺陷影响范围、修复优先级、发布风险）

**日期**：2026-06-05
**评审范围**：v2.6 QA 报告（15 项缺陷 + No-Go 建议）
**参与方**：产品经理 · 架构师 · 前端工程师 · 后端工程师 · 测试工程师

---

## 一、阻塞项确认（全票通过）

| ID | 描述 | PM | 架构师 | 前端 | 后端 | 测试 | 结论 |
|----|------|-----|--------|------|------|------|------|
| BUG-V26-02 | 配额检查绕过 | P0 致命 | P0 确认 | — | P0 确认 | P0 确认 | **全票 P0** |
| BUG-V26-01 | 采纳检测只执行一次 | P1 核心缺失 | P0 确认 | — | P0 确认 | P0 确认 | **全票 P0** |
| BUG-V26-03 | Google ToS 违规 | P0 功能不可用 | P0 确认 | — | P0 确认 | P0 确认 | **全票 P0** |

**全员共识**：No-Go 判定正确，3 项阻塞缺陷必须修复后才能发布。

---

## 二、问题清单

### 阻塞项（3 项）

| # | 提出角色 | 问题描述 | 严重程度 | 责任人 | 修复方案 | 工作量 |
|---|---------|---------|---------|--------|----------|--------|
| 1 | 测试 | **BUG-V26-02**：content.py:110 仅用 require_feature，未用 require_quota("content")，Free 用户可无限生成 | 阻塞 | 后端 | 添加 Depends(require_quota("content")) | 0.5h |
| 2 | 测试 | **BUG-V26-01+05**：adoption_verifier.py:147 去重逻辑不区分 days_after_publish，且创建时未赋值该字段 | 阻塞 | 后端 | 修改去重条件 + 计算并赋值 days_after_publish | 1.5h |
| 3 | 测试 | **BUG-V26-03**：adoption_verifier.py:14 直接 HTTP 抓取 Google SERP，违反 ToS | 阻塞 | 后端 | 改用 Google Custom Search API 或 SerpAPI | 2h |

### 高优先级缺陷（5 项）

| # | 提出角色 | 问题描述 | 严重程度 | 责任人 | 修复方案 | 工作量 |
|---|---------|---------|---------|--------|----------|--------|
| 4 | 架构师 | **BUG-V26-07**：regenerate_section 同步阻塞，与 generate 的异步模式不一致 | 高 | 后端 | 复用 _run_generation 的线程池 + task_store 模式 | 2h |
| 5 | 架构师 | **BUG-V26-14**：billing.py:91 Webhook 无 event_id 去重，Stripe 重试可能导致重复订阅 | 高 | 后端 | 新增 WebhookEvent 模型 + SETNX 去重 | 1.5h |
| 6 | 架构师 | **BUG-V26-15**：usage_tracker.py:56 Redis key 无 TTL，sync_to_db 未被调用 | 高 | 后端 | 设置 TTL + scheduler 定时调用 sync_to_db | 1.5h |
| 7 | 前端 | **BUG-V26-10**：subscription/page.js:49 billing_cycle 硬编码 monthly，用户无法选年付 | 高 | 前端 | 添加 billingCycle state + Toggle UI | 0.5d |
| 8 | 后端 | **BUG-V26-06**：content.py:471 publish 端点允许重复发布，可能重复创建 ContentDistribution | 高 | 后端 | 已 published 时返回 409 | 0.5h |

### 中优先级缺陷（5 项）

| # | 提出角色 | 问题描述 | 严重程度 | 责任人 | 修复方案 | 工作量 |
|---|---------|---------|---------|--------|----------|--------|
| 9 | 架构师 | **BUG-V26-08**：content.py:39 _generation_locks 字典无限增长 | 中 | 后端 | finally 块中清理 lock 条目 | 0.5h |
| 10 | 架构师 | **BUG-V26-13**：content_generator.py:300 JSON 解析依赖 str.index("{") 脆弱 | 中 | 后端 | 使用正则提取 JSON 块或 json.JSONDecoder | 1h |
| 11 | 前端 | **BUG-V26-09**：两套编辑器并存，图片上传方式不统一 | 中 | 前端 | 拆分为 TipTapEditor（内核）+ ContentEditorShell（业务壳） | 1.5-2d |
| 12 | 前端 | **BUG-V26-12**：错误处理模式不统一（setError/console.error/alert） | 中 | 前端 | 统一为 setError + UI，建立 useErrorHandler Hook | 1.5d |
| 13 | 测试 | **BUG-V26-04**：usage_tracker.py:25 query/check 维度硬编码为无限 | 中 | 后端 | 确认业务意图，加注释或补充字段 | 0.5-1h |

### 低优先级缺陷（2 项）

| # | 提出角色 | 问题描述 | 严重程度 | 责任人 | 修复方案 | 工作量 |
|---|---------|---------|---------|--------|----------|--------|
| 14 | 测试 | **BUG-V26-11**：采纳数据展示三处不一致 | 低 | 前端 | 统一使用 AdoptionTimeline，增加 compact 模式 | 1d |
| 15 | 测试 | **BUG-V26-12**：错误处理模式不统一 | 低 | 前端 | 已列入中优先级 #12 | — |

### 前端补充缺陷（全员评审新增）

| # | 提出角色 | 问题描述 | 严重程度 | 责任人 | 修复方案 | 工作量 |
|---|---------|---------|---------|--------|----------|--------|
| 16 | 前端 | TipTapEditor content prop 初始化后不同步 | 高 | 前端 | 增加 useEffect 监听 content 变化 | 0.5d |
| 17 | 前端 | ImageUploadDialog 使用 XHR 绕过统一 request 工具，缺 CSRF Token | 高 | 前端 | 替换为 fetch + request 封装 | 0.5d |
| 18 | 前端 | AdoptionTimeline 时间线连接线 absolute 定位 bug | 高 | 前端 | 父容器加 relative，修正定位 | 0.25d |
| 19 | 前端 | UsageOverview limit=-1 时显示 /-1 和负数 remaining | 高 | 前端 | limit===-1 时显示 ∞ | 0.25d |

---

## 三、系统性问题分析（架构师总结）

### 问题 1：缺少统一的请求预处理管线

**表现**：BUG-V26-02（配额未检查）+ BUG-V26-14（Webhook 无幂等）
**根因**：关键路径缺少前置/后置钩子，功能门控与配额门控未串联
**建议**：创建组合依赖 `require_feature_with_quota(feature, dimension)`，Webhook 端点建立 `签名验证 → 幂等去重 → 事件分发` 管线

### 问题 2：后台任务执行模型不统一

**表现**：BUG-V26-07（同步阻塞）+ BUG-V26-08（锁无限增长）
**根因**：generate 用裸 threading.Thread，regenerate 直接同步执行，缺乏统一抽象
**建议**：引入 TaskRunner 接口（ThreadPoolExecutor 实现），统一 generate 和 regenerate 的执行模式

### 问题 3：缺乏外部服务集成规范

**表现**：BUG-V26-03（直接爬 Google）+ BUG-V26-13（脆弱的 JSON 解析）
**根因**：对第三方服务的交互方式缺乏标准化
**建议**：architect_constraint.md 增加约束：SERP 必须走正规 API，LLM 输出要求 JSON mode 或 markdown 代码块

---

## 四、各角色建议汇总

### 产品经理建议

1. **配额检查必须前置 + 双重校验**：API 入口层检查 + 服务端 Token 消耗硬上限兜底
2. **采纳检测采用合规数据源**：MVP 阶段用 SerpAPI/DataForSEO，后续迭代支持 Google Search Console 直连
3. **首版可缩减检测频次控制成本**：MVP 提供 2 次检测（第 3/14 天），付费版解锁完整 4 次

### 架构师建议

1. **引入请求管线中间件模式**：认证 → 功能检查 → 配额检查 → 业务逻辑，创建组合依赖
2. **统一后台任务执行模型**：TaskRunner 接口 + ThreadPoolExecutor 实现，为 Celery 迁移预留接口
3. **建立外部服务集成规范**：SERP API 禁止直接爬取，LLM 输出要求结构化格式

### 前端工程师建议

1. **建立统一错误处理 Hook**：useErrorHandler 封装 error state，ESLint 禁止 alert() 和裸 console.error
2. **TipTap 编辑器合并为单一入口**：RichTextEditor 通过 mode="full"|"simple" 控制功能集
3. **API 请求层统一**：request 函数扩展支持 FormData，统一注入 auth token 和 CSRF token

### 后端工程师建议

1. **后台任务迁移到 Celery**：threading.Thread → Celery + Redis，天然支持重试和分布式锁
2. **统一异常处理和结构化日志**：GeoRankError 基类 + JSON 格式日志 + 全局异常处理器
3. **引入 Alembic 数据库 migration 管理**：现有 schema 作为 baseline，后续 DDL 通过 migration 脚本

### 测试工程师建议

1. **引入 pytest 基础设施**：覆盖配额检查、内容生成、采纳检测三个核心路径，目标覆盖率 ≥80%
2. **建立"修复前先写测试"流程**：每个 BUG 先写失败测试（red），再修复代码（green）
3. **为外部 API 调用建立 Mock 策略**：Protocol/ABC 接口定义，测试环境用 Mock

---

## 五、修复计划

### Phase 1：阻塞项修复（Day 1-2）

| 任务 | 负责人 | 工作量 | 验收标准 |
|------|--------|--------|----------|
| BUG-V26-02 配额检查前置 | 后端 | 0.5h | Free 用户生成返回 403 |
| BUG-V26-01+05 采纳检测频率 | 后端 | 1.5h | 同一内容 day=3 和 day=7 各一条记录 |
| BUG-V26-03 替换 Google 抓取 | 后端 | 2h | 使用合规 API，mock 测试通过 |
| 前端补充 #16-19 | 前端 | 1.5d | 编辑器同步、CSRF、定位、limit 显示 |
| 回归测试 | 测试 | 0.5d | 阻塞项自动化测试全部通过 |

### Phase 2：高优先级修复（Day 3-4）

| 任务 | 负责人 | 工作量 |
|------|--------|--------|
| BUG-V26-07 regenerate 异步化 | 后端 | 2h |
| BUG-V26-14 Webhook 幂等 | 后端 | 1.5h |
| BUG-V26-15 Redis TTL + sync | 后端 | 1.5h |
| BUG-V26-06 重复发布保护 | 后端 | 0.5h |
| BUG-V26-10 billing_cycle 切换 | 前端 | 0.5d |
| pytest 基础设施搭建 | 测试 | 1d |

### Phase 3：中优先级修复（Day 5-7）

| 任务 | 负责人 | 工作量 |
|------|--------|--------|
| BUG-V26-08 锁清理 | 后端 | 0.5h |
| BUG-V26-13 JSON 解析优化 | 后端 | 1h |
| BUG-V26-04 确认 query/check 设计意图 | 后端+PM | 0.5h |
| BUG-V26-09 编辑器统一 | 前端 | 1.5-2d |
| BUG-V26-12 错误处理统一 | 前端 | 1.5d |
| 全量回归测试 | 测试 | 1d |

**总预估：7 个工作日**

---

## 六、结论

- **阻塞项**：3 项（全票确认 P0）
- **高优先级**：5 项 + 4 项前端补充
- **中优先级**：5 项
- **低优先级**：2 项
- **决定**：**修复后推进** — 3 项阻塞缺陷必须在 Phase 1 修复并通过自动化测试验证后，才能恢复发布流程

**核心风险**：项目零自动化测试，修复可能引入新缺陷。建议 Phase 1 同步建立 pytest 基础设施，覆盖阻塞项的回归验证。
