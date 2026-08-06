# GeoRank MVP - Python 技术实现文档

## 一、技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 后端框架 | FastAPI + Uvicorn | 0.109+ / 0.27+ |
| ORM | SQLAlchemy 2.0 (Mapped) | 2.0+ |
| 数据库 | MySQL 8.x (远程) | 8.x |
| 缓存 | Redis (远程) | 7.x |
| 认证 | JWT (python-jose + passlib/bcrypt) | - |
| AI SDK | OpenAI / Anthropic / Google GenerativeAI | - |
| 定时任务 | APScheduler | 3.10+ |
| PDF 生成 | fpdf2 | 2.7+ |
| 前端 | React 18 + Next.js 14 + Tailwind CSS | - |
| 前端图表 | Chart.js + react-chartjs-2 | 4.4+ |
| 前端 HTTP | Axios | 1.6+ |

---

## 二、项目结构

```
georank-mvp/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 应用入口
│   │   ├── config.py            # 配置管理 (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy 引擎 & Session
│   │   ├── dependencies.py      # FastAPI 依赖注入 (get_db, get_current_user)
│   │   ├── scheduler.py         # APScheduler 定时任务
│   │   ├── models/
│   │   │   ├── user.py          # User 实体
│   │   │   ├── brand.py         # Brand + BrandQuery 实体
│   │   │   └── report.py        # VisibilityReport 实体
│   │   ├── schemas/
│   │   │   ├── user.py          # 用户请求/响应 Schema
│   │   │   ├── brand.py         # 品牌请求/响应 Schema
│   │   │   └── report.py        # 报告请求/响应 Schema
│   │   ├── routers/
│   │   │   ├── auth.py          # 认证路由 /api/auth/*
│   │   │   ├── brands.py        # 品牌路由 /api/brands/*
│   │   │   └── reports.py       # 报告路由 /api/reports/*
│   │   └── services/
│   │       ├── auth_service.py  # 注册/登录/JWT
│   │       ├── brand_service.py # 品牌 CRUD
│   │       ├── ai_gateway.py    # AI 引擎查询 (OpenAI/Claude/Gemini)
│   │       ├── analytics.py     # 数据分析/竞品对比
│   │       └── export.py        # CSV/PDF 导出
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── page.js              # 首页 (Landing)
│   │   ├── layout.js            # 全局布局
│   │   ├── globals.css          # 全局样式
│   │   ├── login/page.js        # 登录页
│   │   ├── register/page.js     # 注册页
│   │   ├── dashboard/page.js    # 仪表板
│   │   ├── brands/
│   │   │   ├── page.js          # 品牌列表
│   │   │   └── [id]/
│   │   │       ├── page.js      # 品牌详情（含图表+导出）
│   │   │       └── edit/page.js # 品牌编辑
│   │   ├── components/
│   │   │   ├── VisibilityChart.js    # 可见性趋势折线图
│   │   │   └── EngineCompareChart.js # 引擎对比柱状图
│   │   └── services/
│   │       ├── api.js           # Axios 统一 API 客户端
│   │       └── auth.js          # Token 管理工具
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── nginx.conf
├── database/
│   ├── schema.sql               # MySQL 建表语句
│   └── initial-data.sql         # 初始测试数据
├── docker/
│   └── docker-compose.yml       # Docker 编排
└── docs/
    └── TECHNICAL-IMPLEMENTATION-PYTHON.md  # 本文档
```

---

## 三、后端实现

### 3.1 应用入口 - main.py

FastAPI 应用使用 lifespan 管理生命周期：
- 启动时自动创建数据库表（`Base.metadata.create_all`）
- 启动 APScheduler 定时任务
- 关闭时清理 scheduler

```python
app = FastAPI(title="GeoRank API", version="1.0.0", lifespan=lifespan)
```

CORS 配置允许 `localhost:3000` 和 `localhost:3001`。

### 3.2 配置管理 - config.py

使用 `pydantic-settings` 管理配置，支持 `.env` 文件：

```python
class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@host:3306/georank"
    REDIS_URL: str = "redis://host:6379/0"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24小时
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
```

**注意：** 生产环境必须通过 `.env` 文件注入敏感配置，不得硬编码。

### 3.3 数据库层 - database.py

- 使用 PyMySQL 作为 MySQL 驱动（`pymysql.install_as_MySQLdb()`）
- SQLAlchemy 2.0 新风格：`DeclarativeBase` + `Mapped` 类型注解
- `SessionLocal` 通过 `get_db()` 依赖注入到每个请求

### 3.4 认证机制 - dependencies.py + auth_service.py

**认证流程：**

1. 用户注册：密码通过 bcrypt 哈希存储
2. 用户登录：验证密码后签发 JWT（payload 包含 `sub: user_id`）
3. 请求鉴权：`HTTPBearer` 提取 token → `jose.jwt.decode` 验证 → 查询用户

```python
# JWT payload 结构
{"sub": user_id, "exp": expire_time}
```

**关键依赖：**
- `get_db()` - 数据库 Session
- `get_current_user()` - 从 JWT 解析当前用户

---

## 四、数据模型

### 4.1 ER 关系

```
users (1) ──→ (N) brands (1) ──→ (N) brand_queries
                    │
                    └──→ (N) visibility_reports
```

### 4.2 表结构

#### users 表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK AUTO_INCREMENT | 用户ID |
| email | VARCHAR(255) UNIQUE | 邮箱 |
| password | VARCHAR(255) | bcrypt 哈希密码 |
| name | VARCHAR(255) | 用户名 |
| created_at | DATETIME DEFAULT NOW | 创建时间 |
| active | TINYINT(1) DEFAULT 1 | 是否激活 |

#### brands 表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK AUTO_INCREMENT | 品牌ID |
| user_id | BIGINT FK→users.id | 所属用户 |
| name | VARCHAR(255) | 品牌名称 |
| website | VARCHAR(255) | 品牌网站 |
| description | TEXT | 品牌描述 |
| visibility_score | DECIMAL(10,2) DEFAULT 0 | 可见性评分 |
| created_at | DATETIME DEFAULT NOW | 创建时间 |
| active | TINYINT(1) DEFAULT 1 | 是否激活 |

#### brand_queries 表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK AUTO_INCREMENT | 主键 |
| brand_id | BIGINT FK→brands.id | 所属品牌 |
| query | TEXT | 监控关键词 |

#### visibility_reports 表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK AUTO_INCREMENT | 报告ID |
| brand_id | BIGINT FK→brands.id | 所属品牌 |
| engine | VARCHAR(50) | AI引擎 (openai/claude/gemini) |
| query | TEXT | 查询关键词 |
| mentioned | TINYINT(1) | 是否被提及 |
| position | INT | 提及位置（句子序号） |
| word_count | INT | 回答词数 |
| visibility_score | DECIMAL(10,2) | 可见性评分 |
| citation_text | TEXT | 引用文本 |
| checked_at | DATETIME DEFAULT NOW | 检测时间 |

---

## 五、API 接口文档

基础路径：`/api`  
认证方式：`Authorization: Bearer <jwt_token>`  
响应格式：JSON

### 5.1 认证接口

#### POST /api/auth/register - 用户注册

```json
// Request
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

// Response 200
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2026-05-20T10:00:00",
  "active": true
}
```

#### POST /api/auth/login - 用户登录

```json
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response 200
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

#### GET /api/auth/profile - 获取当前用户

需要认证。返回 `UserResponse`。

### 5.2 品牌接口（需要认证）

#### GET /api/brands - 获取品牌列表

```json
// Response 200
[
  {
    "id": 1,
    "user_id": 1,
    "name": "My Brand",
    "website": "https://mybrand.com",
    "description": "...",
    "visibility_score": 45.2,
    "created_at": "2026-05-20T10:00:00",
    "active": true,
    "queries": ["best tech companies", "top software"]
  }
]
```

#### POST /api/brands - 创建品牌

```json
// Request
{
  "name": "My Brand",
  "website": "https://mybrand.com",
  "description": "My company",
  "queries": ["best tech companies", "top software"]
}

// Response 201 - BrandResponse
```

#### GET /api/brands/{brand_id} - 获取品牌详情

#### PUT /api/brands/{brand_id} - 更新品牌

```json
// Request (所有字段可选)
{
  "name": "Updated Name",
  "website": "https://new.com",
  "description": "Updated",
  "queries": ["new query"]
}
```

#### DELETE /api/brands/{brand_id} - 删除品牌（软删除）

```json
// Response 200
{"message": "Brand deleted"}
```

#### GET /api/brands/{brand_id}/analytics - 品牌分析

```json
// Response 200
{
  "total_checks": 50,
  "mention_count": 35,
  "mention_rate": 70.0,
  "avg_score": 42.5,
  "trend": 3.2
}
```

#### GET /api/brands/{brand_id}/competitors - 竞品对比

```json
// Response 200 - 同用户下其他品牌的评分
[
  {"id": 2, "name": "Competitor A", "visibility_score": 38.0}
]
```

### 5.3 报告接口（需要认证）

#### POST /api/reports/check - 单次检测

```json
// Request
{
  "brand_id": 1,
  "query": "best tech companies",
  "engine": "openai"
}

// Response 200
{
  "id": 1,
  "brand_id": 1,
  "engine": "openai",
  "query": "best tech companies",
  "mentioned": true,
  "position": 2,
  "word_count": 128,
  "visibility_score": 45.2,
  "citation_text": "My Brand is a leading...",
  "checked_at": "2026-05-20T10:00:00"
}
```

engine 可选值：`openai`、`claude`、`gemini`

#### POST /api/reports/brand/{brand_id}/check-all - 全引擎批量检测

对品牌的所有关键词 x 所有引擎进行检测，返回报告列表。

#### GET /api/reports/brand/{brand_id} - 获取品牌历史报告

返回按时间倒序的报告列表。

#### GET /api/reports/brand/{brand_id}/latest - 获取最新报告

返回单条最新报告或 null。

#### GET /api/reports/brand/{brand_id}/export - 导出报告

查询参数：
- `format`：`csv`（默认）或 `pdf`

返回文件下载响应：
- CSV：`Content-Type: text/csv`
- PDF：`Content-Type: application/pdf`（含摘要统计 + 报告表格）

### 5.4 公开接口

#### GET / - 根路径

```json
{"message": "GeoRank API"}
```

#### GET /api/public/health - 健康检查

```json
{"status": "ok"}
```

---

## 六、核心业务逻辑

### 6.1 AI 引擎查询 - ai_gateway.py

对三个 AI 引擎使用统一的 prompt 模板：

```
Please answer the following question comprehensively.
If you know about the brand or company '{brand_name}', mention it in your answer.

Question: {query}
```

**评分算法：**

```python
score = exp(-position / 100) * min(word_count / 50, 10.0) * 100
```

- `position`：品牌在回答中出现的句子序号（越靠前分越高）
- `word_count`：回答总词数（回答越详细分越高，上限 500 词）
- 未被提及时 score = 0

**引擎映射：**
- `openai` → `gpt-3.5-turbo`（OpenAI SDK）
- `claude` → `claude-sonnet-4-20250514`（Anthropic SDK）
- `gemini` → `gemini-pro`（Google GenerativeAI SDK）

### 6.2 定时监控 - scheduler.py

APScheduler 后台线程，每小时执行一次：
1. 查询所有 active 品牌
2. 遍历每个品牌的关键词
3. 对三个引擎逐一检测
4. 结果写入 visibility_reports 表
5. 异常时跳过继续（`try/except continue`）

### 6.3 数据分析 - analytics.py

- **品牌分析**：总检测次数、被提及次数、提及率、平均分、趋势（前后半段对比）
- **竞品对比**：同用户下其他品牌的可见性评分

---

## 七、前端页面

| 路径 | 页面 | 功能 |
|---|---|---|
| `/` | Landing | 产品介绍 + 登录/注册入口 |
| `/login` | 登录 | 邮箱密码登录，token 存 localStorage |
| `/register` | 注册 | 注册表单（密码确认 + 8位校验） |
| `/dashboard` | 仪表板 | 品牌列表 + 品牌详情 + 可见性检测 + 报告展示 |
| `/brands` | 品牌管理 | 品牌 CRUD + 评分展示 |
| `/brands/[id]` | 品牌详情 | 报告历史 + 趋势图表 + 引擎对比 + CSV/PDF 导出 |
| `/brands/[id]/edit` | 品牌编辑 | 编辑品牌信息和监控关键词 |

**前端 API 调用方式：** 统一使用 `services/api.js`（基于 axios），自动注入 JWT token，401 自动跳转登录。

---

## 八、部署配置

### 8.1 环境变量 (.env)

```bash
DATABASE_URL=mysql+pymysql://user:password@host:3306/georank
REDIS_URL=redis://host:6379/0
SECRET_KEY=your-random-secret-key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

### 8.2 Docker Compose

```bash
# 启动所有服务
docker-compose -f docker/docker-compose.yml up -d

# 仅启动数据库和缓存
docker-compose -f docker/docker-compose.yml up -d postgres redis
```

服务端口：
- 后端 API：`http://localhost:8000`
- 前端页面：`http://localhost:3000`
- PostgreSQL：`localhost:5432`
- Redis：`localhost:6379`

### 8.3 本地开发

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev
```

### 8.4 API 文档

FastAPI 自动生成交互式文档：
- Swagger UI：`http://localhost:8000/docs`
- ReDoc：`http://localhost:8000/redoc`

---

## 九、依赖清单

### 后端 (requirements.txt)

| 包 | 用途 |
|---|---|
| fastapi | Web 框架 |
| uvicorn | ASGI 服务器 |
| sqlalchemy | ORM |
| alembic | 数据库迁移 |
| pymysql | MySQL 驱动 |
| redis | Redis 客户端 |
| python-jose | JWT 编解码 |
| passlib | 密码哈希 |
| pydantic / pydantic-settings | 数据校验 & 配置 |
| openai | OpenAI SDK |
| anthropic | Anthropic SDK |
| google-generativeai | Google AI SDK |
| apscheduler | 定时任务 |
| fpdf2 | PDF 生成 |
| httpx | HTTP 客户端 |

### 前端 (package.json)

| 包 | 用途 |
|---|---|
| react / react-dom | UI 框架 |
| next | SSR 框架 |
| tailwindcss | CSS 工具 |
| chart.js / react-chartjs-2 | 图表 |
| react-icons | 图标 |
| date-fns | 日期处理 |
| axios | HTTP 客户端（已安装，代码中使用 fetch） |

---

## 十、与原 Java 文档的差异

| 项目 | 原文档 (Java) | 实际实现 (Python) |
|---|---|---|
| 后端语言 | Java 17 | Python 3.11 |
| Web 框架 | Spring Boot 3.2 | FastAPI |
| ORM | Spring Data JPA | SQLAlchemy 2.0 |
| 数据库 | PostgreSQL | MySQL 8.x |
| 认证 | Spring Security + JWT | python-jose + passlib |
| 定时任务 | Spring Scheduler | APScheduler |
| API 文档 | 手动编写 | FastAPI 自动生成 (Swagger) |
| 部署端口 | 8080 | 8000 |
