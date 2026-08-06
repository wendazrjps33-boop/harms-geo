# 架构约束

## 锁定技术栈

### 前端
- Next.js 14 + React 18 + TypeScript
- Tailwind CSS 3（样式）
- axios（HTTP 客户端）
- Chart.js + react-chartjs-2（图表）
- react-icons（图标）
- date-fns（日期处理）

### 后端
- Python 3.12+
- FastAPI 0.115+
- Pydantic v2（数据校验）
- SQLAlchemy 2.x（async，ORM）
- asyncpg（PostgreSQL 异步驱动）
- Alembic（数据库迁移）
- Celery + Redis（异步任务）
- uv（包管理）

### 数据库
- PostgreSQL 16+
- Redis 7+（缓存/消息队列）

### 质量工具
- mypy --strict
- Ruff（lint + format）
- pytest + pytest-asyncio
- pre-commit hooks

## 禁用依赖
- Django / Flask（已有 FastAPI）
- MongoDB / MySQL（统一 PostgreSQL）
- requests / httpx（统一 httpx 用于外部调用）
- any 类型（mypy strict 模式禁止）

## 部署限制
- 容器化：Docker + Docker Compose
- 反向代理：Nginx
- 操作系统：Linux（Ubuntu 22.04+ / Debian 12+）
