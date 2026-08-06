# 部署指南 · GeoRank v2.6

**版本**：v2.6
**创建日期**：2026-06-05
**状态**：QA 通过（Go）

---

## 1. 部署前检查清单

- [ ] QA 报告已审阅并确认 Go 发布
- [ ] 所有环境变量已准备（见第 4 节）
- [ ] 数据库备份已完成（如升级现有环境）
- [ ] 回滚计划已审阅（见第 7 节）
- [ ] 部署窗口已确认（建议低峰期）
- [ ] 团队成员已通知部署计划

---

## 2. 基础设施采购计划

| 项目 | 用途 | 推荐规格 | 预估费用 | 备注 |
|------|------|----------|----------|------|
| 云服务器 | 后端 + 前端 | 2C4G（最低）| $20-40/月 | 阿里云/AWS/GCP |
| PostgreSQL | 主数据库 | 2C4G 或云数据库 | $15-30/月 | 阿里云 RDS 或自建 |
| Redis | 缓存 + 消息队列 | 1G 内存 | $5-10/月 | 阿里云 Redis 或自建 |
| 域名 + SSL | HTTPS 访问 | — | $10-15/年 | 阿里云域名 + Let's Encrypt |
| Stripe 账户 | 支付集成 | — | 免费 | 需企业认证 |
| AI 引擎 API | 内容生成 + 可见度检测 | — | 按量计费 | OpenAI/Claude/DeepSeek 等 |
| **合计** | — | — | **$50-95/月** | — |

---

## 3. 第三方服务集成

| 服务 | 提供商 | 凭证类型 | 环境变量名 | 获取方式 | 验证方法 |
|------|--------|----------|-----------|----------|----------|
| 支付 | Stripe | Secret Key + Webhook Secret | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → API Keys | 创建测试 Checkout Session |
| AI 引擎 | OpenAI | API Key | `OPENAI_API_KEY` | OpenAI Platform → API Keys | 调用 /v1/models |
| AI 引擎 | Claude | API Key | `ANTHROPIC_API_KEY` | Anthropic Console | 调用 /v1/messages |
| AI 引擎 | DeepSeek | API Key | `DEEPSEEK_API_KEY` | DeepSeek Platform | 调用 /v1/chat/completions |
| AI 引擎 | 通义千问 | API Key | `DASHSCOPE_API_KEY` | 阿里云 DashScope | 调用 /api/v1/services/aigc/text-generation/generation |
| AI 引擎 | MiMo | API Key | `MIMO_API_KEY` | MiMo Platform | 调用 /v1/chat/completions |
| 对象存储 | 阿里云 OSS | AccessKey ID + Secret | `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET` | 阿里云控制台 → AccessKey | 上传测试文件 |

---

## 4. 环境配置

### 4.1 后端环境变量

```bash
# .env（后端）

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/georank
# 或 SQLite（开发环境）
# DATABASE_URL=sqlite:///./georank.db

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=

# JWT
JWT_SECRET_KEY={YOUR_JWT_SECRET}
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Stripe
STRIPE_SECRET_KEY={YOUR_STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET={YOUR_STRIPE_WEBHOOK_SECRET}
STRIPE_PUBLISHABLE_KEY={YOUR_STRIPE_PUBLISHABLE_KEY}

# AI 引擎
OPENAI_API_KEY={YOUR_OPENAI_KEY}
ANTHROPIC_API_KEY={YOUR_ANTHROPIC_KEY}
DEEPSEEK_API_KEY={YOUR_DEEPSEEK_KEY}
DASHSCOPE_API_KEY={YOUR_DASHSCOPE_KEY}
MIMO_API_KEY={YOUR_MIMO_KEY}

# 对象存储（可选）
STORAGE_BACKEND=local  # local 或 oss
OSS_ENDPOINT={YOUR_OSS_ENDPOINT}
OSS_BUCKET={YOUR_OSS_BUCKET}
OSS_ACCESS_KEY_ID={YOUR_OSS_ACCESS_KEY}
OSS_ACCESS_KEY_SECRET={YOUR_OSS_ACCESS_SECRET}

# 应用
APP_ENV=production
APP_DEBUG=false
APP_PORT=8000
CORS_ORIGINS=https://yourdomain.com
```

### 4.2 前端环境变量

```bash
# .env.local（前端）

NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY={YOUR_STRIPE_PUBLISHABLE_KEY}
```

---

## 5. 部署步骤

### 5.1 数据库初始化

```bash
# 1. 创建数据库
psql -U postgres -c "CREATE DATABASE georank;"

# 2. 执行初始化脚本（如使用 database-first）
psql -U postgres -d georank -f .ai/temp/db-init.sql

# 3. 或使用 Alembic 迁移（如已配置）
cd backend
alembic upgrade head
```

### 5.2 后端部署

```bash
# 1. 安装依赖
cd backend
pip install -r requirements.txt

# 2. 执行数据库迁移（如使用 Alembic）
alembic upgrade head

# 3. 启动后端服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# 4. 验证后端服务
curl http://localhost:8000/health
# 期望返回: {"status": "ok"}
```

### 5.3 前端部署

```bash
# 1. 安装依赖
cd frontend
npm install

# 2. 构建生产版本
npm run build

# 3. 启动前端服务
npm start
# 或使用 PM2
pm2 start npm --name "georank-frontend" -- start
```

### 5.4 Nginx 配置

```nginx
# /etc/nginx/sites-available/georank

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件（本地存储时）
    location /uploads/ {
        alias /path/to/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/georank /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.5 Docker Compose 部署（可选）

```yaml
# docker-compose.yml

version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: georank
      POSTGRES_USER: georank
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://georank:${DB_PASSWORD}@db:5432/georank
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    volumes:
      - uploads_data:/app/uploads

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
  uploads_data:
```

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 6. 部署后验证

### 6.1 即时验证清单

- [ ] 访问 https://yourdomain.com，页面正常加载
- [ ] 访问 https://yourdomain.com/api/health，返回 `{"status": "ok"}`
- [ ] 注册新用户，自动分配 Free 计划
- [ ] 登录后查看 Dashboard，用量数据正常显示
- [ ] 创建品牌，配额检查正常工作
- [ ] 生成内容，返回 202，轮询获取结果
- [ ] 访问 /subscription，计划列表正常显示
- [ ] 访问 Stripe Checkout 测试支付流程

### 6.2 24 小时监控指标

| 指标 | 告警阈值 | 监控方式 |
|------|----------|----------|
| API 响应时间 | p95 > 500ms | Nginx access log / APM |
| 错误率 | > 1% | Nginx error log / Sentry |
| CPU 使用率 | > 80% | 系统监控 |
| 内存使用率 | > 85% | 系统监控 |
| 磁盘使用率 | > 90% | 系统监控 |
| Redis 连接数 | > 50 | Redis INFO |
| PostgreSQL 连接数 | > 80 | pg_stat_activity |

### 6.3 日志检查

```bash
# 后端日志
tail -f /var/log/georank/backend.log

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Docker 日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 7. 回滚计划

### 7.1 触发条件

- API 错误率 > 5% 持续 5 分钟
- 核心功能不可用（登录、支付、内容生成）
- 数据库连接失败
- 安全漏洞被利用

### 7.2 回滚步骤

```bash
# 1. 停止新版本
docker-compose down
# 或
pm2 stop georank-frontend
systemctl stop georank-backend

# 2. 恢复数据库（如已执行迁移）
psql -U postgres -d georank -f /backup/georank_YYYYMMDD.sql

# 3. 启动旧版本
cd /opt/georank-previous
docker-compose up -d
# 或
pm2 start georank-frontend
systemctl start georank-backend

# 4. 验证旧版本
curl https://yourdomain.com/api/health

# 5. 通知团队
# 发送回滚通知到 Slack/邮件
```

### 7.3 数据回滚可行性

| 变更类型 | 可逆性 | 说明 |
|----------|--------|------|
| 新增表 | ✅ 可逆 | DROP TABLE |
| 新增字段 | ✅ 可逆 | ALTER TABLE DROP COLUMN |
| 修改字段 | ⚠️ 部分可逆 | 需要数据迁移 |
| 删除数据 | ❌ 不可逆 | 需从备份恢复 |

### 7.4 通知协议

- **通知对象**：开发团队、产品经理、运维
- **通知渠道**：Slack #incidents 频道 + 邮件
- **通知内容**：回滚原因、影响范围、预计恢复时间

---

## 附录 A：常用命令

```bash
# 查看服务状态
docker-compose ps
pm2 status
systemctl status georank-backend

# 重启服务
docker-compose restart backend
pm2 restart georank-frontend
systemctl restart georank-backend

# 查看日志
docker-compose logs -f backend --tail 100
pm2 logs georank-frontend --lines 100
journalctl -u georank-backend -f

# 数据库备份
pg_dump -U postgres georank > /backup/georank_$(date +%Y%m%d).sql

# 数据库恢复
psql -U postgres -d georank < /backup/georank_YYYYMMDD.sql
```

---

## 附录 B：技术债务清单（v3.0 处理）

| 项目 | 说明 | 影响 |
|------|------|------|
| threading → Celery | 进程重启时任务丢失 | 内容生成中断 |
| N+1 查询优化 | get_content_stats、scheduler | 大数据量时性能退化 |
| Redis 连接池 | 无 max_connections 配置 | 高并发时连接过多 |
| JSON 解析优化 | 贪婪正则可能匹配错误 | 偶发生成失败 |
| 自动化测试 | 零 pytest/jest 测试 | 无法回归验证 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 门控 8 · DevOps 工程师
交付物：`.ai/reports/devops-engineer/deploy-guide-v2.6.md`
摘要：部署指南包含 7 节（检查清单/基础设施/环境配置/部署步骤/验证/监控/回滚），支持 Docker Compose 和传统部署两种方式。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入 `approve` 确认部署指南
输入 `return [原因]` 退回修改
