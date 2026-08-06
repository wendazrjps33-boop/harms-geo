# GeoRank - AI 可见性监控平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/fastapi-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/react-18+-blue.svg)](https://react.dev/)
[![Next.js](https://img.shields.io/badge/next.js-14+-black.svg)](https://nextjs.org/)

**GeoRank** 是一个 AI 可见性监控与内容生成平台，帮助品牌在 ChatGPT、Claude、Gemini 等 AI 引擎中被引用和提及。

## 一、项目简介

GeoRank 是为中小企业和数字营销机构设计的 GEO（Generative Engine Optimization）工具，帮助品牌在 AI 搜索中获得更好的可见性。

### 核心功能
- AI 引擎查询（OpenAI, Claude, Gemini, DeepSeek, 通义千问, MiMo）
- 品牌提及检测与可见性评分
- 竞争对手对比分析
- AI 内容生成（FAQ、社区问答、深度文章、新闻稿）
- 内容编辑（TipTap 富文本编辑器）
- 内容发布与分发（知乎、小红书、微信公众号等）
- 采纳效果追踪（平台收录 + AI 引用检测）
- 定时监控任务

### 产品优势
- **价格实惠：** $49/月起，比主要竞品低 50-80%
- **多引擎支持：** 6 大 AI 引擎覆盖
- **简单易用：** 专注于核心功能，界面简洁
- **数据准确：** 多源验证，结果可靠

## 二、快速开始

### 技术栈

**后端：**
- Python 3.12+
- FastAPI 0.115+
- SQLAlchemy 2.x（同步模式）
- PostgreSQL
- Redis
- APScheduler（定时任务）
- Stripe（支付）

**前端：**
- React 18
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- TipTap（富文本编辑器）
- Chart.js

### 本地开发

#### 1. 克隆项目
```bash
git clone https://github.com/yourusername/georank-mvp.git
cd georank-mvp
```

#### 2. 配置环境变量
```bash
cp backend/.env.example backend/.env
# 编辑 .env 文件，配置数据库、Redis、API Key 等
```

#### 3. 启动数据库
```bash
docker-compose up -d postgres redis
```

#### 4. 运行后端
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 5. 运行前端
```bash
cd frontend
npm install
npm run dev
```

#### 6. 访问应用
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 三、项目结构

```
georank-mvp/
├── backend/                    # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py             # FastAPI 入口
│   │   ├── config.py           # 环境配置
│   │   ├── database.py         # SQLAlchemy 引擎/会话
│   │   ├── dependencies.py     # 依赖注入
│   │   ├── scheduler.py        # APScheduler 定时任务
│   │   ├── task_store.py       # 异步任务状态存储
│   │   ├── models/             # ORM 模型
│   │   │   ├── user.py         # User, Subscription, SubscriptionPlan
│   │   │   ├── brand.py        # Brand, BrandQuery
│   │   │   ├── content.py      # GeneratedContent, BrandProfile, ContentDistribution, AdoptionCheck
│   │   │   ├── report.py       # VisibilityReport, AnalysisRun, AnalysisResult
│   │   │   ├── competitor.py   # Competitor
│   │   │   └── subscription.py # SubscriptionPlan, UserSubscription
│   │   ├── schemas/            # Pydantic v2 请求/响应模型
│   │   │   ├── content.py      # ContentGenerateRequest, PublishRequest, Platform enum
│   │   │   └── subscription.py
│   │   ├── routers/            # API 路由
│   │   │   ├── auth.py         # /api/auth/*
│   │   │   ├── brands.py       # /api/brands/*
│   │   │   ├── content.py      # /api/content/*
│   │   │   ├── analysis.py     # /api/analysis/*
│   │   │   ├── competitor_analysis.py  # /api/competitor-analysis/*
│   │   │   ├── subscription.py # /api/subscription/*
│   │   │   ├── usage.py        # /api/usage/*
│   │   │   ├── reports.py      # /api/reports/*
│   │   │   ├── upload.py       # /api/upload/*
│   │   │   └── crawler.py      # /api/crawler/*
│   │   ├── services/           # 业务逻辑
│   │   │   ├── ai_gateway.py   # AI 引网关（多引擎切换+降级）
│   │   │   ├── content_generator.py  # 内容生成（Prompt 模板 + LLM 调用）
│   │   │   ├── adoption_verifier.py  # 采纳效果检测
│   │   │   ├── competitor_analysis.py # 竞品分析
│   │   │   ├── statistical_analysis.py # 统计分析
│   │   │   ├── auth_service.py # 认证服务
│   │   │   ├── brand_service.py # 品牌服务
│   │   │   ├── usage_tracker.py # 配额追踪
│   │   │   ├── billing.py      # Stripe 支付
│   │   │   ├── crawler.py      # 网页抓取
│   │   │   ├── export.py       # PDF/CSV 导出
│   │   │   ├── storage.py      # 文件存储（OSS + 本地 fallback）
│   │   │   └── thumbnail.py    # 缩略图生成
│   │   └── middleware/
│   │       ├── subscription_gate.py  # 功能门控/配额检查
│   │       └── csrf.py         # CSRF 防护
│   └── requirements.txt
│
├── frontend/                   # Next.js 前端
│   ├── src/app/
│   │   ├── page.js             # 首页/登录
│   │   ├── login/page.js       # 登录页
│   │   ├── register/page.js    # 注册页
│   │   ├── dashboard/page.js   # 仪表盘
│   │   ├── brands/page.js      # 品牌列表
│   │   ├── brands/[id]/page.js # 品牌详情
│   │   ├── brands/[id]/edit/page.js       # 品牌编辑
│   │   ├── brands/[id]/analysis/page.js   # 可见度分析
│   │   ├── brands/[id]/compare/page.js    # 竞品对比
│   │   ├── brands/[id]/content/page.js    # 内容工作室
│   │   ├── brands/[id]/content/[contentId]/adoption/page.js  # 采纳效果
│   │   ├── subscription/page.js # 订阅管理
│   │   ├── components/
│   │   │   ├── ContentEditor.js    # TipTap 富文本编辑器
│   │   │   ├── PublishModal.js     # 发布弹窗
│   │   │   ├── FeatureGate.js      # 功能门控
│   │   │   ├── UpgradeModal.js     # 升级引导
│   │   │   ├── UsageOverview.js    # 用量概览
│   │   │   ├── AdoptionTimeline.js # 采纳时间线
│   │   │   ├── VisibilityChart.js  # 可见性图表
│   │   │   ├── CompetitorCharts.js # 竞品图表
│   │   │   ├── StatisticalCharts.js # 统计图表
│   │   │   ├── EngineCompareChart.js # 引擎对比图
│   │   │   ├── ScoringRules.js     # 评分规则
│   │   │   ├── LanguageSwitcher.js # 语言切换
│   │   │   └── Providers.js        # 上下文提供者
│   │   ├── services/api.js     # API 客户端
│   │   └── i18n/               # 国际化（中文/英文）
│   └── package.json
│
├── docs/                       # 项目文档
│   ├── constraints/            # 技术约束（架构/数据库/UI）
│   ├── reports/                # 历史 QA/评审/部署报告
│   └── requirement-v4.md       # 当前重构需求
│
└── README.md
```

## 四、核心功能

### 1. 用户认证
- 注册/登录（JWT 认证）
- 密码加密（bcrypt）
- 功能门控（基于订阅计划）

### 2. 品牌管理
- 添加/编辑/删除品牌
- 品牌资料（核心产品、目标受众、行业、卖点）
- 管理查询关键词

### 3. AI 可见性分析
- 6 大 AI 引擎查询（OpenAI, Claude, Gemini, DeepSeek, 通义千问, MiMo）
- 品牌提及检测
- 可见性评分计算
- 分析结果可视化

### 4. 竞品对比分析
- 选择竞品品牌
- 多引擎对比
- 结果图表展示

### 5. AI 内容生成
- 4 种内容类型：FAQ 问答、社区问答、深度文章、新闻稿
- 多 AI 模型选择（MIMO、DeepSeek、OpenAI、通义千问）
- 自定义指令
- 目标字数配置（500-2000 字）
- 输出语言切换（中文/英文）

### 6. 内容编辑与发布
- TipTap 富文本编辑器（加粗/斜体/标题/列表/引用/代码块/图片）
- 实时字数统计
- 内容预览
- 内容发布（知乎、小红书、微信公众号等国内平台）
- 一键复制标题+正文
- 发布后回填 URL

### 7. 采纳效果追踪
- 平台收录检测（Google site: 搜索）
- AI 引擎引用检测（6 大引擎）
- 排名变化对比（发布前后可见度分数）
- 时间线展示（3/7/14/30 天检测）

### 8. 订阅与计费
- 三档计划：Free / Pro ($49/月) / Agency ($199/月)
- 用量追踪（品牌数/查询词/内容生成次数）
- 功能门控（Free 用户受限功能标记"升级解锁"）
- Stripe 支付集成

### 9. 其他功能
- PDF/CSV 报告导出
- 图片上传（JPG/PNG/WebP, ≤10MB）
- 网页抓取（robots.txt 合规）
- 多语言支持（中文/英文）
- 定时监控任务（APScheduler）

## 五、商业计划

### 定价策略
| 计划 | 价格 | 品牌数 | 查询词/品牌 | AI 内容生成 | 竞品分析 |
|------|------|--------|-------------|-------------|----------|
| Free | $0/月 | 1 | 5 | 不可用 | 不可用 |
| Pro | $49/月 | 5 | 20 | 10 篇/月 | 3 个竞品 |
| Agency | $199/月 | 25 | 50 | 50 篇/月 | 10 个竞品 |

### 目标市场
- 中小企业
- 数字营销机构
- 内容创作者

## 六、开发计划

### 已完成（v1.0）
- [x] 用户认证与权限
- [x] 品牌管理
- [x] AI 可见性分析（6 引擎）
- [x] 竞品对比分析
- [x] 订阅管理与功能门控
- [x] 用量追踪
- [x] AI 内容生成（4 类型）
- [x] TipTap 富文本编辑器
- [x] 内容发布（手动复制+发布）
- [x] 采纳效果追踪
- [x] 图片上传
- [x] 网页抓取
- [x] PDF/CSV 导出
- [x] 多语言支持（i18n）

### 待完成（v1.1）
- [ ] Stripe 支付完整流程（Checkout + Webhook）
- [ ] 内容质量校验服务
- [ ] 多品牌批量内容生成
- [ ] 邮件通知（用量警告）
- [ ] 团队成员管理（Agency 计划）
- [ ] API 开放访问（Business 计划）
- [ ] 白标报告（Agency 计划）

## 七、文档

### 项目文档
- [重构需求（v4.0）](docs/requirement-v4.md)
- [架构约束](docs/constraints/architect_constraint.md)
- [数据库约束](docs/constraints/db_constraint.md)
- [UI 约束](docs/constraints/ui_constraint.md)
- [技术实现方案](docs/TECHNICAL-IMPLEMENTATION-PYTHON.md)

### 参考资料
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [React 文档](https://react.dev/)
- [Next.js 文档](https://nextjs.org/docs)
- [TipTap 文档](https://tiptap.dev/docs)

## 八、贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建分支 (`git checkout -b feature/xxx`)
3. 提交代码 (`git commit -m 'Add xxx'`)
4. 发起 Pull Request
5. 代码审查
6. 合并到主分支

## 九、许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**项目版本：** 1.0
**最后更新：** 2026年5月
**作者：** GeoRank 开发团队
