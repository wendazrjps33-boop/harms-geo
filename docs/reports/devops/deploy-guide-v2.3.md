# 部署指南 · GeoRank 商业化 MVP v2.3

## 变更说明（相对 v2.2）

| 项目 | v2.2 | v2.3 变更 |
|------|------|-----------|
| 引擎分级 | 所有引擎对所有用户可用 | claude/gemini 仅 Agency 计划可用（Pro/Free 可用 4 引擎） |
| 后端校验 | 无引擎权限检查 | generate 接口新增 plan 校验，非 Agency 使用 premium 引擎返回 403 |
| 前端过滤 | AI_MODELS 全量展示 | availableModels 按 plan 动态过滤下拉框 |
| 质量评分 | quality_score=30 硬编码 | 5 类检测逻辑（事实/重复/平台合规/结构/品牌提及），0-100 评分 |
| 图片上传 | hidden file input | ImageUploadDialog（拖拽/粘贴/点击，进度条） |
| 新增依赖 | Pillow | 无（无新增）；Pillow 已补充至 requirements.txt |
| 新增环境变量 | — | 无 |
| 数据库变更 | — | 无 |
| 前端编辑器 | TipTap 基础版 | + 图片插入按钮 |

---

## 1. 部署前检查清单

- [ ] QA 报告已审阅并确认 Go 状态（qa-report-v2.2.md，引擎分级联合 review 已通过）
- [ ] Docker 24+ 和 Docker Compose v2 已安装在目标服务器
- [ ] PostgreSQL 16+ 已安装或通过 Docker 运行
- [ ] Redis 7+ 已安装或通过 Docker 运行
- [ ] 所有环境变量已准备（见第 4 节）
- [ ] Stripe 测试模式已验证
- [ ] 域名和 SSL 证书已准备
- [ ] 阿里云 OSS Bucket 已创建（若使用 OSS 存储）
- [ ] 服务器资源已确认（CPU/内存/磁盘）
- [ ] 数据库备份已完成
- [ ] 回滚计划已审阅
- [ ] 部署窗口已确认（建议低峰时段）

---

## 2. 基础设施采购计划

| 项目 | 用途 | 推荐规格 | 预估费用 | 负责人 | 截止日期 |
|------|------|----------|----------|--------|----------|
| 云服务器（应用） | 运行 Docker Compose 服务 | 2 vCPU, 4GB RAM, 50GB SSD | $20/月 | — | 部署前 |
| PostgreSQL 数据库 | 数据存储 | 2 vCPU, 4GB RAM, 100GB SSD | $30/月（或 Docker 本地运行） | — | 部署前 |
| Redis | 缓存、会话、Celery 消息队列 | 1 vCPU, 1GB RAM | $10/月（或 Docker 本地运行） | — | 部署前 |
| 阿里云 OSS | 图片存储（可选，生产推荐） | 标准存储，按量计费 | ~$1/月（10GB 内） | — | 部署前 |
| 域名 | 访问入口 | .com 域名 | $12/年 | — | 部署前 |
| SSL 证书 | HTTPS | Let's Encrypt（免费） | $0 | — | 部署前 |
| Stripe 账户 | 支付处理 | 测试模式 → 生产模式 | 2.9% + $0.30/笔 | — | 部署前 |

**总计预估费用**：约 $73/月（数据库和 Redis 用 Docker 本地运行则 ~$33/月）+ 交易手续费

---

## 3. 第三方服务集成

| 服务 | 提供商 | 凭证类型 | 环境变量名 | 获取方式 | 验证方法 |
|------|--------|----------|------------|----------|----------|
| Stripe | Stripe Inc. | Secret Key + Webhook Secret | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Stripe Dashboard → Developers → API Keys | 创建测试 Checkout Session |
| OpenAI | OpenAI | API Key | OPENAI_API_KEY | OpenAI Platform → API Keys | 发送测试请求 |
| Anthropic | Anthropic | API Key | ANTHROPIC_API_KEY | Anthropic Console → API Keys | 发送测试请求（claude 引擎） |
| Gemini | Google | API Key | GOOGLE_API_KEY | Google AI Studio → API Keys | 发送测试请求（gemini 引擎） |
| DeepSeek | DeepSeek | API Key | DEEPSEEK_API_KEY | DeepSeek Platform → API Keys | 发送测试请求 |
| 通义千问 | Alibaba Cloud | API Key | QIANWEN_API_KEY | Alibaba Cloud → DashScope | 发送测试请求 |
| MIMO | Xiaomi | API Key | MIMO_API_KEY | Xiaomi AI Platform → API Keys | 发送测试请求 |
| 阿里云 OSS | Alibaba Cloud | AccessKey ID/Secret | OSS_ENDPOINT, OSS_BUCKET, OSS_ACCESS_KEY, OSS_SECRET_KEY | Alibaba Cloud → RAM → AccessKey | 上传测试文件 |

**注意**：claude 和 gemini 引擎仅 Agency 计划用户可调用。部署后需确保至少 mimo 或 deepseek 的 API Key 可用，否则 Pro/Free 用户无法生成内容。

**测试环境凭证**：使用各平台的测试/开发凭证
**生产环境凭证**：使用各平台的生产凭证，确保已启用计费

---

## 4. 环境配置

### 4.1 后端环境变量

| 环境变量 | 描述 | 示例值 | 作用域 | 是否必须 |
|----------|------|--------|--------|----------|
| DATABASE_URL | PostgreSQL 连接字符串 | postgresql://user:pass@host:5432/georank | 后端 | 是 |
| REDIS_URL | Redis 连接字符串 | redis://:password@host:6379/0 | 后端 | 是 |
| REDIS_PASSWORD | Redis 密码 | {REDIS_PASSWORD} | 后端 | 否 |
| SECRET_KEY | JWT 签名密钥 | {RANDOM_64_CHAR_STRING} | 后端 | 是 |
| ALGORITHM | JWT 算法 | HS256 | 后端 | 否（默认 HS256） |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token 过期时间 | 1440 | 后端 | 否（默认 1440） |
| STRIPE_SECRET_KEY | Stripe Secret Key | sk_test_... / sk_live_... | 后端 | 是 |
| STRIPE_WEBHOOK_SECRET | Stripe Webhook Secret | whsec_test_... / whsec_live_... | 后端 | 是 |
| OPENAI_API_KEY | OpenAI API Key | sk-... | 后端 | 否（未配置则不可用） |
| ANTHROPIC_API_KEY | Anthropic API Key | sk-ant-... | 后端 | 否（claude 引擎必须） |
| GOOGLE_API_KEY | Google Gemini API Key | AIza... | 后端 | 否（gemini 引擎必须） |
| DEEPSEEK_API_KEY | DeepSeek API Key | sk-... | 后端 | 否 |
| QIANWEN_API_KEY | 通义千问 API Key | sk-... | 后端 | 否 |
| MIMO_API_KEY | MIMO API Key | tp-... | 后端 | 否 |
| MIMO_BASE_URL | MIMO API 地址 | https://token-plan-cn.xiaomimimo.com/v1 | 后端 | 否 |
| MIMO_MODEL | MIMO 模型名 | mimo-v2.5-pro | 后端 | 否 |
| STORAGE_BACKEND | 存储后端类型 | local / oss | 后端 | 是（默认 local） |
| OSS_ENDPOINT | 阿里云 OSS Endpoint | oss-cn-hangzhou.aliyuncs.com | 后端 | 否（STORAGE_BACKEND=oss 时必须） |
| OSS_BUCKET | OSS Bucket 名称 | georank-uploads | 后端 | 否（STORAGE_BACKEND=oss 时必须） |
| OSS_ACCESS_KEY | OSS AccessKey ID | {OSS_ACCESS_KEY_ID} | 后端 | 否（STORAGE_BACKEND=oss 时必须） |
| OSS_SECRET_KEY | OSS AccessKey Secret | {OSS_ACCESS_KEY_SECRET} | 后端 | 否（STORAGE_BACKEND=oss 时必须） |
| UPLOAD_DIR | 本地上传目录 | uploads/images | 后端 | 否（默认 uploads/images） |
| ALLOWED_ORIGINS | CORS 允许的源 | https://yourdomain.com | 后端 | 是 |

### 4.2 前端环境变量

| 环境变量 | 描述 | 示例值 | 作用域 | 是否必须 |
|----------|------|--------|--------|----------|
| NEXT_PUBLIC_API_URL | 后端 API 地址 | https://api.yourdomain.com | 前端 | 是 |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe 公钥 | pk_test_... / pk_live_... | 前端 | 是 |

### 4.3 v2.3 新增/变更说明

**无新增环境变量。** v2.3 的引擎分级功能基于现有的 Redis 缓存（`get_user_plan_code`）和 `subscription_plans` 表，不需要新的配置项。

**数据库 Schema 无变更。** `generated_contents` 表的 `engine` 字段在 v2.2 已存在（VARCHAR），v2.3 仅扩展了允许值范围（+claude, +gemini）。

---

## 5. 部署步骤

### 5.1 预检

1. **验证服务器连接**
   ```bash
   ssh user@your-server-ip
   ```
   期望结果：成功连接到服务器

2. **检查系统资源**
   ```bash
   free -h  # 内存 ≥ 4GB
   df -h    # 磁盘 ≥ 30GB 可用
   nproc    # CPU ≥ 2 核
   docker --version   # Docker 24+
   docker compose version  # Docker Compose v2
   ```
   期望结果：资源充足，Docker 和 Compose 已安装

### 5.2 克隆代码

3. **拉取代码**
   ```bash
   cd /opt
   git clone https://github.com/your-org/georank-mvp.git
   cd georank-mvp
   git checkout v2.3.0  # 或目标版本标签
   ```
   期望结果：代码拉取成功

### 5.3 数据库初始化（PostgreSQL）

4. **启动 PostgreSQL（Docker 方式）**
   ```bash
   docker run -d \
     --name georank-postgres \
     -e POSTGRES_USER=georank \
     -e POSTGRES_PASSWORD={DB_PASSWORD} \
     -e POSTGRES_DB=georank \
     -p 5432:5432 \
     -v georank-pgdata:/var/lib/postgresql/data \
     --restart unless-stopped \
     postgres:16-alpine
   ```
   期望结果：PostgreSQL 容器运行，端口 5432 可访问

5. **导入数据库 Schema**
   ```bash
   cd /opt/georank-mvp
   docker exec -i georank-postgres psql -U postgres -d georank < database/schema.sql
   docker exec -i georank-postgres psql -U postgres -d georank < database/initial-data.sql
   ```
   期望结果：所有表创建成功，种子数据插入完成

6. **验证数据库**
   ```bash
   docker exec georank-postgres psql -U postgres -d georank -c "\dt"
   ```
   期望结果：显示 subscription_plans, user_subscriptions, usage_records, generated_contents, content_distributions, adoption_checks, brand_profiles, team_members 等表

### 5.4 Redis 启动

7. **启动 Redis（Docker 方式）**
   ```bash
   docker run -d \
     --name georank-redis \
     -p 6379:6379 \
     -v georank-redisdata:/data \
     --restart unless-stopped \
     redis:7-alpine redis-server --appendonly yes
   ```
   期望结果：Redis 容器运行，端口 6379 可访问

### 5.5 环境配置

8. **创建环境变量文件**
   ```bash
   cd /opt/georank-mvp
   cp .env.example .env
   nano .env
   ```
   填写所有必须的环境变量（见 4.1 节），关键项：
   - `DATABASE_URL=postgresql://georank:{DB_PASSWORD}@localhost:5432/georank`
   - `REDIS_URL=redis://localhost:6379/0`
   - `STORAGE_BACKEND=local`（或 `oss`）
   - 至少配置 mimo 或 deepseek 的 API Key（Pro/Free 用户依赖）
   - claude/gemini API Key 仅 Agency 用户需要

9. **创建前端环境变量文件**
   ```bash
   cd /opt/georank-mvp/frontend
   cp ../.env.example .env.local
   nano .env.local
   ```
   填写前端环境变量（见 4.2 节）

### 5.6 Docker Compose 部署

10. **启动全部服务**
    ```bash
    cd /opt/georank-mvp/docker
    docker compose up -d --build
    ```
    期望结果：所有容器启动成功

11. **检查容器状态**
    ```bash
    docker compose ps
    ```
    期望结果：所有服务状态为 running

12. **查看服务日志**
    ```bash
    docker compose logs -f backend
    ```
    期望结果：无错误日志，服务启动成功

### 5.7 Nginx 配置

13. **安装 Nginx（若未安装）**
    ```bash
    sudo apt update
    sudo apt install nginx -y
    ```

14. **配置 Nginx**
    ```bash
    sudo nano /etc/nginx/sites-available/georank
    ```

    内容：
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        client_max_body_size 10M;

        # Frontend
        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api/ {
            proxy_pass http://localhost:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
        }

        # LLM 内容生成超时延长
        location /api/content/generate {
            proxy_pass http://localhost:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
        }

        # 本地存储静态文件（若 STORAGE_BACKEND=local）
        location /uploads/ {
            alias /opt/georank-mvp/backend/uploads/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
    ```

    ```bash
    sudo ln -s /etc/nginx/sites-available/georank /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```
    期望结果：Nginx 配置测试通过

15. **安装 SSL 证书**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    sudo certbot renew --dry-run
    ```
    期望结果：证书获取成功，自动续期验证通过

### 5.8 健康检查

16. **验证后端健康**
    ```bash
    curl https://api.yourdomain.com/api/public/health
    ```
    期望结果：`{"status":"ok"}`

17. **验证前端访问**
    ```bash
    curl -I https://yourdomain.com
    ```
    期望结果：HTTP 200

18. **验证数据库连接**
    ```bash
    curl https://api.yourdomain.com/api/subscription/plans
    ```
    期望结果：返回 Free/Pro/Agency 三档计划

19. **验证图片上传端点**
    ```bash
    curl -X POST https://api.yourdomain.com/api/upload/image \
      -H "Authorization: Bearer {TEST_TOKEN}" \
      -F "file=@test.jpg"
    ```
    期望结果：返回上传成功响应，包含 url 和 thumbnail_url

### 5.9 冒烟测试

20. **CSRF Token 测试**
    ```bash
    curl -c cookies.txt https://api.yourdomain.com/api/public/csrf-token
    ```
    期望结果：返回 csrf_token，设置 cookie

21. **用户注册测试**
    ```bash
    curl -X POST https://api.yourdomain.com/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
    ```
    期望结果：注册成功，自动创建 Free 订阅

22. **用户登录测试**
    ```bash
    curl -X POST https://api.yourdomain.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"test123"}'
    ```
    期望结果：登录成功，返回 access_token

23. **内容生成测试（mimo 引擎 — Pro/Free 可用）**
    ```bash
    curl -X POST https://api.yourdomain.com/api/content/generate \
      -H "Authorization: Bearer {TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"brand_id":1,"content_type":"faq","target_word_count":500,"engine":"mimo"}'
    ```
    期望结果：返回 202 Accepted，内容异步生成

24. **引擎分级验证（claude 引擎 — 非 Agency 应返回 403）**
    ```bash
    curl -X POST https://api.yourdomain.com/api/content/generate \
      -H "Authorization: Bearer {FREE_USER_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"brand_id":1,"content_type":"faq","target_word_count":500,"engine":"claude"}'
    ```
    期望结果：返回 403 Forbidden，detail 包含"仅 Agency 计划可用"

25. **引擎分级验证（claude 引擎 — Agency 应返回 202）**
    ```bash
    curl -X POST https://api.yourdomain.com/api/content/generate \
      -H "Authorization: Bearer {AGENCY_USER_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"brand_id":1,"content_type":"faq","target_word_count":500,"engine":"claude"}'
    ```
    期望结果：返回 202 Accepted

---

## 6. 部署后验证

### 6.1 即时检查

- [ ] 后端容器状态：`docker compose ps backend`
- [ ] 前端容器状态：`docker compose ps frontend`
- [ ] PostgreSQL 容器：`docker compose ps postgres` 或 `docker ps | grep georank-postgres`
- [ ] Redis 容器：`docker compose ps redis` 或 `docker ps | grep georank-redis`
- [ ] Nginx 状态：`sudo systemctl status nginx`
- [ ] SSL 证书有效期：`sudo certbot certificates`
- [ ] 磁盘使用率：`df -h`（应 < 80%）
- [ ] 内存使用率：`free -h`（应 < 80%）
- [ ] 引擎分级功能：Pro 用户下拉框仅显示 4 引擎，Agency 显示 6 引擎

### 6.2 24 小时监控

**监控指标：**

| 指标 | 告警阈值 | 监控方式 |
|------|----------|----------|
| API 响应时间 | > 2 秒 | Nginx access log |
| 错误率 | > 1% | Nginx error log |
| 403 引擎权限拒绝 | 持续 > 10 次/小时 | 后端日志（可能前端过滤异常） |
| CPU 使用率 | > 80% | `docker stats` |
| 内存使用率 | > 80% | `free -h` |
| 磁盘使用率 | > 90% | `df -h` |
| PostgreSQL 连接数 | > 80（默认 max_connections=100） | `docker exec georank-postgres psql -U georank -c "SELECT count(*) FROM pg_stat_activity;"` |
| Redis 内存 | > 80% | `docker exec georank-redis redis-cli INFO memory` |
| 图片上传大小 | > 8MB | Nginx access log（POST /api/upload/image） |
| 质量评分异常 | quality_score < 10 占比 > 5% | 后端日志（质量检测可能误报） |

**日志位置：**

| 服务 | 日志命令 |
|------|----------|
| Nginx | /var/log/nginx/access.log, /var/log/nginx/error.log |
| 后端 | `docker compose logs -f backend` |
| 前端 | `docker compose logs -f frontend` |
| PostgreSQL | `docker compose logs -f postgres` |
| Redis | `docker compose logs -f redis` |

**告警通知：**
- 配置邮件告警至运维团队
- 配置 Slack/钉钉 Webhook 告警

---

## 7. 回滚计划

### 7.1 触发条件

| 条件 | 说明 |
|------|------|
| API 错误率 > 5% | 持续 5 分钟 |
| 服务不可用 | 持续 2 分钟 |
| 数据库连接失败 | 无法恢复 |
| 内容生成全部失败 | 所有引擎 500 错误 |
| 引擎分级误拦 | Agency 用户收到不应有的 403 |
| 质量评分全部为 0 或 100 | quality_checker 逻辑异常 |
| 严重安全漏洞 | 发现被利用 |

### 7.2 回滚步骤

1. **停止新版本服务**
   ```bash
   cd /opt/georank-mvp/docker
   docker compose down
   ```

2. **恢复代码**
   ```bash
   cd /opt/georank-mvp
   git checkout v2.2.0  # 或上一个稳定版本
   ```

3. **恢复数据库（如有必要）**
   ```bash
   docker exec -i georank-postgres psql -U georank -d georank < /backups/georank_backup_YYYYMMDD.sql
   ```

4. **重新构建并启动**
   ```bash
   cd /opt/georank-mvp/docker
   docker compose up -d --build
   ```

5. **验证回滚**
   ```bash
   curl https://api.yourdomain.com/api/public/health
   ```
   期望结果：服务正常响应

### 7.3 数据回滚可行性

| 变更类型 | 可逆性 | 说明 |
|----------|--------|------|
| 代码变更 | ✅ 可逆 | Git 版本控制 |
| Docker 镜像 | ✅ 可逆 | 重新构建旧版本镜像 |
| engine 枚举扩展 | ✅ 可逆 | 回滚代码后前端不展示 claude/gemini |
| quality_score 计算逻辑 | ✅ 可逆 | 回滚后新内容恢复默认评分 |
| 已有 generated_contents 数据 | ⚠️ 不变 | engine 字段值保留，不受回滚影响 |
| OSS 已上传文件 | ⚠️ 不可逆 | 文件持久化在 OSS，需手动清理 |

### 7.4 通知协议

| 通知对象 | 通知渠道 | 通知时机 |
|----------|----------|----------|
| 开发团队 | Slack #engineering | 回滚开始、完成 |
| 产品团队 | Slack #product | 回滚原因、影响 |
| 用户 | 邮件/公告 | 服务中断通知 |

---

## 附录

### A. Docker Compose 参考配置

> 以下为简化参考模板，实际配置见 `docker/docker-compose.yml`。

```yaml
# docker/docker-compose.yml（实际配置）
version: "3.8"
services:
  postgres:
    image: postgres:15
    container_name: georank-postgres
    environment:
      POSTGRES_DB: georank
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../database/schema.sql:/docker-entrypoint-initdb.d/schema.sql:ro
      - ../database/initial-data.sql:/docker-entrypoint-initdb.d/initial-data.sql:ro
    networks:
      - georank-network

  redis:
    image: redis:7-alpine
    container_name: georank-redis
    ports:
      - "6379:6379"
    networks:
      - georank-network

  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: georank-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/georank
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY:-change-me-in-production}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - georank-network

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: georank-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - georank-network

networks:
  georank-network:
    driver: bridge

volumes:
  postgres_data:
```

### B. v2.3 引擎分级说明

**引擎分级策略：**

| 引擎 | 类型 | Free | Pro | Agency |
|------|------|------|-----|--------|
| mimo | standard | ✅ | ✅ | ✅ |
| deepseek | standard | ✅ | ✅ | ✅ |
| openai | standard | ✅ | ✅ | ✅ |
| qianwen | standard | ✅ | ✅ | ✅ |
| claude | premium | ❌ | ❌ | ✅ |
| gemini | premium | ❌ | ❌ | ✅ |

**后端保护**：`routers/content.py` 的 `generate` 端点在处理 premium 引擎前查询 `get_user_plan_code(db, user.id)`，非 agency 计划返回 HTTP 403。

**前端保护**（defense-in-depth）：`content/page.js` 的 `availableModels` 根据 `userPlan` state 动态过滤下拉框选项。前端过滤不是主门控，后端 403 才是最终保障。

**降级场景**：用户从 Agency 降级为 Pro 后，localStorage 可能残留 claude/gemini 选择。页面加载时 `useEffect` 会重置为 mimo（BUG-01 已修复）。

### C. 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 502 Bad Gateway | 后端容器未启动 | `cd docker && docker compose logs backend` 查看错误 |
| 504 Gateway Timeout | LLM 生成超时 | 检查 `proxy_read_timeout`，确认 AI API Key 有效 |
| 403 Engine Forbidden | 非 Agency 用户选择 claude/gemini | 正常行为，前端应已过滤；若前端也出现则检查 `userPlan` state |
| 数据库连接失败 | PostgreSQL 容器未启动 | `cd docker && docker compose up -d postgres` |
| Redis 连接失败 | Redis 容器未启动 | `cd docker && docker compose up -d redis` |
| 图片上传失败 | OSS 配置错误或本地目录权限 | 检查 STORAGE_BACKEND 配置，确认 uploads/ 目录可写 |
| 缩略图生成失败 | Pillow 未安装或图片损坏 | 检查 backend 容器中 Pillow 版本，查看日志中 "Thumbnail generation failed" |
| 质量评分异常 | quality_checker 逻辑错误 | 查看日志中 `check_quality` 输出，确认 brand_name 正确传入 |
| 内容生成 500 错误 | AI API Key 未配置或无效 | 检查对应引擎的 API_KEY 环境变量 |
| 引擎下拉框显示不全 | 前端 userPlan 未加载 | 检查 subscriptionAPI 是否正常返回，确认 localStorage 无残留 |

### D. 联系方式

| 角色 | 联系方式 |
|------|----------|
| 运维负责人 | {运维负责人邮箱} |
| 开发负责人 | {开发负责人邮箱} |
| 紧急联系人 | {紧急联系人电话} |
