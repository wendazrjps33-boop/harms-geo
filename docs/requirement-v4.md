# 需求文档 · GeoRank v4.0 重构
> 版本：v4.0 | 更新：2026-08-06 | 变更：基于 v2.6/v3.0 全量复盘产出重构需求

---

## 1. MVP 摘要

在现有功能基座上，执行**结构性重构**：①消除前端双轨并行（58 个 .js + 33 个 .tsx），统一为 TypeScript 单一技术栈；②修复 v2.6 遗留架构缺陷（请求管线、任务模型、外部服务集成）；③建立自动化测试基线，使项目达到可发布状态。不新增业务功能。

---

## 2. 现状问题清单

### 2.1 前端技术债（阻塞级）

| 问题 | 影响 | 量化 |
|------|------|------|
| 58 个 .js 文件与 33 个 .tsx 文件共存 | 构建歧义，Next.js 可能加载错误文件 | 91 个页面/组件 |
| 目录结构不一致 | .js 在 `src/app/components/`，.tsx 在 `src/components/` | 2 套目录树 |
| v3.0 "迁移完成"报告与实际不符 | 决策依据失真 | — |
| 无类型定义覆盖 | API 响应 `any` 泛滥，运行时类型错误无法在编译期捕获 | 0% 类型覆盖率 |

### 2.2 后端架构缺陷（来自 R5/R6 全员评审）

| 缺陷 ID | 描述 | 严重程度 |
|---------|------|----------|
| 系统性-1 | 缺少统一请求预处理管线（认证→功能→配额未串联） | 高 |
| 系统性-2 | 后台任务执行模型分裂（threading.Thread vs 同步 vs Celery） | 高 |
| 系统性-3 | 外部服务无集成规范（SERP/LLM 调用无重试/降级/超时标准） | 高 |
| BUG-V26-07 | regenerate_section 同步阻塞，与 generate 异步模式不一致 | 高 |
| BUG-V26-14 | Stripe Webhook 无 event_id 幂等去重 | 高 |
| BUG-V26-15 | Redis key 无 TTL，内存泄漏风险 | 高 |
| BUG-V26-08 | _generation_locks 字典无限增长 | 中 |
| BUG-V26-13 | JSON 解析依赖 str.index("{") 脆弱 | 中 |

### 2.3 测试债务

| 问题 | 现状 | 目标 |
|------|------|------|
| 自动化测试覆盖 | 18 个用例，仅覆盖 auth/brands/usage | P0 路径 100% 覆盖 |
| 前端测试 | 0 | 核心组件 + 页面冒烟测试 |
| 首次 QA 通过率 | 13.8%（v2.6） | ≥80% |

---

## 3. 用户角色（本次无变化）

沿用 v2.6 定义的 4 个角色。本次重构不引入新角色。

---

## 4. 用户故事

### 4.1 开发者体验（新增）

**US-DEV-01** 作为前端开发者，我希望整个代码库使用统一的 TypeScript 技术栈，以便 IDE 能提供准确的类型提示和编译期错误检查。
- [ ] 所有 .js 文件被 .ts/.tsx 替代，无 .js/.jsx 文件残留
- [ ] `tsconfig.json` 配置 `strict: true`
- [ ] `tsc --noEmit` 零错误

**US-DEV-02** 作为后端开发者，我希望请求处理遵循统一管线（认证→功能门控→配额检查→业务逻辑），以便新增接口时不需要手动串联横切关注点。
- [ ] 新增 `require_feature_with_quota` 组合依赖
- [ ] 所有需鉴权路由使用该组合依赖
- [ ] 管线各阶段日志输出统一格式

**US-DEV-03** 作为后端开发者，我希望后台任务统一通过 Celery 执行，不再存在 threading.Thread 或同步阻塞调用。
- [ ] regenerate_section 改为 Celery task
- [ ] _generation_locks 迁移至 Redis（SETNX + TTL）
- [ ] 所有长时间运行操作返回 task_id + 202

**US-DEV-04** 作为开发者，我希望核心路径有自动化测试覆盖，以便重构时能快速验证不引入回归。
- [ ] 后端：P0 接口 pytest 覆盖率 ≥80%
- [ ] 前端：核心页面 React Testing Library 冒烟测试
- [ ] CI 中测试失败阻断合并

### 4.2 现有业务故事（沿用，无变更）

沿用 v2.6 需求文档 §4.2 ~ §4.9 的全部用户故事，本次重构不修改业务逻辑，仅修复架构层面缺陷使其正确实现已有故事。

---

## 5. 功能需求

### 5.1 前端统一化

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| FR-FE-01 | 删除所有 .js/.jsx 源文件 | `find frontend/src -name "*.js" -o -name "*.jsx"` 返回空 |
| FR-FE-02 | 统一目录结构 | 页面文件在 `src/app/`，组件在 `src/components/`，无重复目录 |
| FR-FE-03 | 类型定义完整 | `src/types/` 覆盖所有 API 请求/响应，无 `any` 类型 |
| FR-FE-04 | `tsconfig.json` strict 模式 | `tsc --noEmit` 零错误 |
| FR-FE-05 | 构建验证 | `next build` 成功，无 TypeScript 编译错误 |

### 5.2 后端请求管线统一

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| FR-BE-01 | 组合依赖 `require_feature_with_quota` | 单个 Depends 完成功能+配额双重检查 |
| FR-BE-02 | 所有需鉴权路由使用统一管线 | 手动调用 `require_feature` 的路由数 = 0 |
| FR-BE-03 | Stripe Webhook 幂等 | `webhook_events` 表 + `event_id` 唯一约束，重复事件返回 200 不处理 |
| FR-BE-04 | Redis key TTL 全覆盖 | 所有 Redis key 有显式 TTL，无永不过期的业务 key |

### 5.3 后台任务统一

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| FR-TASK-01 | regenerate 改为 Celery task | POST regenerate 返回 task_id + 202 |
| FR-TASK-02 | 生成锁迁移至 Redis | 使用 `redis.set(key, 1, nx=True, ex=300)` |
| FR-TASK-03 | _generation_locks 字典清零 | 代码中无 `_generation_locks` 变量 |
| FR-TASK-04 | JSON 解析健壮性 | 使用 `json.JSONDecoder.raw_decode` 替代 `str.index` |

### 5.4 外部服务集成规范

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| FR-EXT-01 | SERP 网关统一 | 所有 SERP 查询通过 `serp_gateway.py`，无直接 HTTP 调用 |
| FR-EXT-02 | LLM 调用超时 | 所有 LLM 调用配置 `timeout=30s` + 最多 2 次重试 |
| FR-EXT-03 | 降级策略 | 主引擎失败自动切换备用引擎，记录降级日志 |

### 5.5 测试基线

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| FR-TEST-01 | 后端 P0 接口测试 | auth/brands/content/subscription/usage 路由 pytest 覆盖 |
| FR-TEST-02 | 前端冒烟测试 | 核心页面（dashboard/brands/content）渲染不崩溃 |
| FR-TEST-03 | CI 集成 | `pytest` + `tsc --noEmit` 在 pre-commit 或 CI 中执行 |

---

## 6. 非功能需求

| 维度 | 指标 | 当前值 | 目标值 |
|------|------|--------|--------|
| 类型安全 | TypeScript strict 错误数 | 未启用 | 0 |
| 测试覆盖 | 后端 P0 路由覆盖率 | ~15%（18 用例） | ≥80% |
| 构建时间 | `next build` | 未验证 | <60s |
| 代码一致性 | .js 文件残留数 | 58 | 0 |
| 任务可靠性 | 后台任务丢失率 | 不可测（threading） | 0（Celery 持久化） |
| Redis 内存 | key 泄漏风险 | 存在 | 0（全量 TTL） |

---

## 7. 优先级与范围

### P0 — 必须完成（阻塞发布）

1. **前端 .js 文件清理** — 删除 58 个 .js 文件，确保 .tsx 版本功能完整
2. **统一请求管线** — `require_feature_with_quota` 组合依赖
3. **Stripe Webhook 幂等** — 防止重复扣费
4. **Redis TTL 修复** — 防止内存泄漏
5. **后台任务统一** — regenerate 改 Celery，锁迁移 Redis

### P1 — 尽快完成

6. **JSON 解析修复** — 替代脆弱的字符串截取
7. **外部服务超时/重试** — LLM + SERP 调用规范化
8. **后端 P0 测试** — pytest 覆盖核心路径
9. **tsconfig strict** — 启用并修复所有类型错误

### P2 — 计划内

10. **前端冒烟测试** — React Testing Library
11. **CI 集成** — pre-commit / GitHub Actions
12. **编辑器统一** — 拆分 TipTapEditor 内核 + 业务壳
13. **错误处理统一** — useErrorHandler Hook

### MVP 边界

**包含：** 以上 P0 + P1 全部项。
**不包含：** 新业务功能、白标、API 开放平台、团队管理增强。

---

## 8. 待解决问题与风险

| 编号 | 问题 | 风险等级 | 决策要求 |
|------|------|----------|----------|
| Q1 | .tsx 文件与 .js 文件功能是否完全对等？需逐文件 diff 确认 | 高 | 开发前逐一比对 |
| Q2 | `src/app/components/` vs `src/components/` 目录结构选哪个？ | 中 | 架构师决策 |
| Q3 | Celery worker 部署复杂度增加，Docker Compose 需更新 | 低 | DevOps 配合 |
| Q4 | v3.0 声称的后端修复（API Key DB 化、Celery 迁移等）是否实际生效？需代码验证 | 高 | 开发前代码审计 |

---

## 9. 与历史版本的关系

| 版本 | 状态 | 说明 |
|------|------|------|
| v1.0 | 已发布 | 核心功能基线 |
| v2.6 | 已修复 | 15 项缺陷修复通过，No-Go→Go |
| v3.0 | 文档完成，代码未验证 | 进度报告声称 95%，但前端双轨问题未解决 |
| **v4.0** | **本次** | 结构性重构，不加新功能，解决根本性技术债 |

---

## 10. 验收标准总览

- [ ] 前端零 .js/.jsx 文件
- [ ] `tsc --noEmit` 零错误
- [ ] `next build` 成功
- [ ] 后端无 `require_feature` 单独调用（全部使用组合依赖）
- [ ] 无 `threading.Thread` 用于业务逻辑
- [ ] Redis 所有 key 有 TTL
- [ ] Stripe Webhook 有幂等保护
- [ ] 后端 P0 路由 pytest 覆盖率 ≥80%
- [ ] `pytest` 全部通过
