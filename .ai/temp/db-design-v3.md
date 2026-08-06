# 数据库设计 · GeoRank v3.0

> 版本：v3.0 | 创建：2026-06-05 | 范围：新增 api_keys + addon_purchases 表

---

## 1. 新增表：api_keys

### 业务用途

存储 Agency 用户的 API Key，支持持久化、多 worker 共享、重启不丢失。

### 字段表

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | SERIAL | NO | auto | 主键 | 公开 |
| user_id | INTEGER | NO | — | 关联用户 ID | 公开 |
| name | VARCHAR(50) | NO | — | Key 名称（如"生产环境"） | 公开 |
| key_hash | VARCHAR(64) | NO | — | SHA-256 哈希值 | 加密存储 |
| key_prefix | VARCHAR(16) | NO | — | 显示用前缀（如"gr_abc123..."） | 公开 |
| expires_at | TIMESTAMP | NO | — | 过期时间 | 公开 |
| last_used_at | TIMESTAMP | YES | NULL | 最后使用时间 | 公开 |
| is_active | BOOLEAN | NO | TRUE | 是否有效 | 公开 |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 创建时间 | 公开 |
| created_by | INTEGER | YES | NULL | 创建人 | 公开 |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 更新时间 | 公开 |
| updated_by | INTEGER | YES | NULL | 更新人 | 公开 |

### 索引策略

| 索引名 | 类型 | 字段 | 理由 |
|--------|------|------|------|
| api_keys_pkey | PRIMARY | id | 主键 |
| idx_api_keys_user | INDEX | user_id | 查询用户的 Key 列表 |
| idx_api_keys_hash | UNIQUE INDEX | key_hash | 验证 Key 唯一性 |
| idx_api_keys_active | INDEX | (user_id, is_active, expires_at) | 查询有效 Key |

### 关系

- `user_id` → `users.id`（应用层维护，无数据库外键约束）

### 性能备注

- 预估数据量：<1000 行（每用户最多 3 个 Key）
- 查询模式：按 user_id 查询列表，按 key_hash 验证
- 无需分页

### 安全备注

- `key_hash` 存储 SHA-256 哈希，不存储原始 Key
- 原始 Key 仅在创建时返回一次

---

## 2. 新增表：addon_purchases

### 业务用途

记录用户的 Add-on 购买记录，支持配额合并计算和到期管理。

### 字段表

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | SERIAL | NO | auto | 主键 | 公开 |
| user_id | INTEGER | NO | — | 关联用户 ID | 公开 |
| addon_type | VARCHAR(32) | NO | — | Add-on 类型：brand_slot/query_pack/content_pack | 公开 |
| quantity | INTEGER | NO | — | 购买数量 | 公开 |
| amount | DECIMAL(18,4) | NO | — | 支付金额 | 公开 |
| currency | VARCHAR(3) | NO | 'USD' | 货币代码 | 公开 |
| stripe_session_id | VARCHAR(255) | YES | NULL | Stripe Checkout Session ID | 公开 |
| status | VARCHAR(16) | NO | 'pending' | 状态：pending/active/expired/cancelled | 公开 |
| plan_period_start | TIMESTAMP | NO | — | 关联订阅周期开始 | 公开 |
| plan_period_end | TIMESTAMP | NO | — | 关联订阅周期结束 | 公开 |
| expires_at | TIMESTAMP | NO | — | Add-on 到期时间 | 公开 |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 创建时间 | 公开 |
| created_by | INTEGER | YES | NULL | 创建人 | 公开 |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 更新时间 | 公开 |
| updated_by | INTEGER | YES | NULL | 更新人 | 公开 |

### 索引策略

| 索引名 | 类型 | 字段 | 理由 |
|--------|------|------|------|
| addon_purchases_pkey | PRIMARY | id | 主键 |
| idx_addon_user_status | INDEX | (user_id, status, expires_at) | 查询用户有效 Add-on |
| idx_addon_unique | UNIQUE | (user_id, addon_type, plan_period_start) | 防止同周期重复购买 |
| idx_addon_expiring | INDEX | (status, expires_at) | 定时任务查询过期 Add-on |

### 关系

- `user_id` → `users.id`（应用层维护，无数据库外键约束）

### 性能备注

- 预估数据量：<10000 行（每用户每月最多 3 个 Add-on）
- 查询模式：按 user_id 查询有效 Add-on，按 expires_at 查询过期记录
- 配额合并查询：`SELECT addon_type, SUM(quantity) WHERE user_id=:uid AND status='active' AND expires_at>NOW() GROUP BY addon_type`

### 安全备注

- `amount` 使用 DECIMAL(18,4)，严禁 FLOAT/DOUBLE
- `stripe_session_id` 用于幂等性检查

---

## 3. 变更表：subscription_plans

### 变更说明

新增 Add-on 价格配置字段。

### 新增字段

| 字段名 | 类型 | 可空 | 默认值 | COMMENT |
|--------|------|------|--------|---------|
| addon_brand_slot_price | DECIMAL(18,4) | NO | 10.0000 | 额外品牌位单价（$/个/月） |
| addon_query_pack_price | DECIMAL(18,4) | NO | 15.0000 | 查询词包单价（$/50词/月） |
| addon_content_pack_price | DECIMAL(18,4) | NO | 15.0000 | 内容生成包单价（$/20篇/月） |

---

## 4. DDL 脚本

```sql
-- v3.0 新增表

-- API Key 表
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    key_hash VARCHAR(64) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(user_id, is_active, expires_at);

COMMENT ON TABLE api_keys IS 'API Key 持久化存储';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 哈希值，不存储原始 Key';
COMMENT ON COLUMN api_keys.key_prefix IS '显示用前缀，如 gr_abc123...';

-- Add-on 购买记录表
CREATE TABLE IF NOT EXISTS addon_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    addon_type VARCHAR(32) NOT NULL,
    quantity INTEGER NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_session_id VARCHAR(255),
    status VARCHAR(16) DEFAULT 'pending',
    plan_period_start TIMESTAMP NOT NULL,
    plan_period_end TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_addon_user_status ON addon_purchases(user_id, status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_addon_unique ON addon_purchases(user_id, addon_type, plan_period_start);
CREATE INDEX IF NOT EXISTS idx_addon_expiring ON addon_purchases(status, expires_at);

COMMENT ON TABLE addon_purchases IS 'Add-on 购买记录';
COMMENT ON COLUMN addon_purchases.addon_type IS 'brand_slot=额外品牌位, query_pack=查询词包, content_pack=内容生成包';
COMMENT ON COLUMN addon_purchases.status IS 'pending=待支付, active=有效, expired=已过期, cancelled=已取消';

-- subscription_plans 表新增字段
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS addon_brand_slot_price DECIMAL(18,4) DEFAULT 10.0000,
ADD COLUMN IF NOT EXISTS addon_query_pack_price DECIMAL(18,4) DEFAULT 15.0000,
ADD COLUMN IF NOT EXISTS addon_content_pack_price DECIMAL(18,4) DEFAULT 15.0000;

COMMENT ON COLUMN subscription_plans.addon_brand_slot_price IS '额外品牌位单价（$/个/月）';
COMMENT ON COLUMN subscription_plans.addon_query_pack_price IS '查询词包单价（$/50词/月）';
COMMENT ON COLUMN subscription_plans.addon_content_pack_price IS '内容生成包单价（$/20篇/月）';
```

---

## 5. 种子数据

```sql
-- 更新现有计划的 Add-on 价格
UPDATE subscription_plans
SET addon_brand_slot_price = 10.0000,
    addon_query_pack_price = 15.0000,
    addon_content_pack_price = 15.0000
WHERE plan_code IN ('pro', 'agency');
```

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 门控 2（联合） · 架构师 + 数据库架构师
交付物：`.ai/temp/architect-v3.md` + `.ai/temp/db-design-v3.md`
摘要：新增 2 张表（api_keys, addon_purchases），变更 1 张表（subscription_plans 新增 Add-on 价格字段）。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入 `approve` 推进至第 3 阶段（UI 设计）
输入 `return [原因]` 退回当前阶段修改
