# 架构设计 · GeoRank v3.0

> 版本：v3.0 | 创建：2026-06-05 | 范围：技术债清理 + Add-on 购买流程

---

## 1. 架构影响分析

### 1.1 受影响模块

| 现有模块 | 变更类型 | 说明 |
|----------|----------|------|
| `routers/api_keys` | 重构 | 内存存储迁移到数据库 |
| `routers/content` | 优化 | threading.Thread 替换为 Celery task |
| `services/content_generator` | 优化 | JSON 解析方式优化 |
| `services/quality_checker` | 优化 | 引入 jieba 分词 |
| `services/usage_tracker` | 优化 | Redis 连接池配置 |
| `services/adoption_verifier` | 重构 | 外部服务集成规范 |
| `scheduler.py` | 重构 | Celery beat 替代 APScheduler |
| `frontend/src/` | 重构 | 全量 TypeScript 迁移 |
| `components/TipTapEditor` | 增强 | 拖拽/粘贴上传、字数统计 |

### 1.2 新增模块

| 新增模块 | 职责 |
|----------|------|
| `models/api_key.py` | API Key 数据库模型 |
| `celery_app.py` | Celery 应用配置 |
| `celery_tasks/` | Celery 任务定义 |
| `services/serp_gateway.py` | SERP API 网关（替代直接爬取） |
| `frontend/src/types/` | TypeScript 类型定义 |
| `frontend/src/lib/word-count.ts` | 中文字数统计工具 |

### 1.3 新增能力

- **可靠的任务队列**：Celery + Redis，支持任务重试、结果持久化、分布式锁
- **持久化 API Key**：数据库存储，多 worker 共享，重启不丢失
- **准确的中文分词**：jieba 分词 + 前端正则，字数统计偏差 ≤5%
- **流畅的编辑体验**：拖拽/粘贴上传、虚拟滚动
- **弹性资源购买**：Add-on 按量加购，配额自动合并

---

## 2. 逻辑架构设计

### 2.1 模块依赖图（v3.0 变更部分）

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend (TypeScript)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Dashboard │ │ Content  │ │Subscription│ │ Add-on    │ │
│  │ (虚拟滚动) │ │ (拖拽上传) │ │ (加购 Tab) │ │ (购买)    │ │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘ └─────┬──────┘ │
│       │            │              │              │         │
│  ┌────┴────────────┴──────────────┴──────────────┴──────┐ │
│  │              types/ (TypeScript 类型定义)              │ │
│  │              lib/word-count.ts (中文字数)              │ │
│  └────────────────────────┬────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────┘
                            │ HTTP
┌───────────────────────────┼──────────────────────────────┐
│                    FastAPI Backend                         │
│                           │                                │
│  ┌────────────────────────┴────────────────────────────┐ │
│  │         subscription_gate middleware                  │ │
│  │    (认证 → 功能检查 → 配额检查 → Add-on 合并)        │ │
│  └───┬──────────┬──────────┬──────────┬────────────────┘ │
│      │          │          │          │                    │
│  ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴──────┐            │
│  │content│ │subscription│ │api_keys│ │white_label│            │
│  │router │ │  router    │ │(DB存储)│ │  router   │            │
│  └───┬───┘ └───┬───────┘ └───┬───┘ └───┬──────┘            │
│      │         │             │         │                    │
│  ┌───┴─────────┴─────────────┴─────────┴─────────────────┐ │
│  │                  Celery Tasks                          │ │
│  │  generate_content | check_adoption | sync_usage       │ │
│  │  expire_addons | check_usage_warnings                 │ │
│  └───┬──────────────────────────────────────────────────┘ │
│      │                                                     │
│  ┌───┴──────────────────────────────────────────────────┐ │
│  │                  Service Layer                         │ │
│  │  content_generator | quality_checker (jieba)           │ │
│  │  usage_tracker (Redis 连接池) | adoption_verifier      │ │
│  │  serp_gateway (合规 SERP API) | billing (Add-on)       │ │
│  └───┬──────────────────────────────────────────────────┘ │
│      │                                                     │
│  ┌───┴──────────────────────────────────────────────────┐ │
│  │              PostgreSQL + Redis                        │ │
│  │  api_keys 表 | addon_purchases 表 | UsageRecord       │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 2.2 Celery 任务架构

```
┌─────────────────────────────────────────────────────────┐
│                    Celery App                             │
│  Broker: Redis (db=1)                                    │
│  Result Backend: Redis (db=2)                            │
├─────────────────────────────────────────────────────────┤
│  Tasks:                                                   │
│  ├── content_tasks.py                                    │
│  │   ├── generate_content_async (原 threading)           │
│  │   └── regenerate_content_async (原同步)               │
│  ├── adoption_tasks.py                                   │
│  │   └── check_adoption (定时)                           │
│  ├── usage_tasks.py                                      │
│  │   ├── sync_usage_to_db (每小时)                       │
│  │   └── check_usage_warnings (每 6 小时)                │
│  └── addon_tasks.py                                      │
│      └── expire_addons (每日)                            │
├─────────────────────────────────────────────────────────┤
│  Beat Schedule:                                           │
│  ├── check_adoption: 每 24 小时                          │
│  ├── sync_usage_to_db: 每 1 小时                         │
│  ├── check_usage_warnings: 每 6 小时                     │
│  └── expire_addons: 每日 00:00                           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 数据与状态设计

### 3.1 新增表：api_keys

```sql
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(50) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 哈希
    key_prefix VARCHAR(16) NOT NULL,       -- 显示用前缀
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

### 3.2 新增表：addon_purchases

```sql
CREATE TABLE addon_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    addon_type VARCHAR(32) NOT NULL,  -- brand_slot / query_pack / content_pack
    quantity INTEGER NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_session_id VARCHAR(255),
    status VARCHAR(16) DEFAULT 'pending',  -- pending / active / expired / cancelled
    plan_period_start TIMESTAMP NOT NULL,
    plan_period_end TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addon_user_status ON addon_purchases(user_id, status, expires_at);
CREATE UNIQUE INDEX idx_addon_unique ON addon_purchases(user_id, addon_type, plan_period_start);
```

### 3.3 配额合并算法

```
实际可用配额 = 基础计划配额 + SUM(有效 Add-on 额度)

查询 SQL:
SELECT COALESCE(SUM(quantity), 0) as addon_quota
FROM addon_purchases
WHERE user_id = :user_id
  AND addon_type = :dimension
  AND status = 'active'
  AND expires_at > NOW()

最终配额 = plan_limit + addon_quota
```

---

## 4. 非功能性分析

| 维度 | 目标 | 实现方式 |
|------|------|----------|
| 任务可靠性 | 进程重启后任务可恢复 | Celery + Redis 持久化 |
| API Key 持久性 | 多 worker 共享，重启不丢失 | PostgreSQL 存储 |
| 中文字数准确性 | 偏差 ≤5% | jieba 分词 + 前端正则 |
| 列表渲染性能 | 100+ 条首屏 <100ms | @tanstack/react-virtual |
| 编辑器响应 | 拖放→图片显示 ≤3s | TipTap 事件 + XHR 进度 |
| 测试覆盖率 | 核心路径 ≥80% | pytest + pytest-asyncio |
| Redis 连接 | max_connections=20 | ConnectionPool 配置 |

---

## 5. 风险与权衡

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| TS 迁移引入运行时 Bug | 中 | 功能异常 | 分阶段迁移 + 每阶段冒烟测试 |
| Celery 增加部署复杂度 | 中 | 运维成本 | Docker Compose 一键部署 |
| jieba 首次加载慢 (~2s) | 中 | 首次请求延迟 | startup 事件后台预加载 |
| Add-on 与订阅周期不同步 | 低 | 配额计算错误 | Webhook 从 Stripe 获取周期时间 |
| 虚拟滚动动态行高跳动 | 中 | 列表体验差 | measureElement 动态测量 |

---

## 6. 替代方案

### 方案 A：保持 threading + 内存存储（拒绝）

**理由**：不解决根本问题，进程重启仍丢失任务和 API Key。技术债持续累积。

### 方案 B：使用 Redis Streams 替代 Celery（拒绝）

**理由**：Redis Streams 功能有限，缺少任务重试、结果存储、定时调度等 Celery 内置功能。团队熟悉 Celery，学习成本低。

### 方案 C：TypeScript 迁移使用渐进式（采纳）

**理由**：全量迁移风险高，分 4 阶段执行，每阶段验证通过后再推进。允许 .js 和 .ts 共存过渡期。

---

## 7. API Contract 变更

### 7.1 新增端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/subscription/addon/checkout` | 创建 Add-on Checkout Session |
| GET | `/api/subscription/addons` | 查询已购 Add-on 列表 |

### 7.2 变更端点

| 端点 | 变更 | 说明 |
|------|------|------|
| `POST /api/content/generate` | 返回 task_id | Celery task 替代 threading |
| `GET /api/content/{id}` | 返回 task_status | 轮询 Celery 任务状态 |
| `GET /api/usage/current` | 增加 addon_quota | 合并 Add-on 配额 |

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 门控 2 · 架构师
交付物：`.ai/temp/architect-v3.md`
摘要：v3.0 架构设计聚焦 Celery 迁移、API Key 数据库化、TypeScript 迁移、Add-on 配额合并。新增 2 张表、4 个 Celery 任务、2 个 API 端点。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入 `approve` 推进至第 2b 阶段（数据库设计）
输入 `return [原因]` 退回当前阶段修改
