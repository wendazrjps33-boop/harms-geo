# 代码评审报告 -- v2.1 异步内容生成

**日期**：2026-05-26
**评审范围**：内容生成超时修复 — 同步阻塞改为 Fire-and-Poll 异步模式
**评审视角**：架构师

---

## 1. 变更概述

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/app/task_store.py` | 新建 | 内存任务注册表 (dict + Lock) |
| `backend/app/routers/content.py` | 修改 | POST /generate 异步返回 + 后台线程 + 双重提交锁 |
| `backend/app/services/content_generator.py` | 修改 | generate_content() 增加 content_id 参数 |
| `backend/app/services/ai_gateway.py` | 修改 | generate_text() 增加 timeout 参数 |
| `backend/app/main.py` | 修改 | 启动时清理 stale generating 行 |
| `backend/app/schemas/content.py` | 修改 | ContentStatus 增加 GENERATING/FAILED |
| `frontend/nginx.conf` | 修改 | proxy_read_timeout 300s |
| `frontend/src/app/brands/[id]/content/page.js` | 修改 | 轮询逻辑 + 生成中/失败 UI |

---

## 2. 评审结果

### 2.1 规范符合性

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 命名规范 | PASS | snake_case 变量、PascalCase 组件 |
| 异步模式 | PASS | 后台线程自建 SessionLocal，匹配 scheduler.py 模式 |
| 类型注解 | PASS | task_store.py 函数签名完整 |
| DI 使用 | PASS | 路由依赖注入未变 |

### 2.2 结构评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 分层边界 | PASS | 路由层仅做 HTTP 处理，业务逻辑在 content_generator |
| 耦合 | PASS | task_store 为独立模块，无循环依赖 |
| 向后兼容 | PASS | generate_content() 的 content_id 参数可选，不影响现有调用 |

### 2.3 性能风险

| 风险 | 等级 | 说明 |
|------|------|------|
| 内存 task_store 累积 | LOW | MVP 阶段可接受，每日生成量有限 |
| AI SDK timeout 120s | LOW | 合理上限，后台线程不会无限阻塞 |
| 轮询 2s 间隔 | LOW | 每次轮询是轻量 GET 请求 |

### 2.4 接口完整性

| 接口 | 状态 | 说明 |
|------|------|------|
| POST /generate | CHANGED | 202 返回 content_id + status，行为正确 |
| GET /content/{id} | ENHANCED | 新增 is_generating 字段 |
| 409 防重复 | NEW | Lock + DB 双重检查 |

### 2.5 安全发现

无新增安全问题。CSRF 中间件对 POST 生效，JWT 认证未变。

### 2.6 遗留风险（已知限制）

| 编号 | 等级 | 描述 | 缓解措施 |
|------|------|------|----------|
| R1 | INFO | Gemini 引擎无 SDK 级 timeout | daemon 线程随进程退出 |
| R2 | INFO | task_store 为进程级，多 worker 不共享 | MVP 单 worker 部署 |
| R3 | INFO | daemon 线程被 SIGTERM 杀死时 finally 不保证执行 | 启动时 cleanup 兜底 |

---

## 3. 文档同步更新

| 文档 | 更新内容 |
|------|----------|
| `.ai/temp/architect.md` | 内容生成流改为异步模式，新增 task_store 模块 |
| `.ai/temp/api-contract.md` | POST /generate 响应增加 content_id/状态，新增 409 错误 |
| `.ai/temp/db-design.md` | status 字段 COMMENT 增加 generating/failed |
| `.ai/temp/plan.md` | 新增 T2.17 异步内容生成任务 |

---

## 4. 需通知的角色

| 角色 | 通知内容 |
|------|----------|
| **前端工程师** | handleGenerate 改为轮询模式，需了解 startPolling 机制和页面刷新恢复逻辑 |
| **后端工程师** | content_generator.generate_content() 新增 content_id 参数，后台线程自建 Session |
| **测试工程师** | 新增 generating/failed 状态测试用例，轮询超时和网络错误场景 |
| **DevOps** | nginx.conf 增加 proxy_read_timeout 300s，需部署时同步更新 |

---

## 5. 结论

**PASS — 可进入 QA 阶段**

所有阻塞项已修复（B1 双重提交锁、B2 用量扣费移至成功路径、B4 页面刷新恢复轮询、W5 网络错误容忍）。架构变更文档已同步更新。
