# GeoRank v5.0 重构总结

> 版本：v5.0 | 日期：2026-08-07

---

## 1. 重构目标

从市场需求出发重构 GeoRank 项目，聚焦差异化竞争力，砍掉低优先级功能，建立可执行的 MVP 路线图。

---

## 2. 市场分析结论

### 2.1 竞品格局

| 产品 | 价格 | 核心能力 | 弱点 |
|------|------|----------|------|
| Otterly.ai | $29-$489/月 | AI 搜索监控、Crawlability Audit | 无中文引擎、无内容生成 |
| Profound | 企业定制 | 深度分析 | 高门槛 |
| AthenaHQ | 免费起 | AI 搜索追踪 | 功能浅 |
| Brandlight | $99+/月 | 多引擎监控 | 无中国市场适配 |

### 2.2 GeoRank 差异化护城河

1. **国产 AI 引擎支持** — DeepSeek / 通义千问 / MiMo / Kimi（竞品全部缺失）
2. **中文平台内容分发** — 知乎 / 小红书 / 公众号 / B站（竞品全部缺失）
3. **内容生成 + 分发闭环** — 监控 → 生成 → 分发 → 验证（竞品仅监控）
4. **GEO 审计能力** — 对标 Otterly 的 Crawlability Audit

### 2.3 定价调整

| 计划 | 旧价格 | 新价格 | 对标 Otterly |
|------|--------|--------|-------------|
| Free | $0 | $0 | 入门体验 |
| Pro | $49/月 | $39/月 | 对标 Otterly $29，但含内容生成 |
| Agency | $199/月 | $149/月 | 性价比更优 |

---

## 3. 技术债审计结果

### 3.1 已解决（v4.0 完成）

| 问题 | 状态 |
|------|------|
| 前端 .js/.jsx 残留 | ✅ 已全部 .tsx |
| 后端请求管线统一 | ✅ require_feature_with_quota 已实现 |
| Stripe Webhook 幂等 | ✅ webhook_events 表已实现 |
| JSON 解析健壮性 | ✅ _parse_llm_output 已用 raw_decode |
| 生成锁迁移 Redis | ✅ content.py 已用 Redis SETNX |
| Celery 异步任务 | ✅ 核心任务已迁移 |

### 3.2 待修复（v5.0 计划）

| 问题 | 优先级 | 计划 |
|------|--------|------|
| ai_gateway.py 缺 logger 定义 | 🔴 P0 | Phase 1 Week 1 |
| AI 引擎硬编码（6 个重复函数） | ⚠️ P1 | Phase 1 Week 1 |
| regenerate_section 仍同步 | ⚠️ P1 | Phase 1 Week 1 |
| check_visibility 无超时/重试 | ⚠️ P1 | Phase 1 Week 1 |
| Redis TTL 全量审计 | ⚠️ P1 | Phase 1 Week 2 |
| 后端测试覆盖 ~15% → ≥60% | ⚠️ P1 | Phase 4 |

---

## 4. 架构变更

### 4.1 AI 引擎插件化

**旧架构：** 6 个硬编码函数 `query_openai()` / `query_claude()` / ... + `_call_llm()` 内大量 if-elif

**新架构：**
- `EngineAdapter` 协议 + `OpenAIAdapter` / `ClaudeAdapter` / `GeminiAdapter`
- `ENGINE_REGISTRY` 注册表，动态查找引擎
- 统一超时/重试/日志

### 4.2 GEO 审计服务（新增）

- `crawlability_audit.py`：检查 robots.txt / llms.txt / JSON-LD / 可爬取性评分
- `POST /api/audit/crawlability` API
- 前端审计结果页面

### 4.3 内容 SEO 评分（新增）

- `content_seo_scorer.py`：规则 + LLM 混合评分
- 集成到内容生成流程
- 前端评分展示组件

### 4.4 Kimi 引擎（新增）

- 第 7 个 AI 引擎，使用 OpenAI 兼容 API
- 配置项：KIMI_API_KEY / KIMI_BASE_URL / KIMI_MODEL

---

## 5. MVP 范围定义

### 包含（P0 + P1）

- 6 大 AI 引擎可见性监控
- 品牌管理 + 查询词管理
- 4 种内容类型生成 + TipTap 编辑
- 内容分发指南（知乎/小红书/公众号）
- 采纳效果追踪（平台收录 + AI 引用）
- Stripe 订阅 + Add-on + 功能门控
- GEO 审计能力（robots.txt / llms.txt / JSON-LD）
- 内容 SEO 评分
- Kimi 引擎集成
- 后端测试覆盖 ≥60%

### 不包含（P2）

- 团队管理 UI
- 白标报告
- API 开放访问
- 虚拟滚动 / 性能优化
- 前端测试
- CI/CD 集成
- LinkedIn / Twitter / 抖音 / 快手

---

## 6. 文档清单

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求文档 | `.ai/temp/requirement.md` | 市场驱动的功能需求 + 优先级 |
| 架构设计 | `.ai/temp/architect.md` | 系统架构 + AI 引擎重构方案 |
| 数据库设计 | `.ai/temp/db-design.md` | 全部表结构 + Redis Key 规范 |
| API 设计 | `.ai/temp/api-contract.md` | 全部端点 + 请求/响应格式 |
| UI 设计 | `.ai/temp/ui-design.md` | 设计系统 + 页面规范 + 组件清单 |
| 任务分解 | `.ai/temp/wbs.md` | 4 阶段可执行任务列表 |
| 重构总结 | `REFACTORING_SUMMARY.md` | 本文档 |

---

## 7. 执行时间线

```
Week 1-2: Phase 1 — 技术债修复 + 后端加固
  - 修复 ai_gateway.py Bug + 引擎插件化
  - regenerate_section 切换 Celery
  - Redis TTL 审计
  - 外部服务超时/重试

Week 3-4: Phase 2 — GEO 审计能力
  - crawlability_audit 服务 + API
  - 前端审计页面

Week 5-6: Phase 3 — 内容 SEO + Kimi
  - content_seo_scorer 服务
  - Kimi 引擎集成
  - 前端评分展示

Week 7-8: Phase 4 — 测试基线 + 部署
  - 后端 P0 测试覆盖 ≥60%
  - tsc + build 验证
  - Docker Compose 更新
