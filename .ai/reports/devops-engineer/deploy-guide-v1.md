# 部署指南 · GeoRank 商业化 MVP v1

## 1. 部署前检查清单

- [ ] QA 报告已审阅并确认 Go 状态
- [ ] 数据库备份已完成
- [ ] 所有环境变量已准备
- [ ] Stripe 测试模式已验证
- [ ] 域名和 SSL 证书已准备
- [ ] 服务器资源已确认（CPU/内存/磁盘）
- [ ] 回滚计划已审阅
- [ ] 部署窗口已确认（建议低峰时段）

---

## 2. 基础设施采购计划

| 项目 | 用途 | 推荐规格 | 预估费用 | 负责人 | 截止日期 |
|------|------|----------|----------|--------|----------|
| 云服务器（应用） | 运行 FastAPI + Next.js | 2 vCPU, 4GB RAM, 50GB SSD | $20/月 | - | 部署前 |
| MySQL 数据库 | 数据存储 | 2 vCPU, 4GB RAM, 100GB SSD | $30/月 | - | 部署前 |
| Redis | 缓存和会话 | 1 vCPU, 1GB RAM | $10/月 | - | 部署前 |
| 域名 | 访问入口 | .com 域名 | $12/年 | - | 部署前 |
| SSL 证书 | HTTPS | Let's Encrypt（免费） | $0 | - | 部署前 |
| Stripe 账户 | 支付处理 | 测试模式 → 生产模式 | 2.9% + $0.30/笔 | - | 部署前 |

**总计预估费用**：约 $72/月 + 交易手续费

---

## 3. 第三方服务集成

| 服务 | 提供商 | 凭证类型 | 环境变量名 | 获取方式 | 验证方法 |
|------|--------|----------|------------|----------|----------|
| Stripe | Stripe Inc. | Secret Key + Webhook Secret | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Stripe Dashboard → Developers → API Keys | 创建测试 Checkout Session |
| OpenAI | OpenAI | API Key | OPENAI_API_KEY | OpenAI Platform → API Keys | 发送测试请求 |
| Claude | Anthropic | API Key | ANTHROPIC_API_KEY | Anthropic Console → API Keys | 发送测试请求 |
| Gemini | Google | API Key | GOOGLE_API_KEY | Google AI Studio → API Keys | 发送测试请求 |
| DeepSeek | DeepSeek | API Key | DEEPSEEK_API_KEY | DeepSeek Platform → API Keys | 发送测试请求 |
| Qianwen | Alibaba Cloud | API Key | QIANWEN_API_KEY | Alibaba Cloud → DashScope | 发送测试请求 |
| Mimo | Xiaomi | API Key | MIMO_API_KEY | Xiaomi AI Platform → API Keys | 发送测试请求 |

**测试环境凭证**：使用各平台的测试/开发凭证
**生产环境凭证**：使用各平台的生产凭证，确保已启用计费

---

## 4. 环境配置

### 4.1 后端环境变量

| 环境变量 | 描述 | 示例值 | 作用域 | 是否必须 |
|----------|------|--------|--------|----------|
| DATABASE_URL | MySQL 连接字符串 | mysql+pymysql://user:pass@host:3306/georank | 后端 | 是 |
| REDIS_URL | Redis 连接字符串 | redis://:password@host:6379/0 | 后端 | 是 |
| SECRET_KEY | JWT 签名密钥 | {RANDOM_64_CHAR_STRING} | 后端 | 是 |
| ALGORITHM | JWT 算法 | HS256 | 后端 | 是 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token 过期时间 | 1440 | 后端 | 否 |
| STRIPE_SECRET_KEY | Stripe Secret Key | sk_test_... / sk_live_... | 后端 | 是 |
| STRIPE_WEBHOOK_SECRET | Stripe Webhook Secret | whsec_test_... / whsec_live_... | 后端 | 是 |
| OPENAI_API_KEY | OpenAI API Key | sk-... | 后端 | 是 |
| ANTHROPIC_API_KEY | Anthropic API Key | sk-ant-... | 后端 | 是 |
| GOOGLE_API_KEY | Google Gemini API Key | AIza... | 后端 | 是 |
| DEEPSEEK_API_KEY | DeepSeek API Key | sk-... | 后端 | 是 |
| QIANWEN_API_KEY | Qianwen API Key | sk-... | 后端 | 是 |
| MIMO_API_KEY | Mimo API Key | sk-... | 后端 | 是 |
| ALLOWED_ORIGINS | CORS 允许的源 | https://yourdomain.com | 后端 | 是 |
| REDIS_PASSWORD | Redis 密证 | {REDIS_PASSWORD} | 后端 | 否 |

### 4.2 前端环境变量

| 环境变量 | 描述 | 示例值 | 作用域 | 是否必须 |
|----------|------|--------|--------|----------|
| NEXT_PUBLIC_API_URL | 后端 API 地址 | https://api.yourdomain.com | 前端 | 是 |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe 公钥 | pk_test_... / pk_live_... | 前端 | 是 |

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
   free -h  # 内存
   df -h    # 磁盘
   nproc    # CPU 核心数
   ```
   期望结果：资源充足

### 5.2 数据库初始化

3. **创建数据库**
   ```bash
   mysql -u root -p
   CREATE DATABASE georank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'georank'@'localhost' IDENTIFIED BY '{DB_PASSWORD}';
   GRANT ALL PRIVILEGES ON georank.* TO 'georank'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
   期望结果：数据库和用户创建成功

4. **导入数据库 Schema**
   ```bash
   mysql -u georank -p georank < database/schema.sql
   ```
   期望结果：所有表创建成功

5. **验证数据库表**
   ```bash
   mysql -u georank -p georank -e "SHOW TABLES;"
   ```
   期望结果：显示所有表

### 5.3 后端部署

6. **克隆代码**
   ```bash
   cd /opt
   git clone https://github.com/your-org/georank-mvp.git
   cd georank-mvp/backend
   ```

7. **创建虚拟环境**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

8. **配置环境变量**
   ```bash
   cp .env.example .env
   nano .env
   ```
   填写所有必须的环境变量（见 4.1 节）

9. **测试后端启动**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   期望结果：服务启动成功，无错误

10. **配置 Systemd 服务**
    ```bash
    sudo nano /etc/systemd/system/georank-backend.service
    ```
    
    内容：
    ```ini
    [Unit]
    Description=GeoRank Backend API
    After=network.target mysql.service redis.service
    
    [Service]
    Type=exec
    User=www-data
    Group=www-data
    WorkingDirectory=/opt/georank-mvp/backend
    Environment="PATH=/opt/georank-mvp/backend/venv/bin"
    ExecStart=/opt/georank-mvp/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    Restart=always
    RestartSec=5
    
    [Install]
    WantedBy=multi-user.target
    ```
    
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable georank-backend
    sudo systemctl start georank-backend
    sudo systemctl status georank-backend
    ```
    期望结果：服务状态为 active (running)

### 5.4 前端部署

11. **安装依赖**
    ```bash
    cd /opt/georank-mvp/frontend
    npm install
    ```

12. **配置环境变量**
    ```bash
    cp .env.example .env.local
    nano .env.local
    ```
    填写前端环境变量（见 4.2 节）

13. **构建前端**
    ```bash
    npm run build
    ```
    期望结果：构建成功，无错误

14. **启动前端**
    ```bash
    npm run start
    ```
    期望结果：前端服务启动成功

15. **配置 Systemd 服务**
    ```bash
    sudo nano /etc/systemd/system/georank-frontend.service
    ```
    
    内容：
    ```ini
    [Unit]
    Description=GeoRank Frontend
    After=network.target
    
    [Service]
    Type=exec
    User=www-data
    Group=www-data
    WorkingDirectory=/opt/georank-mvp/frontend
    Environment="PATH=/opt/georank-mvp/frontend/node_modules/.bin"
    ExecStart=/usr/bin/node /opt/georank-mvp/frontend/node_modules/.bin/next start -p 3000
    Restart=always
    RestartSec=5
    
    [Install]
    WantedBy=multi-user.target
    ```
    
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable georank-frontend
    sudo systemctl start georank-frontend
    sudo systemctl status georank-frontend
    ```
    期望结果：服务状态为 active (running)

### 5.5 Nginx 配置

16. **安装 Nginx**
    ```bash
    sudo apt update
    sudo apt install nginx -y
    ```

17. **配置 Nginx**
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
        }
    }
    ```
    
    ```bash
    sudo ln -s /etc/nginx/sites-available/georank /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```
    期望结果：Nginx 配置测试通过

### 5.6 SSL 证书

18. **安装 Certbot**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

19. **获取 SSL 证书**
    ```bash
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```
    期望结果：证书获取成功

20. **验证自动续期**
    ```bash
    sudo certbot renew --dry-run
    ```
    期望结果：续期测试成功

### 5.7 健康检查

21. **验证后端健康**
    ```bash
    curl https://api.yourdomain.com/api/public/health
    ```
    期望结果：`{"status":"ok"}`

22. **验证前端访问**
    ```bash
    curl -I https://yourdomain.com
    ```
    期望结果：HTTP 200

23. **验证数据库连接**
    ```bash
    curl https://api.yourdomain.com/api/subscription/plans
    ```
    期望结果：返回计划列表

### 5.8 冒烟测试

24. **用户注册测试**
    ```bash
    curl -X POST https://api.yourdomain.com/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
    ```
    期望结果：注册成功，返回用户信息

25. **用户登录测试**
    ```bash
    curl -X POST https://api.yourdomain.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"test123"}'
    ```
    期望结果：登录成功，返回 access_token

26. **CSRF Token 测试**
    ```bash
    curl -c cookies.txt https://api.yourdomain.com/api/public/csrf-token
    ```
    期望结果：返回 csrf_token，设置 cookie

---

## 6. 部署后验证

### 6.1 即时检查

- [ ] 后端服务状态：`sudo systemctl status georank-backend`
- [ ] 前端服务状态：`sudo systemctl status georank-frontend`
- [ ] Nginx 状态：`sudo systemctl status nginx`
- [ ] MySQL 状态：`sudo systemctl status mysql`
- [ ] Redis 状态：`sudo systemctl status redis`
- [ ] SSL 证书有效期：`sudo certbot certificates`
- [ ] 磁盘使用率：`df -h`（应 < 80%）
- [ ] 内存使用率：`free -h`（应 < 80%）

### 6.2 24 小时监控

**监控指标：**

| 指标 | 告警阈值 | 监控方式 |
|------|----------|----------|
| API 响应时间 | > 2 秒 | Nginx access log |
| 错误率 | > 1% | Nginx error log |
| CPU 使用率 | > 80% | top / htop |
| 内存使用率 | > 80% | free -h |
| 磁盘使用率 | > 90% | df -h |
| MySQL 连接数 | > 100 | MySQL status |
| Redis 内存 | > 80% | redis-cli info memory |

**日志位置：**

| 服务 | 日志路径 |
|------|----------|
| Nginx | /var/log/nginx/access.log, /var/log/nginx/error.log |
| 后端 | journalctl -u georank-backend -f |
| 前端 | journalctl -u georank-frontend -f |
| MySQL | /var/log/mysql/error.log |
| Redis | /var/log/redis/redis-server.log |

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
| 严重安全漏洞 | 发现被利用 |

### 7.2 回滚步骤

1. **停止新版本服务**
   ```bash
   sudo systemctl stop georank-backend
   sudo systemctl stop georank-frontend
   ```

2. **恢复代码**
   ```bash
   cd /opt/georank-mvp
   git checkout v1.0.0  # 或上一个稳定版本
   ```

3. **恢复依赖**
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   
   cd ../frontend
   npm install
   npm run build
   ```

4. **恢复数据库（如有必要）**
   ```bash
   mysql -u georank -p georank < /backups/georank_backup_YYYYMMDD.sql
   ```

5. **启动旧版本服务**
   ```bash
   sudo systemctl start georank-backend
   sudo systemctl start georank-frontend
   ```

6. **验证回滚**
   ```bash
   curl https://api.yourdomain.com/api/public/health
   ```
   期望结果：服务正常响应

### 7.3 数据回滚可行性

| 变更类型 | 可逆性 | 说明 |
|----------|--------|------|
| 代码变更 | ✅ 可逆 | Git 版本控制 |
| 新增表 | ✅ 可逆 | DROP TABLE |
| 新增字段 | ✅ 可逆 | ALTER TABLE DROP COLUMN |
| 数据变更 | ⚠️ 部分可逆 | 需要备份恢复 |
| 配置变更 | ✅ 可逆 | 恢复旧配置 |

### 7.4 通知协议

| 通知对象 | 通知渠道 | 通知时机 |
|----------|----------|----------|
| 开发团队 | Slack #engineering | 回滚开始、完成 |
| 产品团队 | Slack #product | 回滚原因、影响 |
| 用户 | 邮件/公告 | 服务中断通知 |

---

## 附录

### A. 常用命令

```bash
# 查看服务状态
sudo systemctl status georank-backend
sudo systemctl status georank-frontend

# 查看日志
journalctl -u georank-backend -f
journalctl -u georank-frontend -f

# 重启服务
sudo systemctl restart georank-backend
sudo systemctl restart georank-frontend

# 查看数据库
mysql -u georank -p georank -e "SHOW TABLES;"

# 查看 Redis
redis-cli -a {REDIS_PASSWORD} INFO

# 查看 Nginx 配置
sudo nginx -t
```

### B. 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 502 Bad Gateway | 后端服务未启动 | 检查后端服务状态 |
| 504 Gateway Timeout | 后端响应超时 | 检查后端日志 |
| 数据库连接失败 | 数据库服务未启动 | 检查 MySQL 状态 |
| Redis 连接失败 | Redis 服务未启动 | 检查 Redis 状态 |
| SSL 证书错误 | 证书过期或配置错误 | 重新获取证书 |

### C. 联系方式

| 角色 | 联系方式 |
|------|----------|
| 运维负责人 | {运维负责人邮箱} |
| 开发负责人 | {开发负责人邮箱} |
| 紧急联系人 | {紧急联系人电话} |
