# 缺陷跟踪列表 · GeoRank 商业化 MVP

## 测试环境

- 后端：Python 3.11 + FastAPI + MySQL
- 前端：React 18 + Next.js 14
- 数据库：MySQL 8.0
- Redis：7.0

---

## 缺陷列表

### BUG-01 内容列表 N+1 查询

| 项目 | 内容 |
|------|------|
| ID | BUG-01 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 创建多个品牌 <br> 2. 为每个品牌生成内容 <br> 3. 访问 GET /api/content |
| 期望行为 | 单次查询获取所有品牌信息 |
| 实际行为 | 每个内容项单独查询品牌信息，造成 N+1 查询 |
| 关联文件 | backend/app/routers/content.py:106 |
| 状态 | ✅ 已修复 |

### BUG-02 CSRF 保护缺失

| 项目 | 内容 |
|------|------|
| ID | BUG-02 |
| 严重程度 | 高 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 不携带 CSRF token <br> 2. 调用 POST /api/brands |
| 期望行为 | 返回 403 错误 |
| 实际行为 | 请求成功，无 CSRF 保护 |
| 关联文件 | backend/app/main.py |
| 状态 | ✅ 已修复 |

### BUG-03 内容生成未使用异步任务

| 项目 | 内容 |
|------|------|
| ID | BUG-03 |
| 严重程度 | 低 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 调用 POST /api/content/generate <br> 2. 等待响应 |
| 期望行为 | 立即返回 task_id，后台异步处理 |
| 实际行为 | 同步等待 LLM 生成完成，响应时间长 |
| 关联文件 | backend/app/routers/content.py:42 |
| 状态 | ✅ 已修复（改为 threading.Thread + task_store，返回 202 Accepted，前端轮询 task_id） |

### BUG-04 前端未使用 TypeScript

| 项目 | 内容 |
|------|------|
| ID | BUG-04 |
| 严重程度 | 低 |
| 测试环境 | 前端 |
| 复现步骤 | 查看前端代码 |
| 期望行为 | 使用 TypeScript 提供类型安全 |
| 实际行为 | 使用 JavaScript，无类型检查 |
| 关联文件 | frontend/src/ |
| 状态 | ⚠️ 已知限制 |

### BUG-05 大数据量列表未使用虚拟滚动

| 项目 | 内容 |
|------|------|
| ID | BUG-05 |
| 严重程度 | 低 |
| 测试环境 | 前端 |
| 复现步骤 | 1. 创建大量内容 <br> 2. 访问内容列表页面 |
| 期望行为 | 使用虚拟滚动优化性能 |
| 实际行为 | 渲染所有列表项，可能造成性能问题 |
| 关联文件 | frontend/src/app/brands/[id]/content/page.js |
| 状态 | ⚠️ 已知限制 |

---

## v1.1 缺陷（内容生成优化）

### BUG-06 损坏图片上传导致 500

| 项目 | 内容 |
|------|------|
| ID | BUG-06 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 上传一个损坏的图片文件（如将 .txt 改为 .jpg） <br> 2. content_type 通过校验 <br> 3. `Image.open()` 抛出 `PIL.UnidentifiedImageError` |
| 期望行为 | 返回 400 错误，提示图片格式异常 |
| 实际行为 | 未捕获异常，FastAPI 返回 500 |
| 关联文件 | `backend/app/services/thumbnail.py:6`、`backend/app/routers/upload.py:38` |
| 状态 | ✅ 已修复（try/except 包裹，thumbnail_url=null） |

### BUG-07 生成后 selectedContent 设为数字 ID

| 项目 | 内容 |
|------|------|
| ID | BUG-07 |
| 严重程度 | 高 |
| 测试环境 | 前端 |
| 复现步骤 | 1. 生成新内容 <br> 2. `setSelectedContent(response.data.content_id)` 设为数字 |
| 期望行为 | selectedContent 应为内容对象 |
| 实际行为 | ContentEditor 收到数字，属性全为 undefined，编辑器空白 |
| 关联文件 | `frontend/src/app/brands/[id]/content/page.js:93` |
| 状态 | ✅ 已修复（改为 `contentAPI.getById(newId)` 获取完整对象） |

### BUG-08 upload.py 缩略图生成无异常处理

| 项目 | 内容 |
|------|------|
| ID | BUG-08 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 上传格式正确但内容异常的图片，`generate_thumbnail()` PIL 操作失败 |
| 期望行为 | 捕获异常，跳过缩略图或返回 400 |
| 实际行为 | 异常传播到 FastAPI，返回 500 |
| 关联文件 | `backend/app/routers/upload.py:38` |
| 状态 | ✅ 已修复（与 BUG-06 同一修复） |

### ISSUE-06 characterCount 扩展引用但未安装

| 项目 | 内容 |
|------|------|
| ID | ISSUE-06 |
| 严重程度 | 低 |
| 测试环境 | 前端 |
| 复现步骤 | 查看 `ContentEditor.js:79` — `editor.storage.characterCount?.characters?.()` |
| 期望行为 | 使用已安装扩展获取字符数 |
| 实际行为 | 扩展未安装，走 fallback `getText().length`。功能正常但为无效代码 |
| 关联文件 | `frontend/src/app/components/ContentEditor.js:79` |
| 状态 | ⚠️ 已知限制 |

### ISSUE-07 TipTap 无拖拽/粘贴上传

| 项目 | 内容 |
|------|------|
| ID | ISSUE-07 |
| 严重程度 | 低 |
| 测试环境 | 前端 |
| 复现步骤 | 拖拽/粘贴图片到编辑器 |
| 期望行为 | 自动触发上传 |
| 实际行为 | 无响应，仅工具栏按钮可上传 |
| 关联文件 | `frontend/src/app/components/ContentEditor.js` |
| 状态 | ⚠️ 已知限制（v1.1 范围外） |

---

## v2.3 缺陷（Engine 分级）

### BUG-01-v23 localStorage 降级残留

| 项目 | 内容 |
|------|------|
| ID | BUG-01-v23 |
| 严重程度 | 低 |
| 测试环境 | 前端 |
| 复现步骤 | 1. Agency 用户选择 claude 引擎 <br> 2. 降级为 Pro <br> 3. 重新加载页面 |
| 期望行为 | 引擎自动回退为 mimo |
| 实际行为 | localStorage 残留 claude，页面加载后 useEffect 校验 availableModels 并回退 mimo，清除旧值 |
| 关联文件 | `frontend/src/app/(app)/brands/[id]/content/page.js:83-91` |
| 状态 | ✅ 已修复（useEffect 依赖 userPlan + availableModels，降级时自动回退并清除 localStorage） |

---

## v2.2 QA 遗留缺陷

### BUG-V22-01 中文分词按空格分割

| 项目 | 内容 |
|------|------|
| ID | BUG-V22-01 |
| 严重程度 | 低 |
| 测试环境 | 后端 |
| 复现步骤 | 生成两个标题，中文词汇相同但顺序不同（无空格分隔） |
| 期望行为 | 识别为相似标题 |
| 实际行为 | `_calculate_overlap` 按空格分割，中文无空格时整个标题为一个 token，相似度计算不准确 |
| 关联文件 | `backend/app/services/quality_checker.py:160` |
| 状态 | ⚠️ 已知限制（中文分词需引入 jieba 等库，MVP 阶段可接受） |

### BUG-V22-02 ImageUploadDialog useCallback 依赖数组

| 项目 | 内容 |
|------|------|
| ID | BUG-V22-02 |
| 严重程度 | 低 |
| 测试环境 | 前端 |
| 复现步骤 | 查看 ImageUploadDialog.js lint 输出 |
| 期望行为 | 所有 useCallback 依赖数组完整 |
| 实际行为 | handleDragOver/handleDragLeave 依赖数组为空 []，但回调内仅调用 preventDefault 和 setState（稳定引用），无外部依赖 |
| 关联文件 | `frontend/src/app/components/ImageUploadDialog.js:65-73` |
| 状态 | ✅ 已验证无风险（空依赖数组正确，回调内无外部可变依赖） |

### BUG-V22-03 字数统计为字符数而非中文字数

| 项目 | 内容 |
|------|------|
| ID | BUG-V22-03 |
| 严重程度 | 信息 |
| 测试环境 | 前端 |
| 复现步骤 | 编辑含中文标点和空格的内容，查看字数统计 |
| 期望行为 | 仅统计中文字数（不含标点空格） |
| 实际行为 | 使用 `getText().length` 统计所有字符（含标点、空格、英文） |
| 关联文件 | `frontend/src/app/components/ContentEditor.js:76` |
| 状态 | ⚠️ 设计如此（当前统计方式对中英文混合内容更直观，若需精确中文字数需引入分词库） |

---

## QA 遗留缺陷评估报告 · 2026-06-04

### 评估结论

| 分类 | 数量 | 说明 |
|------|------|------|
| 实际已修复（列表未更新） | 2 | BUG-03 同步生成、BUG-V22-02 useCallback |
| 已知限制（可接受） | 6 | 均为 LOW/INFO 级别，不影响核心功能 |
| 需关注 | 0 | 无阻塞项 |

### 逐项评估

| ID | 描述 | 用户影响 | 修复成本 | 建议 |
|----|------|----------|----------|------|
| BUG-03 | 同步生成 | ✅ 已修复 | — | 更新标记 |
| BUG-V22-02 | useCallback 空依赖 | ✅ 已修复 | — | 更新标记 |
| BUG-04 | 前端未用 TypeScript | 无用户影响 | 高（全量迁移） | P2 技术债，不阻塞 |
| BUG-05 | 无虚拟滚动 | 数据量 <100 时无感 | 中 | P2，数据量增长时再处理 |
| ISSUE-06 | characterCount 未安装 | 无影响（fallback 正常） | 低（安装 + 配置） | P2 代码清理 |
| ISSUE-07 | 无拖拽/粘贴上传 | 仅工具栏上传 | 中 | P2 功能增强 |
| BUG-V22-01 | 中文分词不准确 | 去重误判率低 | 低（引入 jieba） | P2 质量提升 |
| BUG-V22-03 | 字数含标点空格 | 统计偏差 ~10-15% | 低 | 设计决策，非 Bug |

### 最终判定

**Go（可发布）** — 所有遗留项均为 LOW/INFO 级别，不影响 MVP 核心功能和用户体验。建议纳入 P2 迭代计划统一处理。

---

## v2.6 回归测试缺陷（2026-06-05）

### BUG-V26-01 采纳检测只执行一次，无法跟踪时间变化

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-01 |
| 严重程度 | 高 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 发布内容 <br> 2. 等待 3 天触发首次检测 <br> 3. 等待 7 天 <br> 4. 检查是否触发第二次检测 |
| 期望行为 | 发布后第 3/7/14/30 天各执行一次检测 |
| 实际行为 | `run_adoption_checks` 内部去重逻辑只检查是否存在同类检查记录，导致每篇内容只检测一次 |
| 关联文件 | `backend/app/services/adoption_verifier.py:147-154` |
| 状态 | ❌ 待修复 |

### BUG-V26-02 配额检查在生成之后执行，用户可绕过配额

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-02 |
| 严重程度 | 高 |
| 测试环境 | 后端 |
| 复现步骤 | 1. Free 用户（内容生成配额已用完） <br> 2. 调用 POST /api/content/generate <br> 3. 请求成功返回 202 |
| 期望行为 | 返回 403 配额超限错误 |
| 实际行为 | `require_feature` 检查功能权限，但未使用 `require_quota("content")` 检查用量配额，配额检查在 `_run_generation` 之后执行 |
| 关联文件 | `backend/app/routers/content.py:37-84` |
| 状态 | ❌ 待修复 |

### BUG-V26-03 平台收录检测直接抓取 Google，违反 ToS

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-03 |
| 严重程度 | 高 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 发布内容 <br> 2. 触发平台收录检测 <br> 3. 检查日志 |
| 期望行为 | 使用 Google Search API 或其他合规方式检测 |
| 实际行为 | 直接 HTTP 抓取 Google 搜索结果页面，违反 Google ToS，可能被 IP 封禁 |
| 关联文件 | `backend/app/services/adoption_verifier.py:24` |
| 状态 | ❌ 待修复 |

### BUG-V26-04 query/check 维度配额硬编码为无限

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-04 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 查看 `_get_plan_limits` 函数 <br> 2. 检查 query 和 check 维度 |
| 期望行为 | 按计划配置限制查询词和检查次数 |
| 实际行为 | 硬编码为 -1（无限），Free 计划"查询词/品牌 5"的限制从未生效 |
| 关联文件 | `backend/app/services/usage_tracker.py:25-26` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-05 AdoptionCheck 创建时未设置 days_after_publish

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-05 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 触发采纳检测 <br> 2. 检查数据库记录 |
| 期望行为 | days_after_publish 字段正确设置（3/7/14/30） |
| 实际行为 | 创建 AdoptionCheck 时未设置该字段，模型定义 nullable=False，可能 DB 插入失败 |
| 关联文件 | `backend/app/services/adoption_verifier.py:30-40, 60-75, 100-115` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-06 publish 端点允许重复发布

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-06 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 发布内容（状态变 published） <br> 2. 再次调用 POST /api/content/{id}/publish |
| 期望行为 | 返回 400 错误，提示内容已发布 |
| 实际行为 | 仅更新 updated_at，不报错，可能重复创建 ContentDistribution 记录 |
| 关联文件 | `backend/app/routers/content.py:471-472` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-07 regenerate_section 是同步阻塞调用

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-07 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 调用 POST /api/content/{id}/regenerate <br> 2. 等待 LLM 响应 |
| 期望行为 | 立即返回 task_id，后台异步处理（与 generate 一致） |
| 实际行为 | 同步等待 LLM 完成，阻塞 HTTP 请求，LLM 响应慢时用户体验差 |
| 关联文件 | `backend/app/services/content_generator.py:regenerate_section` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-08 _generation_locks 字典无限增长

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-08 |
| 严重程度 | 低 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 多个用户+品牌组合调用生成 <br> 2. 检查内存 |
| 期望行为 | Lock 对象有 TTL 或 LRU 淘汰 |
| 实际行为 | 每个 (user_id, brand_id) 组合创建 Lock，永不清理 |
| 关联文件 | `backend/app/routers/content.py:37` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-09 两套编辑器体系并存，图片上传方式不统一

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-09 |
| 严重程度 | 中 |
| 测试环境 | 前端 |
| 复现步骤 | 1. 打开 /content/[id] 使用 TipTapEditor <br> 2. 点击图片按钮 <br> 3. 打开 /brands/[id]/content 使用 ContentEditor <br> 4. 点击图片按钮 |
| 期望行为 | 两处使用统一的图片上传组件 |
| 实际行为 | TipTapEditor 用 window.prompt() 输入 URL，ContentEditor 用 ImageUploadDialog 拖拽上传 |
| 关联文件 | `frontend/src/app/components/TipTapEditor.js:141`, `frontend/src/app/components/ContentEditor.js` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-10 订阅页面 billing_cycle 硬编码为 monthly

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-10 |
| 严重程度 | 中 |
| 测试环境 | 前端 |
| 复现步骤 | 1. 访问 /subscription <br> 2. 尝试选择年付 |
| 期望行为 | 用户可选择月付/年付，年付享 8 折 |
| 实际行为 | handleUpgrade 硬编码 billing_cycle: 'monthly'，UI 显示年付折扣但无法选择 |
| 关联文件 | `frontend/src/app/(app)/subscription/page.js:49` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-11 采纳数据展示三处不一致

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-11 |
| 严重程度 | 低 |
| 测试环境 | 前端 |
| 复现步骤 | 1. 查看 AdoptionTimeline.js <br> 2. 查看 content/[id]/page.js 内联 AdoptionPanel <br> 3. 查看 brands/[id]/content/[contentId]/adoption/page.js |
| 期望行为 | 使用统一的采纳数据展示组件 |
| 实际行为 | 三处展示方式不一致，存在代码重复 |
| 关联文件 | `frontend/src/app/components/AdoptionTimeline.js`, `frontend/src/app/(app)/content/[id]/page.js:502` |
| 状态 | ⚠️ 已知限制 |

### BUG-V26-12 错误处理模式不统一

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-12 |
| 严重程度 | 低 |
| 测试环境 | 前端 |
| 复现步骤 | 1. 触发各页面错误 <br> 2. 检查错误展示方式 |
| 期望行为 | 统一使用 setError + UI 展示 |
| 实际行为 | 部分用 setError+UI，部分用 console.error，部分用 alert() |
| 关联文件 | 多个前端组件 |
| 状态 | ⚠️ 已知限制 |

### BUG-V26-13 JSON 解析依赖 str.index("{") 方式脆弱

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-13 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 1. LLM 返回 "以下是结果：{...}" 格式 <br> 2. 检查 JSON 解析结果 |
| 期望行为 | 正确提取 JSON 对象 |
| 实际行为 | str.index("{") 会匹配到自然语言中的 `{`，导致截取错误 |
| 关联文件 | `backend/app/services/content_generator.py:_parse_llm_output` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-14 Webhook 缺少幂等性处理

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-14 |
| 严重程度 | 中 |
| 测试环境 | 后端 |
| 复现步骤 | 1. Stripe 重发 checkout.session.completed 事件 <br> 2. 检查订阅记录 |
| 期望行为 | 幂等处理，不重复创建记录 |
| 实际行为 | 虽有 existing 检查，但竞态条件下可能重复创建 |
| 关联文件 | `backend/app/services/billing.py:_handle_checkout_completed` |
| 状态 | ⚠️ 待修复 |

### BUG-V26-15 Redis key 无 TTL，usage_sync_to_db 未被调用

| 项目 | 内容 |
|------|------|
| ID | BUG-V26-15 |
| 严重程度 | 低 |
| 测试环境 | 后端 |
| 复现步骤 | 1. 使用一段时间 <br> 2. 检查 Redis key 数量 <br> 3. 检查 UsageRecord 表 |
| 期望行为 | Redis key 有 TTL，UsageRecord 定期同步 |
| 实际行为 | Redis key 永不过期，sync_to_db 函数未被调用 |
| 关联文件 | `backend/app/services/usage_tracker.py:57`, `backend/app/services/usage_tracker.py:sync_to_db` |
| 状态 | ⚠️ 待修复 |
