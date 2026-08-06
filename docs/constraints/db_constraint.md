# 数据库约束

## 命名规范
- 表名：snake_case，复数形式（如 `users`, `order_items`）
- 字段名：snake_case
- 主键统一：`id`（BIGSERIAL）
- 外键：`{关联表单数}_id`（如 `user_id`, `order_id`）

## 强制字段
所有业务表必须包含：
- `id` BIGSERIAL PRIMARY KEY
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `created_by` BIGINT
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `updated_by` BIGINT
- `is_deleted` BOOLEAN DEFAULT FALSE
- `deleted_at` TIMESTAMP WITH TIME ZONE NULL

## 类型约束
- 金额：DECIMAL(18,4) — 禁止 FLOAT/DOUBLE[CLAUDE.md](../../CLAUDE_V1.md)
- 布尔：BOOLEAN — 禁止 INT/CHAR 代替
- 时间：TIMESTAMP WITH TIME ZONE — 禁止 DATE 或无时区 TIMESTAMP
- 枚举：VARCHAR + CHECK 约束 或 PostgreSQL ENUM 类型
- JSON：JSONB（需要索引时）/ JSON（纯存储）

## 索引约束
- 每张表主键自动聚簇
- 外键字段必须创建索引
- 高频查询字段：按查询模式创建复合索引
- 低选择性字段（如 is_deleted）：禁止单独建索引
- 超过 3 个字段的复合索引需评审

## 安全约束
- PII 字段（手机号、邮箱、身份证）：应用层 AES-256-GCM 加密后存储
- 密码：bcrypt/argon2 哈希，禁止明文或可逆加密
- 审计日志：关键操作记录到独立审计表

## 分区策略
- 预估超 100 万行的表：按时间范围分区
- 日志/审计表：按月自动分区
