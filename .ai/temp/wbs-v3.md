# WBS 任务分解 · GeoRank v3.0

> 版本：v3.0 | 创建：2026-06-05 | 范围：技术债清理 + Add-on 购买流程

---

## 1. 任务分解结构

### Epic E-TS：TypeScript 迁移（前端 P6a）

> 目标：将全部 .js/.jsx 文件迁移为 .ts/.tsx，`strict: true`，零类型错误。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-TS-01 | Phase 1: types/ 迁移 | 创建 API 响应类型定义 | 现有 api.js 响应结构 | types/*.ts | — | 类型定义不完整 | 0.5d |
| T-TS-02 | Phase 1: lib/ 迁移 | 工具函数类型化 | 现有 lib/*.js | lib/*.ts | T-TS-01 | — | 0.5d |
| T-TS-03 | Phase 1: services/ 迁移 | API 客户端类型化 | 现有 services/api.js + types/ | services/*.ts | T-TS-01 | axios 类型适配 | 1d |
| T-TS-04 | Phase 1 验证 | `npm run build` 通过 | T-TS-01~03 | build 成功 | T-TS-03 | — | 0.5d |
| T-TS-05 | Phase 2: components/ 迁移 | 组件 props 类型化 | 现有 components/*.js + types/ | components/*.tsx | T-TS-04 | 组件 props 接口定义 | 2d |
| T-TS-06 | Phase 2 验证 | `npm run build` 通过 | T-TS-05 | build 成功 | T-TS-05 | — | 0.5d |
| T-TS-07 | Phase 3: app/ 页面迁移（高频） | content + brands 页面类型化 | T-TS-06 | app/(app)/content/*.tsx + brands/*.tsx | T-TS-06 | 页面状态类型复杂 | 1.5d |
| T-TS-08 | Phase 3: app/ 页面迁移（低频） | dashboard + analytics + subscription 类型化 | T-TS-06 | 其余页面 .tsx | T-TS-06 | — | 1.5d |
| T-TS-09 | Phase 3 验证 | `npm run build` 通过 | T-TS-07~08 | build 成功 | T-TS-08 | — | 0.5d |
| T-TS-10 | Phase 4: 冒烟测试 | 核心流程无回归 | T-TS-09 | 冒烟报告 | T-TS-09 | 运行时类型不匹配 | 1d |

**小计：10 个任务，10 天**

---

### Epic E-WC：中文分词 + 字数统计（前端 P6a + 后端 P6b）

> 目标：前端字数统计精确到中文字符，后端质量检测引入 jieba 分词。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-WC-01 | 安装 characterCount 扩展 | 替代 getText().length fallback | ContentEditor.js | 安装 @tiptap/extension-character-count + 配置 | T-TS-05（组件迁移后） | 扩展 API 变更 | 0.3d |
| T-WC-02 | 实现 lib/word-count.ts | 中文字符数 + 英文单词数 | 需求 §13.3.2 | word-count.ts + 单元测试 | T-TS-02 | 正则边界情况 | 0.5d |
| T-WC-03 | 集成字数统计到编辑器 | 编辑器头部显示字数 | T-WC-01 + T-WC-02 | ContentEditor.tsx 更新 | T-WC-02 | — | 0.3d |
| T-WC-04 | 后端引入 jieba | requirements.txt + 预加载 | 现有 requirements.txt | jieba>=0.42.1 + startup 预加载 | — | Docker 镜像体积 | 0.3d |
| T-WC-05 | 修改 quality_checker.py | 替换空格分割为 jieba 分词 | 现有 _calculate_overlap() | jieba.lcut() 替换 + 测试 | T-WC-04 | jieba 分词结果差异 | 0.5d |

**小计：5 个任务，2 天（与 TS 迁移并行）**

---

### Epic E-DU：拖拽/粘贴上传（前端 P6a）

> 目标：TipTap 编辑器支持拖拽和粘贴图片自动上传。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-DU-01 | TipTap 事件注册 | drop/paste 事件监听 | ContentEditor.tsx | handleDrop + handlePaste 实现 | T-TS-05（组件迁移后） | 浏览器兼容性 | 0.5d |
| T-DU-02 | 上传逻辑复用 | 复用 contentAPI.uploadImage | T-DU-01 | processFile 函数提取 | T-DU-01 | — | 0.3d |
| T-DU-03 | 内联进度条 | 上传中显示进度 | T-DU-02 | 进度条组件 | T-DU-02 | XHR 进度事件 | 0.5d |
| T-DU-04 | 图片插入编辑器 | 上传完成后插入 img 标签 | T-DU-03 | editor.chain().focus().setImage() | T-DU-03 | TipTap Image 扩展配置 | 0.3d |

**小计：4 个任务，2 天（依赖 TS Phase 3 完成）**

---

### Epic E-VS：虚拟滚动（前端 P6a）

> 目标：内容列表和品牌列表支持虚拟滚动，100+ 条数据首屏 <100ms。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-VS-01 | 安装 @tanstack/react-virtual | 添加依赖 | package.json | 安装完成 | — | — | 0.1d |
| T-VS-02 | 封装 VirtualList 组件 | 通用虚拟滚动组件 | T-VS-01 | components/VirtualList.tsx | T-TS-05 + T-VS-01 | 动态行高测量 | 1d |
| T-VS-03 | 内容列表集成 | /content 页面虚拟滚动 | T-VS-02 | content/page.tsx 更新 | T-VS-02 + T-TS-07 | 行高不固定 | 0.5d |
| T-VS-04 | 品牌列表集成 | /brands 页面虚拟滚动 | T-VS-02 | brands/page.tsx 更新 | T-VS-02 + T-TS-07 | — | 0.3d |
| T-VS-05 | 性能验证 | 100+ 条数据首屏 <100ms | T-VS-03~04 | 性能测试报告 | T-VS-04 | — | 0.3d |

**小计：5 个任务，2 天（依赖 TS Phase 3 完成）**

---

### Epic E-AK：API Key 数据库化（后端 P6b）

> 目标：API Key 从内存存储迁移到 PostgreSQL，支持多 worker 共享。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-AK-01 | 创建 api_keys model | SQLAlchemy model | db-design-v3.md | models/api_key.py | — | — | 0.2d |
| T-AK-02 | Alembic 迁移脚本 | 创建 api_keys 表 | T-AK-01 | alembic/versions/xxx_add_api_keys.py | T-AK-01 | — | 0.2d |
| T-AK-03 | 重写 api_keys router | 使用数据库替代内存 | T-AK-01 | routers/api_keys.py 重构 | T-AK-01 | 并发安全 | 0.5d |
| T-AK-04 | 验证多 worker 共享 | 重启后 Key 不丢失 | T-AK-03 | 测试报告 | T-AK-03 | — | 0.2d |

**小计：4 个任务，1 天**

---

### Epic E-CL：Celery 迁移（后端 P6b）

> 目标：将 threading.Thread 替换为 Celery，支持任务重试和持久化。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-CL-01 | 安装 Celery + 配置 | celery_app.py + Redis broker | requirements.txt | celery_app.py | — | Redis 配置 | 0.3d |
| T-CL-02 | 迁移 generate_content | threading → Celery task | 现有 content.py | celery_tasks/content_tasks.py | T-CL-01 | 任务状态同步 | 1d |
| T-CL-03 | 迁移 regenerate_content | 同步 → 异步 Celery task | 现有 content.py | celery_tasks/content_tasks.py | T-CL-02 | — | 0.5d |
| T-CL-04 | 迁移定时任务 | APScheduler → Celery beat | 现有 scheduler.py | celery_tasks/ 配置 | T-CL-01 | 定时表达式 | 0.5d |
| T-CL-05 | 更新前端轮询 | task_store → Celery result | 现有 content/[id]/page.js | 轮询逻辑更新 | T-CL-02 | 任务状态格式 | 0.3d |
| T-CL-06 | Docker Compose 更新 | 添加 Celery worker + beat | 现有 docker-compose.yml | 更新配置 | T-CL-01 | 服务依赖 | 0.3d |

**小计：6 个任务，3 天**

---

### Epic E-PT：pytest 自动化测试（后端 P6b）

> 目标：建立 pytest 基础设施，覆盖核心路径 ≥80%。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-PT-01 | pytest 基础设施 | conftest.py + fixtures | 现有代码 | tests/conftest.py | — | 测试数据库配置 | 0.3d |
| T-PT-02 | 配额检查测试 | require_quota 覆盖 | subscription_gate.py | tests/test_quota.py | T-PT-01 | Redis mock | 0.3d |
| T-PT-03 | 内容生成测试 | generate_content 覆盖 | content_generator.py | tests/test_content_gen.py | T-PT-01 | LLM mock | 0.5d |
| T-PT-04 | 采纳检测测试 | run_adoption_checks 覆盖 | adoption_verifier.py | tests/test_adoption.py | T-PT-01 | 外部 API mock | 0.3d |
| T-PT-05 | API 集成测试 | 核心端点覆盖 | 所有 router | tests/test_api*.py | T-PT-01 | TestClient 配置 | 0.5d |

**小计：5 个任务，2 天**

---

### Epic E-DB：后端数据库优化（后端 P6b）

> 目标：N+1 查询优化、Redis 连接池、外部服务集成规范、JSON 解析优化。

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-DB-01 | N+1 查询优化 | get_content_stats 批量查询 | 现有 content.py | 优化后代码 | — | 查询结果一致性 | 0.5d |
| T-DB-02 | scheduler N+1 优化 | check_adoption 批量查询 | 现有 scheduler.py | 优化后代码 | — | — | 0.3d |
| T-DB-03 | Redis 连接池配置 | max_connections + timeout | 现有 usage_tracker.py | 连接池配置 | — | 连接泄漏 | 0.3d |
| T-DB-04 | SERP API 网关 | 替代直接爬取 Google | 现有 adoption_verifier.py | services/serp_gateway.py | — | API Key 配置 | 0.5d |
| T-DB-05 | JSON 解析优化 | raw_decode 替代贪婪正则 | 现有 content_generator.py | 优化后代码 | — | 边界情况 | 0.3d |

**小计：5 个任务，2 天**

---

### Epic E-ADD：Add-on 购买流程（后端 P6b + 前端 P6a）

> 目标：用户可购买额外品牌位、查询词包、内容生成包，配额自动合并。

#### 后端任务

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-ADD-01 | AddonPurchase model | 创建 SQLAlchemy model | db-design-v3.md | models/addon_purchase.py | — | — | 0.3d |
| T-ADD-02 | Alembic 迁移脚本 | 创建 addon_purchases 表 | T-ADD-01 | alembic/versions/xxx_add_addon_purchases.py | T-ADD-01 | — | 0.2d |
| T-ADD-03 | POST addon/checkout API | 创建 Stripe Checkout Session | T-ADD-01 + billing.py | routers/subscription.py 扩展 | T-ADD-01 | Stripe metadata 配置 | 0.5d |
| T-ADD-04 | GET addons API | 查询用户已购 Add-on 列表 | T-ADD-01 | routers/subscription.py 扩展 | T-ADD-01 | — | 0.3d |
| T-ADD-05 | Webhook 处理扩展 | 处理 Add-on 支付事件 | T-ADD-01 + billing.py | billing.py 扩展 | T-ADD-01 | Webhook 幂等性 | 0.5d |
| T-ADD-06 | usage_tracker 修改 | 合并 Add-on 额度到配额 | T-ADD-01 | usage_tracker.py 扩展 | T-ADD-01 | SQL SUM 查询性能 | 0.5d |
| T-ADD-07 | 过期定时任务 | 每日标记过期 Add-on | T-ADD-01 | celery_tasks/addon_tasks.py | T-ADD-01 | — | 0.3d |
| T-ADD-08 | 后端单元测试 | 覆盖 Add-on 全流程 | T-ADD-03~07 | tests/test_addon.py | T-ADD-07 | — | 0.5d |

**后端小计：8 个任务，3 天（可与 TS 迁移并行）**

#### 前端任务

| ID | 任务 | 目标 | 输入 | 输出 | 依赖 | 风险 | 预估 |
|----|------|------|------|------|------|------|------|
| T-ADD-09 | types/addon.ts | Add-on 前端类型定义 | api-contract.md | types/addon.ts | T-TS-01 | — | 0.2d |
| T-ADD-10 | API 客户端扩展 | addon checkout + list API | T-ADD-09 | services/api.ts 扩展 | T-ADD-09 + T-TS-03 | — | 0.3d |
| T-ADD-11 | AddonCard 组件 | Add-on 卡片展示 | T-ADD-09 | components/AddonCard.tsx | T-TS-05 | UI 设计细节 | 0.5d |
| T-ADD-12 | 加购 Tab 页面 | 订阅管理页新增加购 Tab | T-ADD-11 | subscription/page.tsx 扩展 | T-ADD-11 + T-TS-08 | — | 0.5d |
| T-ADD-13 | 仪表盘分段进度条 | 基础配额 + Add-on 配额分段展示 | T-ADD-09 | UsageOverview 组件扩展 | T-TS-05 + T-ADD-06 | 进度条样式 | 0.5d |
| T-ADD-14 | 前端集成测试 | 购买流程 + 配额展示验证 | T-ADD-10~13 | 测试报告 | T-ADD-13 | — | 0.5d |

**前端小计：6 个任务，3 天（依赖 TS Phase 3 完成）**

**Epic 小计：14 个任务，6 天（后端 3 天可与 TS 并行，前端 3 天依赖 TS Phase 3）**

---

## 2. 关键依赖关系

```
Week 1-2:  TS 迁移 Phase 1-2 (T-TS-01~06) + 后端技术债 (T-AK, T-CL, T-DB, T-PT) + jieba (T-WC-04~05)
           ─────────────────────────────────────────────────────────────────────────────────
           前端专注 TS 迁移                    后端并行清理技术债

Week 3:    TS 迁移 Phase 3 (T-TS-07~09) + Add-on 后端 (T-ADD-01~08)
           ─────────────────────────────────────────────────────────
           高频页面迁移                        Add-on model + API

Week 4:    前端功能 (T-DU, T-VS, T-WC-01~03, T-ADD-09~14)
           ───────────────────────────────────────────────
           拖拽上传 + 虚拟滚动 + 字数统计 + Add-on 前端 + 验证
```

**并行点：**
- TS 迁移（前端）与后端技术债（T-AK, T-CL, T-DB, T-PT）可并行
- Add-on 后端（T-ADD-01~08）可与 TS Phase 3 并行
- 拖拽上传 + 虚拟滚动 + 字数统计 + Add-on 前端均依赖 TS Phase 3

---

## 3. 里程碑

| 里程碑 | 交付物 | 预估 |
|--------|--------|------|
| M1 基础设施就绪 | Celery 配置 + pytest 基础 + API Key 表 + jieba | Day 3 |
| M2 TS Phase 1 完成 | types/ + lib/ + services/ 迁移 | Day 4 |
| M3 后端技术债清理 | N+1 优化 + Redis 连接池 + SERP API + JSON 解析 | Day 5 |
| M4 TS Phase 2 完成 | components/ 迁移 | Day 7 |
| M5 Add-on 后端完成 | AddonPurchase model + API + Webhook | Day 8 |
| M6 TS Phase 3 完成 | 页面层迁移 | Day 12 |
| M7 前端功能完成 | 拖拽上传 + 虚拟滚动 + 字数统计 + Add-on UI | Day 16 |
| M8 测试验证 | pytest 覆盖率 ≥80% + 冒烟测试 | Day 18 |
| M9 回归测试 | 全量回归 + Bug 修复 | Day 20 |

---

## 4. 风险清单

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| TS 迁移引入运行时 Bug | 中 | 功能异常 | 分阶段迁移 + 每阶段冒烟测试 |
| jieba 首次加载慢 (~2s) | 中 | 首次请求延迟 | FastAPI startup 事件后台预加载 |
| Add-on 与订阅周期不同步 | 低 | 配额计算错误 | Webhook 从 Stripe 获取当前周期时间 |
| 虚拟滚动动态行高跳动 | 中 | 列表体验差 | measureElement 动态测量 + 预估行高 80px |
| Add-on 过期后用户仍在使用 | 低 | 配额溢出 | 过期检查 + 阻止新增（保留数据） |
| TS 迁移工作量超预期 | 中 | 迭代延期 | 优先迁移高频页面，低频页面可延后 |

---

## 5. 任务约束

- 单个任务 ≤ 1–3 人天
- 每个任务有可验证的交付物（代码文件 + 测试通过）
- TS 迁移期间冻结新功能开发，仅修 Bug
- Add-on 后端可与 TS 迁移并行（Python 不受影响）
- 前端功能（拖拽上传、虚拟滚动）需等 TS Phase 3 完成后执行

---

## 6. 人员分配

| 周次 | 前端工程师 | Python 工程师 |
|------|-----------|--------------|
| Week 1 | TS Phase 1 (types/lib/services) | API Key DB + Celery + pytest + jieba |
| Week 2 | TS Phase 2 (components) | N+1 优化 + Redis + SERP + JSON + Add-on model |
| Week 3 | TS Phase 3 (页面层) | Add-on API + Webhook + 过期任务 |
| Week 4 | 拖拽上传 + 虚拟滚动 + 字数统计 + Add-on UI | Bug 修复 + 支持 |
| Week 5 | 冒烟测试 + 性能验证 | Bug 修复 + 支持 |

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 门控 4 · 项目经理
交付物：`.ai/temp/wbs-v3.md`
摘要：12 个 Epic，54 个任务，预估 20 个工作日（4 周），前后端并行策略明确。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入 `approve` 推进至第 5 阶段（接口契约 + 技术方案）
输入 `return [原因]` 退回当前阶段修改
