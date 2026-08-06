# 全员代码评审报告 · v2.0

**评审日期**：2026-05-26
**评审范围**：v1.1 内容生成优化 — 后端 10 文件 + 前端 3 文件
**评审依据**：api-contract.md、architect.md、architect_constraint.md

---

## 一、架构师视角

### 结构评估
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 模块职责 | ✅ | storage.py（存储抽象）、thumbnail.py（图片处理）、upload.py（HTTP 端点）职责单一 |
| 分层边界 | ✅ | Router → Service → Model 无跨层调用 |
| 依赖注入 | ✅ | upload.py 使用 Depends(require_feature("content_generation")) |

### 性能风险
| 风险 | 严重度 | 说明 |
|------|--------|------|
| 同步存储 I/O 阻塞事件循环 | 低 | storage.upload() 是同步调用，上传大文件时阻塞。MVP 可接受 |
| ai_gateway 每次创建 OpenAI client | 低 | generate_text() 每次调用 new OpenAI()。可缓存但影响不大 |
| OSS client 已缓存 | ✅ | get_storage() 使用模块级单例，避免重复初始化 |

---

## 二、后端工程师视角

### 功能正确性
| 检查项 | 状态 | 说明 |
|--------|------|------|
| engine 参数透传 | ✅ | Schema → Router → content_generator.generate_content() 全链路传递 |
| target_word_count 透传 | ✅ | 同上 |
| fallback 策略 | ✅ | 选定引擎 → mimo → ValueError |
| _parse_llm_output 重试 | ✅ | JSON 解析失败时重新调 LLM（最多 2 次），fallback 返回非空字符串 |
| quality_score 标记 | ✅ | word_count < target * 0.8 时设为 30 |
| regenerate 使用记录的 engine | ✅ | `content.engine or "mimo"` |
| platform_format 默认 html | ✅ | 新数据存储为 HTML，旧数据兼容 |

### 发现的问题

**BUG-1（中）**：`routers/content.py:54` — `usage_tracker.increment()` 在内容生成**之前**调用。如果 LLM 调用失败抛出 ValueError，用量已扣减但内容未生成。应移到 `content_generator.generate_content()` 成功之后。

**BUG-2（中）**：`routers/content.py:419` — timeline status 逻辑错误：
```python
"status": "done" if check else ("pending" if d > days_since else "pending"),
```
两个分支都返回 `"pending"`，`d <= days_since` 时应显示 `"overdue"` 或 `"missed"`。

**ISSUE-1（低）**：`thumbnail.py` — 无图片格式异常处理。损坏图片导致 `Image.open()` 抛出 `PIL.UnidentifiedImageError`，FastAPI 返回 500 而非 400。

**ISSUE-2（低）**：`content_generator.py:302` — `content.engine or "mimo"` 在 engine 为空字符串时也返回 "mimo"。行为正确但应显式 `if not content.engine`。

---

## 三、前端工程师视角

### 功能正确性
| 检查项 | 状态 | 说明 |
|--------|------|------|
| TipTap 编辑器初始化 | ✅ | StarterKit + Image + Typography |
| 工具栏 8 按钮 | ✅ | B/I/H2/H3/列表/引用/代码/图片 |
| 双字数显示 | ✅ | 实际字数 / 目标字数，<80% 红色 |
| 只读模式 | ✅ | status !== 'draft' 时工具栏隐藏 |
| 生成弹窗字数预设 | ✅ | 5 档按钮 + 自定义输入，≥500 校验 |
| AI 模型下拉框 | ✅ | 4 选项 + localStorage 持久化 |
| HTML 预览 | ✅ | dangerouslySetInnerHTML 渲染 editor.getHTML() |

### 发现的问题

**BUG-3（高）**：`ContentEditor.js:86` — `fetch('/api/upload/image')` 未携带 Authorization header。upload 端点要求 `require_feature("content_generation")` → `get_current_user`（JWT 验证）。前端上传会返回 401。需从 localStorage 读取 token 并添加到 headers。

**BUG-4（中）**：`content/page.js:86` — 生成成功后 `setSelectedContent(response.data.content_id)` 将 selectedContent 设为数字 ID，但 ContentEditor 期望对象。editor 收到数字后所有属性为 undefined，显示空白。这是**预存 bug**，非本次引入，但影响用户体验。

**ISSUE-3（低）**：`ContentEditor.js:78` — `editor.storage.characterCount?.characters?.()` 永远走 fallback（characterCount 扩展未安装）。功能正常但为无效代码。

**ISSUE-4（低）**：`ContentEditor.js` — 图片上传无 loading 状态提示，用户不知道是否上传中。

**ISSUE-5（低）**：`content/page.js:229` — `{item.engine || 'mimo'}` 显示原始引擎代码（如 "mimo"），应显示友好名称（如 "MIMO"）。

---

## 四、测试工程师视角

### 边界场景
| 场景 | 状态 | 说明 |
|------|------|------|
| 自定义字数 < 500 | ✅ | 前端 alert + 后端 Pydantic ge=500 双重校验 |
| 空 body 字段 | ✅ | fallback 写入 "生成内容为空" |
| 损坏图片上传 | ❌ | 无异常处理，返回 500 |
| 未登录上传 | ❌ | 前端未携带 token，401 但无用户提示 |
| LLM 全部引擎失败 | ✅ | ValueError → HTTP 400 |
| JSON 解析 3 次失败 | ✅ | fallback 返回原始文本 |

### 可测试性
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 接口契约匹配 | ✅ | request/response schema 与 api-contract.md 一致 |
| 输入校验 | ✅ | Pydantic Field 约束 + 前端校验 |
| 错误处理 | ⚠️ | 后端 ValueError → 400，但前端仅 alert，无结构化错误展示 |

---

## 五、修复建议汇总

### 必须修复（阻塞 QA）

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 1 | ContentEditor.js:86 | 上传无 auth header | 从 localStorage 读 token 添加到 fetch headers |
| 2 | routers/content.py:54 | 用量扣减在生成前 | 移到 generate_content() 成功后 |

### 建议修复（非阻塞）

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 3 | content.py:419 | timeline status 逻辑 | `d <= days_since` 时改为 "overdue" |
| 4 | thumbnail.py | 损坏图片 500 | 捕获 PIL 异常返回 400 |
| 5 | content/page.js:229 | 引擎名不友好 | 映射为中文名 |
| 6 | ContentEditor.js | 上传无 loading | 添加 uploading state |
| 7 | content/page.js:86 | 生成后 selectedContent 为数字 | 改为从 list 中查找对象 |

---

## 六、评审结论

**Go（可进入 QA，条件修复 2 项阻塞问题）**

发现 2 项阻塞问题（上传 auth 缺失 + 用量扣减时序），需修复后方可进入 QA。5 项非阻塞建议可在 QA 期间并行修复。
