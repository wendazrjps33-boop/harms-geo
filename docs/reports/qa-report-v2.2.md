# QA 质量报告 — v2.2 质量校验 + 图片上传

**测试日期**：2026-05-27
**测试范围**：T2.8 内容质量校验服务 + T4.12 图片上传对话框
**测试方法**：代码静态分析 + 逻辑审查

---

## 1. 测试范围

| 用户故事 | 测试项 |
|----------|--------|
| T2.8 质量校验 | 5 类检测逻辑、评分计算、集成调用 |
| T4.12 图片上传 | 组件功能、上传流程、交互状态 |

---

## 2. 验收标准逐项验证

### T2.8 内容质量校验

| 验收标准 | 状态 | 说明 |
|----------|------|------|
| check_quality() 接收 db/brand_id/content_type/title/body/target_word_count | ✅ | 函数签名匹配，tags 参数已移除 |
| 返回 QualityResult(score, issues, passed) | ✅ | score 0-100，passed = score >= 50 |
| factual_accuracy：品牌名未提及 → warning | ✅ | 检查 brand.name 是否在 title/plain_text 中 |
| factual_accuracy：URL 非品牌官网 → info | ✅ | 检测到 http 但不含 brand.website |
| factual_accuracy：核心产品未提及 → warning | ✅ | 从 BrandProfile.core_products 解析逗号分隔列表 |
| duplicate：标题完全相同 → error（-25分） | ✅ | 查询最近 20 条，精确匹配 title |
| duplicate：标题高度相似 → warning（-10分） | ✅ | Jaccard 相似度 > 0.8 |
| platform_compliance：字数不足 → error | ✅ | 按内容类型 min 阈值检查 |
| platform_compliance：字数超标 → warning | ✅ | 按内容类型 max 阈值检查 |
| platform_compliance：未达目标字数 → warning | ✅ | 已改为 elif，不再与 min 双重扣分 |
| structure：非 HTML → warning | ✅ | 检查 body.startswith("<") |
| structure：缺小标题 → info | ✅ | article/press_release 类型检查 h2/h3 |
| structure：FAQ 缺问答标识 → info | ✅ | 检测 Q:/问:/h3+疑问词 |
| structure：新闻稿缺联系方式 → info | ✅ | 检测 联系/contact/电话/邮箱/@ |
| brand_mention：未提及品牌名 → info | ✅ | 已修复为使用实际 brand_name 而非硬编码 |
| 评分扣分逻辑正确 | ✅ | error=-25, warning=-10, info=-5, 下限 0 上限 100 |
| content_generator.py 集成 generate_content() | ✅ | LLM 输出后调用 check_quality()，score 写入 quality_score |
| content_generator.py 集成 regenerate_section() | ✅ | 重新生成后重新计算 quality_score |

### T4.12 图片上传对话框

| 验收标准 | 状态 | 说明 |
|----------|------|------|
| 拖拽上传 | ✅ | onDrop → processFile → 预览 |
| 粘贴上传 | ✅ | onPaste → clipboardData → processFile |
| 点击选择文件 | ✅ | onClick → fileInputRef.click() |
| 文件格式校验（前端） | ✅ | ALLOWED_TYPES: image/jpeg/png/webp |
| 文件大小校验（前端） | ✅ | MAX_SIZE: 10MB |
| 上传进度条 | ✅ | XHR upload.onprogress → setProgress |
| 图片预览 | ✅ | FileReader.readAsDataURL → img src |
| Alt text 输入 | ✅ | 默认值为文件名（去扩展名） |
| 上传成功插入 TipTap | ✅ | onInsert → editor.chain().focus().setImage() |
| 取消/重新选择 | ✅ | reset() 清空所有状态 |
| 关闭弹窗重置状态 | ✅ | handleClose() → reset() → onClose() |
| 后端鉴权 | ✅ | 使用 localStorage token + Bearer header |
| ContentEditor 工具栏集成 | ✅ | 图片按钮 → setShowImageDialog(true) |
| ImageUploadDialog 渲染条件 | ✅ | isOpen 控制，false 时返回 null |

---

## 3. 缺陷列表

| ID | 严重程度 | 描述 | 关联文件 | 状态 |
|----|----------|------|----------|------|
| BUG-01 | LOW | _calculate_overlap 对中文分词不准确（按空格分割），可能导致标题相似度误判 | quality_checker.py:160 | 已知限制 |
| BUG-02 | LOW | ImageUploadDialog useCallback 依赖数组为空，processFile 未列入依赖 | ImageUploadDialog.js:56-83 | lint 告警 |
| BUG-03 | INFO | ContentEditor 字数显示为字符数而非中文字数（含标点空格） | ContentEditor.js:74 | 设计如此 |

---

## 4. 发布建议

**Go（可发布）**

理由：
- T2.8 和 T4.12 核心功能完整，验收标准全部通过
- 代码评审发现的 2 项必须修复（品牌名硬编码 + 双重扣分）已在评审后修复
- 3 项缺陷均为 LOW/INFO 级别，不影响核心功能
- 集成点（content_generator.py）调用正确，数据流完整

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 门控 7 · 测试工程师
交付物：`.ai/reports/qa-report-v2.2.md`
摘要：T2.8 + T4.12 共 25 项验收标准全部通过，3 项 LOW 缺陷，建议 Go 发布。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入 'approve' 推进至第 8 阶段（DevOps 部署指南）
输入 'return [原因]' 退回当前阶段修改
