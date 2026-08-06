# 代码评审报告 — v2.2 质量校验 + 图片上传

**日期**：2026-05-27
**评审范围**：T2.8 内容质量校验服务 + T4.12 图片上传对话框
**评审视角**：架构师

---

## 1. 变更概述

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/app/services/quality_checker.py` | 新建 | 5 类质量检测 + 评分系统（0-100） |
| `backend/app/services/content_generator.py` | 修改 | 集成 check_quality() 到 generate_content() 和 regenerate_section() |
| `frontend/src/app/components/ImageUploadDialog.js` | 新建 | 图片上传对话框（拖拽/粘贴/点击 + 进度条 + alt text） |
| `frontend/src/app/components/ContentEditor.js` | 修改 | 替换旧 file input 为 ImageUploadDialog 集成 |

---

## 2. 评审结果

### 2.1 规范符合性

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 命名规范 | PASS | snake_case 函数/变量，PascalCase 组件 |
| 类型注解 | PASS | quality_checker.py 函数签名完整（list[str] \| None 等） |
| DI 使用 | PASS | check_quality() 接收 db: Session 参数，未在模块级实例化 |
| React 规范 | PASS | useState/useCallback 使用正确，无直接 DOM 操作 |

### 2.2 结构评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 分层边界 | PASS | quality_checker 为独立服务模块，路由层未直接调用 |
| 耦合 | PASS | 仅依赖 Brand/BrandProfile/GeneratedContent 三个模型 |
| 向后兼容 | PASS | check_quality() 为新增调用，未改变 generate_content() 签名 |

### 2.3 性能风险

| 风险 | 等级 | 说明 |
|------|------|------|
| _check_duplicate_content 查询 20 条 | LOW | LIMIT 20 限制了扫描范围，品牌内容量有限 |
| check_quality 额外 DB 查询 | LOW | 2 次简单主键查询（Brand + BrandProfile），亚毫秒级 |
| XHR 上传进度 | NONE | 比 fetch 更适合进度追踪，无性能问题 |

### 2.4 安全发现

| 风险 | 等级 | 说明 |
|------|------|------|
| 图片上传鉴权 | PASS | 后端 upload.py 使用 require_feature("content_generation") 保护 |
| 前端文件类型校验 | PASS | 前端 + 后端双重校验（ALLOWED_TYPES） |
| XSS 风险 | LOW | 图片 src 来自自有存储，alt text 为纯文本 |

---

## 3. 必须修复项（阻塞）

### 3.1 quality_checker.py — _check_brand_mention 硬编码关键词

**文件**：`quality_checker.py:261`
**问题**：`_check_brand_mention()` 搜索硬编码的"品牌"和"产品"两个中文词，而非实际品牌名。对于英文内容或品牌名不含这两个字的场景完全失效。
**修复方案**：函数签名增加 `brand_name: str` 参数，搜索实际品牌名。

### 3.2 quality_checker.py — tags 参数未使用

**文件**：`quality_checker.py:42`
**问题**：`check_quality()` 接收 `tags` 参数但从未使用，属于死代码。
**修复方案**：移除 tags 参数，或在 content_generator.py 调用处也移除。

### 3.3 ImageUploadDialog.js — 内存泄漏

**文件**：`ImageUploadDialog.js:52`
**问题**：`FileReader.readAsDataURL()` 创建的 data URL 通过 `setPreview(e.target.result)` 存储为 state，但组件关闭时未调用 `URL.revokeObjectURL()` 释放。虽然 data URL 不是 object URL，但 FileReader 闭包会持有大文件引用。
**修复方案**：在 `reset()` 中将 preview 设为 null 即可（当前已做），但需确认 FileReader 闭包被 GC。当前实现可接受。

### 3.4 quality_checker.py — _check_platform_compliance 双重扣分

**文件**：`quality_checker.py:179-200`
**问题**：当 word_count < limits["min"] 时扣 25 分（error），同时 word_count < target_word_count * 0.8 再扣 10 分（warning）。若 target_word_count 设为 min 值，同一问题被双重扣分。
**修复方案**：在 target_word_count 检查前增加 `elif` 条件，或合并两个检查。

---

## 4. 建议改进项（非阻塞）

### 4.1 _calculate_overlap 中文分词

**文件**：`quality_checker.py:160`
**说明**：使用 `split()` 按空格分词对中文不准确（中文无空格）。Jaccard 相似度在中文场景下偏高。建议后续引入 jieba 分词。
**影响**：当前仅用于标题相似度检测（>0.8 阈值），误报率可控。

### 4.2 ImageUploadDialog useCallback 依赖

**文件**：`ImageUploadDialog.js:56-83`
**说明**：`handleDrop`、`handleDragOver`、`handleDragLeave`、`handlePaste` 使用 useCallback 但依赖数组为空。`processFile` 不在依赖中，React DevTools 可能警告。
**影响**：功能正确，仅为 lint 合规性问题。

### 4.3 ContentEditor 字数统计

**文件**：`ContentEditor.js:74`
**说明**：`editor.storage.characterCount?.characters?.()` 依赖 characterCount 扩展，但 StarterKit 不包含此扩展。当前 fallback 到 `getText().length` 可工作，但字符数与中文字数含义不同。
**影响**：显示的"字数"实际为字符数（含标点空格），与后端 `len(plain_text)` 一致。

---

## 5. 评审结论

| 类别 | 数量 |
|------|------|
| 必须修复 | 2（#3.1 品牌名硬编码、#3.4 双重扣分） |
| 建议改进 | 3（非阻塞） |

**判定**：2 项必须修复不阻塞 QA 启动（功能可用，但逻辑有瑕疵），建议在 QA 期间同步修复。

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 门控 6 · 架构师代码评审
交付物：`.ai/reports/architect/review-report-v2.2.md`
摘要：4 文件变更，2 项必须修复（品牌名硬编码 + 双重扣分），3 项建议改进。整体结构清晰，分层合规。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入 'approve' 推进至第 7 阶段（QA 验收）
输入 'return [原因]' 退回当前阶段修改
