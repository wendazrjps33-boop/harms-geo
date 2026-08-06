# 前端工程师工作日志 · v2.0 Phase 1

## 完成任务

### T4.7 TipTap 富文本编辑器
- `ContentEditor.js`: textarea 替换为 TipTap 编辑器
- 扩展：StarterKit + Image + Typography
- 工具栏：加粗/斜体/H2/H3/无序列表/引用/代码块/插入图片（8个按钮）
- 双字数显示：实际字数 / 目标字数，<80% 红色警告
- 只读模式：status !== 'draft' 时工具栏隐藏 + 编辑器不可编辑
- 预览模式：dangerouslySetInnerHTML 渲染 HTML
- 质量评分 badge：quality_score < 50 时显示黄色标签

### T4.11 生成弹窗升级
- `content/page.js`: 生成弹窗新增字数预设按钮组（500/800/1000/1500/2000）
- 自定义字数输入框（≥500，type=number）
- AI 模型下拉框（MIMO/DeepSeek/OpenAI/通义千问，附说明）
- 模型选择 localStorage 持久化
- 两列并排布局（语言+模型）
- 内容列表显示 engine 信息

### T4.12+T4.13 图片上传组件 + TipTap 集成
- ContentEditor 工具栏"插入图片"按钮
- 调用 POST /api/upload/image 上传
- 上传成功后 editor.chain().focus().setImage({src}) 插入
- 支持 JPG/PNG/WebP，前端 file input 限制格式

## 依赖安装
- @tiptap/react, @tiptap/starter-kit, @tiptap/extension-image, @tiptap/extension-typography, @tiptap/pm

## 修改文件清单
1. `frontend/src/app/components/ContentEditor.js` — TipTap 重写
2. `frontend/src/app/brands/[id]/content/page.js` — 生成弹窗升级 + 列表 engine 显示
3. `frontend/package.json` — 新增 TipTap 依赖
