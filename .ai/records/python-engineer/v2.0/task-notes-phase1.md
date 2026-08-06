# Python 工程师工作日志 · v2.0 Phase 1

## 完成任务

### T2.12 Bug 修复：body 为空
- `ai_gateway.py`: 所有 6 个 engine 分支 `max_tokens=4000` → `8000`
- `content_generator.py`: `_parse_llm_output()` 增加 `retry_fn` 参数，JSON 解析失败时重新调用 LLM（最多 2 次重试），fallback 写入非空字符串

### T2.13 字数配置后端
- `schemas/content.py`: `ContentGenerateRequest` 新增 `target_word_count: int = Field(default=1000, ge=500)`
- `content_generator.py`: `generate_content()` 新增 `target_word_count` 参数，prompt 追加字数要求，实际字数 < 目标×0.8 时 `quality_score=30`

### T2.14 AI 模型选择后端
- `schemas/content.py`: `ContentGenerateRequest` 新增 `engine: str = Field(default="mimo", pattern=...)`
- `content_generator.py`: `generate_content()` 新增 `engine` 参数，fallback 策略：选定引擎 → mimo → 报错；`regenerate_section()` 使用内容记录的 engine
- 添加 logging 记录引擎调用结果

### T2.15 图片上传后端
- `config.py`: 新增 `STORAGE_BACKEND`, `OSS_*`, `UPLOAD_DIR` 配置项
- `services/storage.py`: 存储抽象层（LocalStorage + OSSStorage），OSS 失败自动 fallback 到本地
- `services/thumbnail.py`: Pillow 缩略图生成（300px 宽，按比例）
- `routers/upload.py`: `POST /api/upload/image` 端点，JPG/PNG/WebP ≤10MB，返回 url/thumbnail_url/width/height
- `main.py`: 注册 upload router

### T2.16 模型层扩展
- `models/content.py`: GeneratedContent 新增 `engine` (VARCHAR(20) DEFAULT 'mimo') 和 `target_word_count` (INT DEFAULT 1000)，`platform_format` 默认值改为 'html'

### 路由层更新
- `routers/content.py`: generate_content 透传 engine/target_word_count；list/detail 响应新增 engine/target_word_count 字段

## 修改文件清单
1. `backend/app/services/ai_gateway.py` — max_tokens 4000→8000
2. `backend/app/services/content_generator.py` — retry + engine + word_count + logging
3. `backend/app/services/storage.py` — 新建
4. `backend/app/services/thumbnail.py` — 新建
5. `backend/app/routers/upload.py` — 新建
6. `backend/app/routers/content.py` — 透传参数 + 响应扩展
7. `backend/app/schemas/content.py` — 新增字段
8. `backend/app/models/content.py` — 新增字段
9. `backend/app/config.py` — 新增 OSS 配置
10. `backend/app/main.py` — 注册路由
