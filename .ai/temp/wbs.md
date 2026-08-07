# GeoRank 工作分解结构（WBS）

> 版本：v5.0 | 日期：2026-08-07
> 基于：v5.0 需求 + 现有代码审计

---

## 1. 执行概览

| 阶段 | 周期 | 范围 |
|------|------|------|
| Phase 1 | Week 1-2 | 技术债修复 + 后端加固 |
| Phase 2 | Week 3-4 | GEO 审计 + AI 引擎重构 |
| Phase 3 | Week 5-6 | 内容 SEO 评分 + Kimi 引擎 |
| Phase 4 | Week 7-8 | 测试基线 + 部署优化 |

---

## 2. Phase 1：技术债修复（Week 1-2）

### 1.1 ai_gateway.py Bug 修复与重构

**任务 1.1.1：修复 logger 未定义 Bug**
- 文件：`backend/app/services/ai_gateway.py`
- 问题：`generate_text` 函数引用了未定义的 `logger`
- 修复：在文件顶部添加 `logger = logging.getLogger(__name__)`
- 验收：`generate_text` 不再抛 NameError

**任务 1.1.2：AI 引擎插件化重构**
- 文件：`backend/app/services/ai_gateway.py`
- 目标：消除 6 个 `query_xxx` 函数的重复代码
- 实现：
  - 定义 `EngineAdapter` 协议
  - 实现 `OpenAIAdapter`（兼容 DeepSeek/MiMo/通义千问）
  - 实现 `ClaudeAdapter`
  - 实现 `GeminiAdapter`
  - 构建 `ENGINE_REGISTRY` 注册表
  - 重构 `check_visibility` 使用注册表
  - 重构 `generate_text` 使用注册表
- 验收：所有引擎查询和文本生成功能正常

**任务 1.1.3：check_visibility 添加超时/重试**
- 文件：`backend/app/services/ai_gateway.py`
- 目标：所有 LLM 调用有 30s 超时 + 最多 2 次重试
- 实现：复用 `generate_text` 的 retry 逻辑
- 验收：模拟超时场景，确认自动重试

### 1.2 regenerate_section 切换 Celery

**任务 1.2.1：Router 层切换异步调用**
- 文件：`backend/app/routers/content.py`
- 目标：`regenerate` endpoint 改为调用 `regenerate_content_async.delay()`，返回 202
- 现状：Celery task `regenerate_content_async` 已定义在 `celery_tasks/content_tasks.py`
- 验收：POST /api/content/{id}/regenerate 返回 202 + task_id

**任务 1.2.2：清理 content_generator.py 中的同步版本**
- 文件：`backend/app/services/content_generator.py`
- 目标：`run_regeneration` 函数标记为 deprecated 或删除
- 验收：代码中无 `threading.Thread` 用于业务逻辑

### 1.3 Redis TTL 审计

**任务 1.3.1：审计 subscription_gate.py Redis key**
- 文件：`backend/app/middleware/subscription_gate.py`
- 检查：`user_plan:{user_id}` 和 `plan:{plan_code}` 的 TTL 设置
- 现状：已有 TTL（300s 和 3600s），确认无遗漏
- 验收：grep 确认所有 redis.set/setex 调用都有 TTL

**任务 1.3.2：审计全局 Redis 使用**
- 扫描所有 Python 文件中的 `redis_client` 使用
- 确认所有 key 有显式 TTL
- 验收：无永不过期的业务 key

### 1.4 补齐外部服务超时/重试

**任务 1.4.1：serp_gateway 添加重试**
- 文件：`backend/app/services/serp_gateway.py`
- 目标：SERP API 调用添加 1 次重试
- 验收：模拟网络抖动，确认自动重试

---

## 3. Phase 2：GEO 审计能力（Week 3-4）

### 2.1 后端 GEO 审计服务

**任务 2.1.1：创建 crawlability_audit 服务**
- 新文件：`backend/app/services/crawlability_audit.py`
- 功能：
  - 检查 robots.txt 是否允许 AI 爬虫
  - 检查 llms.txt 是否存在
  - 检测页面 JSON-LD 结构化数据
  - 评估内容可爬取性评分（0-100）
- 依赖：httpx
- 验收：输入 URL，返回结构化审计报告

**任务 2.1.2：创建审计 API 路由**
- 新文件：`backend/app/routers/audit.py`
- 端点：
  - `POST /api/audit/crawlability` — 启动审计
  - `GET /api/audit/{audit_id}` — 获取审计结果
- 依赖：require_feature_with_quota
- 验收：API 可调用，返回审计结果

**任务 2.1.3：创建审计数据模型**
- 新文件：`backend/app/models/audit.py`
- 表：`crawlability_audits`
- 字段：brand_id, url, robots_txt_ok, llms_txt_ok, json_ld_found, score, detail, created_at
- 验收：表创建成功，CRUD 正常

### 2.2 前端 GEO 审计页面

**任务 2.2.1：创建审计页面**
- 新文件：`frontend/src/app/(app)/audit/page.tsx`
- 功能：输入 URL → 启动审计 → 展示结果
- 组件：审计结果卡片、评分仪表盘、优化建议列表
- 验收：页面渲染正常，可发起审计

**任务 2.2.2：创建审计结果组件**
- 新文件：`frontend/src/components/CrawlabilityReport.tsx`
- 功能：展示 robots.txt / llms.txt / JSON-LD / 评分
- 验收：组件渲染正常

---

## 4. Phase 3：内容 SEO 评分 + Kimi（Week 5-6）

### 3.1 内容 SEO 评分

**任务 3.1.1：创建 content_seo_scorer 服务**
- 新文件：`backend/app/services/content_seo_scorer.py`
- 功能：
  - 评估内容可读性
  - 评估事实性（是否包含数据引用）
  - 评估独特性（避免模板化）
  - 评估被 AI 引用潜力
  - 评估平台适配度
  - 输出综合评分 0-100 + 优化建议
- 实现：基于规则 + LLM 辅助评分
- 验收：输入内容文本，返回 SEO 评分报告

**任务 3.1.2：集成到内容生成流程**
- 文件：`backend/app/services/content_generator.py`
- 目标：生成内容后自动计算 SEO 评分，存入 `seo_score` 字段
- 验收：新生成内容有 seo_score

**任务 3.1.3：前端展示 SEO 评分**
- 文件：`frontend/src/app/(app)/content/[id]/page.tsx`
- 组件：SEO 评分卡片（圆环图 + 各维度分数 + 建议列表）
- 验收：内容详情页展示 SEO 评分

### 3.2 Kimi 引擎集成

**任务 3.2.1：添加 Kimi 适配器**
- 文件：`backend/app/services/ai_gateway.py`
- 实现：Kimi 使用 OpenAI 兼容 API
- 配置：`KIMI_API_KEY`, `KIMI_BASE_URL`, `KIMI_MODEL`
- 验收：`check_visibility("brand", "query", "kimi")` 正常返回

**任务 3.2.2：前端添加 Kimi 选项**
- 文件：`frontend/src/lib/constants.ts`
- 目标：引擎列表添加 Kimi
- 验收：下拉选择可选 Kimi

---

## 5. Phase 4：测试基线 + 部署（Week 7-8）

### 4.1 后端测试

**任务 4.1.1：认证测试补全**
- 文件：`backend/tests/test_auth.py`
- 覆盖：注册/登录/Token 过期/无效 Token
- 目标：>=80% 路由覆盖

**任务 4.1.2：品牌测试补全**
- 文件：`backend/tests/test_brands.py`
- 覆盖：CRUD / 权限检查 / 软删除

**任务 4.1.3：内容测试**
- 新文件：`backend/tests/test_content.py`
- 覆盖：生成/编辑/确认/发布/采纳查询

**任务 4.1.4：订阅测试**
- 新文件：`backend/tests/test_subscription.py`
- 覆盖：计划查询/当前订阅/功能门控/配额检查

**任务 4.1.5：用量测试**
- 文件：`backend/tests/test_usage_tracker.py`
- 覆盖：增量/查询/配额检查/历史

### 4.2 前端类型检查

**任务 4.2.1：tsc --noEmit 零错误**
- 运行 `cd frontend && npx tsc --noEmit`
- 修复所有类型错误

**任务 4.2.2：next build 成功**
- 运行 `cd frontend && npm run build`
- 修复所有构建错误

### 4.3 部署优化

**任务 4.3.1：Docker Compose 更新**
- 文件：`docker/docker-compose.yml`
- 添加 celery-worker 和 celery-beat 服务
- 验收：`docker-compose up` 所有服务正常

**任务 4.3.2：环境变量文档**
- 文件：`.env.example`
- 更新所有新增配置项
- 验收：文档完整

---

## 6. 任务依赖关系

```
Phase 1 (Week 1-2):
  1.1.1 (logger fix) ← 1.1.2 (engine refactor)
  1.1.2 (engine refactor) ← 1.1.3 (timeout/retry)
  1.2.1 (celery switch) ← 1.2.2 (cleanup)
  1.3.1 + 1.3.2 (redis audit) 独立
  1.4.1 (serp retry) 独立

Phase 2 (Week 3-4):
  2.1.1 (audit service) ← 2.1.2 (audit API) ← 2.1.3 (audit model)
  2.1.2 ← 2.2.1 (frontend page)
  2.2.1 ← 2.2.2 (frontend component)

Phase 3 (Week 5-6):
  3.1.1 (seo scorer) ← 3.1.2 (integrate) ← 3.1.3 (frontend)
  3.2.1 (kimi adapter) ← 3.2.2 (frontend)

Phase 4 (Week 7-8):
  4.1.x (tests) 独立，可并行
  4.2.1 (tsc) ← 4.2.2 (build)
  4.3.1 + 4.3.2 独立
```

---

## 7. 风险与缓解

| 风险 | 概率 | 缓解 |
|------|------|------|
| AI 引擎 API 变动 | 中 | 插件化适配器，快速替换 |
| GEO 审计准确度 | 中 | 初期仅做基础检查，迭代优化 |
| Celery 部署复杂度 | 低 | Docker Compose 一键部署 |
| 测试覆盖率不足 | 中 | 优先覆盖 P0 路由 |
| 内容 SEO 评分主观性 | 高 | 规则 + LLM 混合评分，标注置信度 |
