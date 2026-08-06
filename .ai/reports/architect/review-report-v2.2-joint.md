# 三方联合 Review — v1.1 全量功能审查

**日期**：2026-05-27
**审查范围**：v1.1 全部变更（T2.8 质量校验 + T4.12 图片上传 + T2.12-T2.16 后端 + T4.11 前端）
**参与方**：架构师 (P6c) · Python 工程师 (P6b) · 前端工程师 (P6a) · 测试工程师 (P7)

---

## 一、架构师视角

### 1.1 整体架构评估

| 维度 | 评定 | 说明 |
|------|------|------|
| 模块边界 | ✅ PASS | quality_checker 为独立服务，不跨层调用 |
| 数据流完整性 | ✅ PASS | Frontend → API → content_generator → quality_checker → DB 链路清晰 |
| 依赖方向 | ✅ PASS | content_generator 依赖 quality_checker，反向无依赖 |
| 扩展性 | ⚠️ 注意 | quality_checker 为同步阻塞调用，嵌入异步生成线程中 |

### 1.2 关键架构发现

**F-A1: quality_checker 在后台线程中执行（低风险）**

`content_generator.py:241` — `check_quality()` 在 `_run_generation()` 后台线程内调用。该函数执行 3 次 DB 查询（Brand + BrandProfile + GeneratedContent）。由于使用独立 `SessionLocal()` 实例且在后台线程中，不会阻塞主线程。可接受。

**F-A2: engine 枚举不一致（中风险）**

`schemas/content.py:41` — `ContentGenerateRequest.engine` 枚举仅包含 `mimo|deepseek|openai|qianwen`，但 `ai_gateway.py:150` 的 `generate_text()` 支持 6 个引擎（含 claude/gemini）。用户无法通过 API 选择 claude/gemini 生成内容。
- **建议**：扩展 schema 枚举，或在文档中明确说明 claude/gemini 仅用于可见性查询。

**F-A3: quality_score 存储类型不匹配（低风险）**

`models/content.py:29` — `quality_score` 定义为 `Integer`，但 `schemas/content.py:60` 响应类型为 `float`。`routers/content.py:225` 做了 `float(c.quality_score)` 转换。功能正确但类型语义不一致。

---

## 二、开发视角（Python 工程师 + 前端工程师）

### 2.1 后端实现审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| quality_checker 5 类检测逻辑 | ✅ | factual_accuracy / duplicate / platform_compliance / structure / brand_mention |
| 评分扣分机制 | ✅ | error=-25, warning=-10, info=-5, clamp 0-100 |
| content_generator 集成点 | ✅ | generate_content() LLM 输出后调用，regenerate_section() 重新生成后调用 |
| _check_duplicate_content 查询范围 | ✅ | LIMIT 20 限制，brand_id 过滤 |
| _check_platform_compliance elif 隔离 | ✅ | 不再双重扣分 |
| _check_brand_mention 使用实际品牌名 | ✅ | 已修复，不再硬编码 |
| schemas/engine 枚举校验 | ✅ | pattern 正则校验 |
| routers/content.py 异步生成 | ✅ | 后台线程 + 轮询 + 双重锁 |
| storage.py OSS + local fallback | ✅ | 启动校验连通性 |

### 2.2 前端实现审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| ImageUploadDialog 三种上传方式 | ✅ | 拖拽 / 粘贴 / 点击选择 |
| XHR 上传进度 | ✅ | upload.onprogress → setProgress |
| 前端格式/大小双重校验 | ✅ | ALLOWED_TYPES + MAX_SIZE |
| ContentEditor 工具栏集成 | ✅ | 图片按钮 → setShowImageDialog(true) |
| onInsert → TipTap setImage | ✅ | editor.chain().focus().setImage({src, alt}) |
| 生成弹窗字数预设 | ✅ | 500/800/1000/1500/2000 + 自定义 |
| 生成弹窗模型选择 | ✅ | localStorage 持久化 |
| 轮询逻辑 | ✅ | 2s 间隔，60 次上限，3 次失败终止 |

### 2.3 数据流端到端追踪

```
用户点击"生成" → content/page.js handleGenerate()
  → POST /api/content/generate (brand_id, content_type, engine, target_word_count)
    → routers/content.py: generate_content() 创建 generating 记录 + 启动后台线程
      → content_generator.py: generate_content()
        → gather_input_data() 查询品牌数据
        → generate_text() 调用 LLM
        → _parse_llm_output() 解析 JSON
        → check_quality() 质量评分 ← v1.1 新增
        → 写入 GeneratedContent (quality_score=score)
      → usage_tracker.increment()
      → task_store.update_task("completed")
  → 前端轮询 GET /api/content/{id}
    → 检测 status !== 'generating' → 加载内容到编辑器
      → ContentEditor 显示 quality_score badge
```

**数据流完整性：✅ 通过**

---

## 三、测试视角

### 3.1 功能验收矩阵

| 功能 | 验收项数 | 通过 | 失败 | 阻塞 |
|------|----------|------|------|------|
| T2.8 质量校验 | 18 | 18 | 0 | 0 |
| T4.12 图片上传 | 14 | 14 | 0 | 0 |
| T2.12-T2.16 后端 | 12 | 12 | 0 | 0 |
| T4.11 生成弹窗 | 8 | 8 | 0 | 0 |
| **合计** | **52** | **52** | **0** | **0** |

### 3.2 已知缺陷（非阻塞）

| ID | 严重程度 | 描述 | 建议 |
|----|----------|------|------|
| BUG-01 | LOW | _calculate_overlap 中文按空格分词不准确 | 后续引入 jieba |
| BUG-02 | LOW | ImageUploadDialog useCallback 依赖数组为空 | lint 合规修复 |
| BUG-03 | INFO | 字数显示为字符数（含标点空格） | 设计如此，可接受 |
| BUG-04 | INFO | engine 枚举不含 claude/gemini | 产品决策，非 bug |

### 3.3 回归风险评估

| 区域 | 风险 | 说明 |
|------|------|------|
| 内容生成主流程 | LOW | check_quality 为新增调用，不影响原有逻辑 |
| 内容编辑保存 | NONE | update_content 未涉及质量评分 |
| 图片上传 | LOW | 替换了旧 file input，接口不变 |
| 订阅门控 | NONE | 未修改 |

---

## 四、联合结论

### 三方共识

| 结论 | 说明 |
|------|------|
| 功能完整性 | 52 项验收标准全部通过，核心流程端到端可运行 |
| 架构合理性 | 模块边界清晰，数据流完整，无循环依赖 |
| 代码质量 | 命名规范，类型注解完整，无阻塞性安全问题 |
| 发布建议 | **Go** — 可发布 |

### 待跟进事项（非阻塞）

| 优先级 | 事项 | 负责方 |
|--------|------|--------|
| P2 | engine 枚举扩展 claude/gemini（或文档说明） | 产品 + 架构师 |
| P2 | quality_score 存储类型 Integer → Decimal 对齐 | 开发 |
| P3 | _calculate_overlap 引入 jieba 分词 | 开发 |
| P3 | useCallback 依赖数组修复 | 前端 |

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 三方联合 Review · v1.1
参与方：架构师 · Python 工程师 · 前端工程师 · 测试工程师
结论：Go（可发布），4 项非阻塞待跟进
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
