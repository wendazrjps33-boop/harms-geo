# 数据库设计 · GeoRank 商业化 MVP

> 数据库：PostgreSQL 16+（db_approach: database-first）
> 现有 MySQL 表需迁移至 PostgreSQL，迁移方案见附录。

---

## 1. 新增表总览

| 表名 | 业务用途 | 预估数据量 |
|------|----------|-----------|
| `subscription_plans` | 订阅计划定义（静态配置） | 3-5 行 |
| `user_subscriptions` | 用户订阅状态与 Stripe 关联 | ~用户数 |
| `usage_records` | 用户用量计量（按维度按周期） | ~用户数 × 维度 × 月数 |
| `generated_contents` | AI 生成内容及分发状态 | ~用户数 × 50 篇/月 |
| `content_distributions` | 内容分发到各平台的记录 | ~内容数 × 2 平台 |
| `adoption_checks` | 采纳效果检测结果 | ~内容数 × 3 检测类型 × 3 时间点 |
| `brand_profiles` | 品牌详细资料（内容生成输入） | ~品牌数 |
| `team_members` | 团队成员关系（Agency） | ~团队数 × 5 人 |

---

## 2. 表详细设计

### 2.1 subscription_plans

**业务用途**：定义订阅计划的配额和功能权限，管理后台可动态调整。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| plan_code | VARCHAR(20) | NO | — | 计划编码：free/pro/agency | 公开 |
| name | VARCHAR(50) | NO | — | 计划显示名称 | 公开 |
| price_monthly | DECIMAL(18,4) | NO | 0 | 月付价格（美元） | 公开 |
| price_yearly | DECIMAL(18,4) | NO | 0 | 年付价格（美元） | 公开 |
| brand_limit | INT | NO | 1 | 最大品牌数 | 公开 |
| query_limit_per_brand | INT | NO | 5 | 每品牌最大查询词数 | 公开 |
| engine_limit | INT | NO | 2 | 可用 AI 引擎数（2 或 6） | 公开 |
| allowed_engines | JSONB | NO | '["openai","deepseek"]' | 允许的引擎列表 | 公开 |
| check_interval_hours | INT | NO | 0 | 自动检查间隔（小时，0=仅手动） | 公开 |
| history_days | INT | NO | 7 | 历史数据保留天数 | 公开 |
| competitor_limit | INT | NO | 0 | 每品牌最大竞品数 | 公开 |
| content_monthly_limit | INT | NO | 0 | 每月内容生成篇数 | 公开 |
| content_types_allowed | JSONB | NO | '[]' | 允许的内容类型 | 公开 |
| team_members | INT | NO | 1 | 最大团队成员数 | 公开 |
| api_access | BOOLEAN | NO | FALSE | 是否开放 API 接入 | 公开 |
| white_label | BOOLEAN | NO | FALSE | 是否支持白标报告 | 公开 |
| report_watermark | BOOLEAN | NO | TRUE | 报告是否带水印 | 公开 |
| is_active | BOOLEAN | NO | TRUE | 计划是否上架 | 公开 |
| sort_order | INT | NO | 0 | 展示排序 | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |
| created_by | BIGINT | YES | NULL | 创建人 | 公开 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新时间 | 公开 |
| updated_by | BIGINT | YES | NULL | 更新人 | 公开 |
| is_deleted | BOOLEAN | NO | FALSE | 软删除标记 | 公开 |
| deleted_at | TIMESTAMPTZ | YES | NULL | 删除时间 | 公开 |

**索引策略**：
- 主键：`id`（自动聚簇）
- 唯一索引：`idx_subscription_plans_code` ON (plan_code) WHERE is_deleted = FALSE
- 无其他索引（静态配置表，全量缓存到 Redis）

**种子数据**：

```sql
INSERT INTO subscription_plans (plan_code, name, price_monthly, price_yearly, brand_limit, query_limit_per_brand, engine_limit, allowed_engines, check_interval_hours, history_days, competitor_limit, content_monthly_limit, content_types_allowed, team_members, api_access, white_label, report_watermark, sort_order) VALUES
('free', 'Free', 0, 0, 1, 5, 2, '["openai","deepseek"]', 0, 7, 0, 0, '[]', 1, FALSE, TRUE, TRUE, 1),
('pro', 'Pro', 49.0000, 470.4000, 5, 20, 6, '["openai","claude","gemini","deepseek","qianwen","mimo"]', 24, 90, 3, 10, '["faq","community_qa","article","press_release"]', 1, FALSE, FALSE, FALSE, 2),
('agency', 'Agency', 199.0000, 1910.4000, 25, 50, 6, '["openai","claude","gemini","deepseek","qianwen","mimo"]', 4, 365, 10, 50, '["faq","community_qa","article","press_release"]', 5, TRUE, TRUE, FALSE, 3);
```

---

### 2.2 user_subscriptions

**业务用途**：跟踪每个用户的订阅状态、Stripe 关联和计费周期。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| user_id | BIGINT | NO | — | 关联用户 | 公开 |
| plan_code | VARCHAR(20) | NO | 'free' | 当前计划编码 | 公开 |
| status | VARCHAR(20) | NO | 'active' | 状态：trialing/active/canceled/past_due | 公开 |
| billing_cycle | VARCHAR(10) | NO | 'monthly' | 计费周期：monthly/yearly | 公开 |
| current_period_start | TIMESTAMPTZ | NO | NOW() | 当前计费周期开始 | 公开 |
| current_period_end | TIMESTAMPTZ | NO | NOW() + 30d | 当前计费周期结束 | 公开 |
| cancel_at_period_end | BOOLEAN | NO | FALSE | 是否到期取消 | 公开 |
| trial_end | TIMESTAMPTZ | YES | NULL | 试用期结束时间 | 公开 |
| stripe_customer_id | VARCHAR(255) | YES | NULL | Stripe 客户 ID | PII |
| stripe_subscription_id | VARCHAR(255) | YES | NULL | Stripe 订阅 ID | 公开 |
| canceled_at | TIMESTAMPTZ | YES | NULL | 取消时间 | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |
| created_by | BIGINT | YES | NULL | 创建人 | 公开 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新时间 | 公开 |
| updated_by | BIGINT | YES | NULL | 更新人 | 公开 |
| is_deleted | BOOLEAN | NO | FALSE | 软删除标记 | 公开 |
| deleted_at | TIMESTAMPTZ | YES | NULL | 删除时间 | 公开 |

**索引策略**：
- 主键：`id`
- 唯一索引：`idx_user_subscriptions_user` ON (user_id) WHERE is_deleted = FALSE — 每用户仅一条活跃订阅
- 索引：`idx_user_subscriptions_status` ON (status) WHERE is_deleted = FALSE — 用于定时任务扫描
- 索引：`idx_user_subscriptions_stripe_customer` ON (stripe_customer_id) — Webhook 回调查询

**关系**：
- `user_id` → `users.id`（应用层维护，不加 DB 约束，因跨表操作需事务控制）
- `plan_code` → `subscription_plans.plan_code`（应用层维护）

---

### 2.3 usage_records

**业务用途**：记录用户各维度用量（品牌数、查询词数、检查次数、内容生成次数），用于配额判定和历史分析。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| user_id | BIGINT | NO | — | 关联用户 | 公开 |
| dimension | VARCHAR(20) | NO | — | 计量维度：brand/query/check/content | 公开 |
| period_start | TIMESTAMPTZ | NO | — | 计费周期开始 | 公开 |
| period_end | TIMESTAMPTZ | NO | — | 计费周期结束 | 公开 |
| used_count | INT | NO | 0 | 已使用量 | 公开 |
| limit_count | INT | NO | 0 | 配额上限 | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新时间 | 公开 |

**索引策略**：
- 主键：`id`
- 唯一索引：`idx_usage_records_unique` ON (user_id, dimension, period_start) — 每用户每维度每周期一条
- 索引：`idx_usage_records_user` ON (user_id, dimension) WHERE used_count > 0

**性能备注**：
- 高频读写表（每次操作前检查），Redis 缓存实时计数，每日批量同步到此表
- 不需要 `is_deleted`/`deleted_at`（用量记录不可删除）

---

### 2.4 brand_profiles

**业务用途**：存储品牌详细资料，作为 AI 内容生成的输入数据源。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| brand_id | BIGINT | NO | — | 关联品牌 | 公开 |
| brand_description | TEXT | YES | NULL | 品牌描述（用户输入） | 公开 |
| core_products | TEXT | YES | NULL | 核心产品/服务描述 | 公开 |
| target_audience | TEXT | YES | NULL | 目标受众描述 | 公开 |
| key_selling_points | TEXT | YES | NULL | 核心卖点 | 公开 |
| industry | VARCHAR(100) | YES | NULL | 所属行业 | 公开 |
| website_crawled_data | JSONB | YES | NULL | 官网抓取结果缓存 | 公开 |
| website_crawled_at | TIMESTAMPTZ | YES | NULL | 上次抓取时间 | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |
| created_by | BIGINT | YES | NULL | 创建人 | 公开 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新时间 | 公开 |
| updated_by | BIGINT | YES | NULL | 更新人 | 公开 |
| is_deleted | BOOLEAN | NO | FALSE | 软删除标记 | 公开 |
| deleted_at | TIMESTAMPTZ | YES | NULL | 删除时间 | 公开 |

**索引策略**：
- 主键：`id`
- 唯一索引：`idx_brand_profiles_brand` ON (brand_id) WHERE is_deleted = FALSE — 每品牌一条资料

**关系**：`brand_id` → `brands.id`（应用层维护）

---

### 2.5 generated_contents

**业务用途**：存储 AI 生成的内容及其生命周期状态。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| user_id | BIGINT | NO | — | 内容所有者 | 公开 |
| brand_id | BIGINT | NO | — | 关联品牌 | 公开 |
| content_type | VARCHAR(30) | NO | — | 内容类型：faq/community_qa/article/press_release | 公开 |
| title | VARCHAR(500) | NO | — | 内容标题 | 公开 |
| body | TEXT | NO | — | 内容正文（plain text 或 HTML） | 公开 |
| tags | JSONB | YES | NULL | 标签/关键词数组 | 公开 |
| platform_format | VARCHAR(20) | NO | 'html' | 平台格式：markdown/html/plain/json_ld（新数据默认 html） | 公开 |
| distribution_guide | JSONB | YES | NULL | 分发指南（目标平台、步骤、时间） | 公开 |
| status | VARCHAR(20) | NO | 'draft' | 状态：generating/draft/ready/distributing/published/verified/failed | 公开 |
| source_analysis_run_id | BIGINT | YES | NULL | 来源分析运行 ID | 公开 |
| source_weak_keywords | JSONB | YES | NULL | 来源：薄弱关键词列表 | 公开 |
| source_competitor_gaps | JSONB | YES | NULL | 来源：竞品差距数据 | 公开 |
| published_at | TIMESTAMPTZ | YES | NULL | 用户标记的发布时间 | 公开 |
| target_platform | VARCHAR(30) | YES | NULL | 目标发布平台 | 公开 |
| target_platform_url | VARCHAR(2048) | YES | NULL | 发布后的平台 URL | 公开 |
| quality_score | DECIMAL(5,2) | YES | NULL | 内容质量评分（0-100） | 公开 |
| word_count | INT | NO | 0 | 字数统计 | 公开 |
| engine | VARCHAR(20) | NO | 'mimo' | 生成所用 AI 引擎：mimo/deepseek/openai/qianwen | 公开 |
| target_word_count | INT | NO | 1000 | 用户指定目标字数（≥500） | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |
| created_by | BIGINT | YES | NULL | 创建人 | 公开 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新时间 | 公开 |
| updated_by | BIGINT | YES | NULL | 更新人 | 公开 |
| is_deleted | BOOLEAN | NO | FALSE | 软删除标记 | 公开 |
| deleted_at | TIMESTAMPTZ | YES | NULL | 删除时间 | 公开 |

**索引策略**：
- 主键：`id`
- 索引：`idx_generated_contents_user_status` ON (user_id, status) WHERE is_deleted = FALSE — 内容列表查询
- 索引：`idx_generated_contents_brand` ON (brand_id, content_type) WHERE is_deleted = FALSE — 品牌维度查询
- 索引：`idx_generated_contents_published` ON (published_at) WHERE status = 'published' — 采纳检测定时扫描

**性能备注**：
- 预估数据量：1000 用户 × 50 篇/月 × 12 月 = 60 万行/年
- 超 100 万行后按 `created_at` 月份分区

---

### 2.6 content_distributions

**业务用途**：追踪每篇内容在各平台的分发记录。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| content_id | BIGINT | NO | — | 关联内容 | 公开 |
| platform | VARCHAR(30) | NO | — | 平台：reddit/quora/medium/zhihu/website/pr | 公开 |
| platform_url | VARCHAR(2048) | YES | NULL | 平台上的 URL | 公开 |
| status | VARCHAR(20) | NO | 'pending' | 状态：pending/published/indexed | 公开 |
| published_at | TIMESTAMPTZ | YES | NULL | 发布时间 | 公开 |
| indexed_at | TIMESTAMPTZ | YES | NULL | 被搜索引擎收录时间 | 公开 |
| notes | TEXT | YES | NULL | 用户备注 | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |
| created_by | BIGINT | YES | NULL | 创建人 | 公开 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新时间 | 公开 |
| updated_by | BIGINT | YES | NULL | 更新人 | 公开 |
| is_deleted | BOOLEAN | NO | FALSE | 软删除标记 | 公开 |
| deleted_at | TIMESTAMPTZ | YES | NULL | 删除时间 | 公开 |

**索引策略**：
- 主键：`id`
- 索引：`idx_content_distributions_content` ON (content_id) WHERE is_deleted = FALSE
- 索引：`idx_content_distributions_status` ON (status, published_at) WHERE status = 'published' — 采纳检测扫描

---

### 2.7 adoption_checks

**业务用途**：记录内容发布后的采纳效果检测结果（平台收录、AI 引擎引用、排名变化）。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| content_id | BIGINT | NO | — | 关联内容 | 公开 |
| check_type | VARCHAR(30) | NO | — | 检测类型：platform_index/ai_citation/ranking_delta | 公开 |
| check_date | DATE | NO | CURRENT_DATE | 检测日期 | 公开 |
| days_after_publish | INT | NO | — | 发布后第几天检测 | 公开 |
| is_adopted | BOOLEAN | NO | FALSE | 是否被采纳 | 公开 |
| citation_count | INT | YES | NULL | AI 引擎引用次数 | 公开 |
| citation_position | DECIMAL(5,2) | YES | NULL | 引用平均位置 | 公开 |
| citation_accuracy | DECIMAL(5,2) | YES | NULL | 引用准确度（0-100） | 公开 |
| score_before | DECIMAL(10,2) | YES | NULL | 发布前可见度分数（基线） | 公开 |
| score_after | DECIMAL(10,2) | YES | NULL | 当前可见度分数 | 公开 |
| score_delta | DECIMAL(10,2) | YES | NULL | 分数变化 | 公开 |
| detail | JSONB | YES | NULL | 检测详情（各引擎结果） | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |

**索引策略**：
- 主键：`id`
- 索引：`idx_adoption_checks_content` ON (content_id, check_type, check_date) — 单内容效果查询
- 索引：`idx_adoption_checks_scan` ON (check_date, check_type) WHERE is_adopted = FALSE — 定时任务扫描

**性能备注**：
- 预估：60 万内容 × 3 类型 × 3 时间点 = 540 万行/年
- 超 100 万行后按 `check_date` 月份分区
- 不需要 created_by/updated_by（系统自动检测记录）

---

### 2.8 team_members

**业务用途**：Agency 计划的团队成员关系管理。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| owner_user_id | BIGINT | NO | — | 团队所有者（订阅者） | 公开 |
| member_user_id | BIGINT | NO | — | 成员用户 ID | 公开 |
| role | VARCHAR(20) | NO | 'member' | 角色：owner/admin/member | 公开 |
| invited_at | TIMESTAMPTZ | NO | NOW() | 邀请时间 | 公开 |
| accepted_at | TIMESTAMPTZ | YES | NULL | 接受时间 | 公开 |
| status | VARCHAR(20) | NO | 'pending' | 状态：pending/accepted/removed | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |
| created_by | BIGINT | YES | NULL | 创建人 | 公开 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新时间 | 公开 |
| updated_by | BIGINT | YES | NULL | 更新人 | 公开 |
| is_deleted | BOOLEAN | NO | FALSE | 软删除标记 | 公开 |
| deleted_at | TIMESTAMPTZ | YES | NULL | 删除时间 | 公开 |

**索引策略**：
- 主键：`id`
- 唯一索引：`idx_team_members_unique` ON (owner_user_id, member_user_id) WHERE is_deleted = FALSE
- 索引：`idx_team_members_member` ON (member_user_id) WHERE status = 'accepted' — 查询用户所属团队

---

## 3. 现有表变更

### 3.1 users 表扩展

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN default_plan_code VARCHAR(20) NOT NULL DEFAULT 'free';
```

### 3.2 brands 表扩展

品牌详细资料通过 `brand_profiles` 表存储（1:1 关系），不修改 `brands` 表结构。

---

## 4. 安全备注

| 表 | PII 字段 | 加密方式 |
|----|----------|----------|
| user_subscriptions | stripe_customer_id | 应用层 AES-256-GCM 加密存储 |
| users | email | 已有，需迁移时加密 |

其他表无 PII 字段。

---

## 5. 性能备注

| 表 | 预估行数（年） | 分页策略 | N+1 风险 |
|----|---------------|----------|----------|
| generated_contents | ~60 万 | 游标分页（id） | 查询列表时避免 N+1 加载 brand — 批量查询 |
| adoption_checks | ~540 万 | 按月分区 + 日期范围查询 | 无（独立查询） |
| usage_records | ~15 万 | 不分页（按用户+维度查询） | 无 |
| content_distributions | ~12 万 | 不分页（按 content_id 查询） | 无 |

---

## 附录：现有 MySQL → PostgreSQL 迁移要点

1. `AUTO_INCREMENT` → `BIGSERIAL`
2. `DATETIME` → `TIMESTAMPTZ`
3. `TINYINT(1)` → `BOOLEAN`
4. `TEXT` 保持不变
5. `ENGINE=InnoDB` 语法移除
6. 新增强制字段：`created_by`, `updated_by`, `is_deleted`, `deleted_at`
7. 迁移工具：使用 pgloader 或自定义 Python 脚本

---

## 6. v3.0 新增表（Add-on）

### 6.1 addon_purchases

**业务用途**：记录用户购买的 Add-on（额外品牌位、查询词包、内容生成包），与订阅周期绑定，到期自动失效。

| 字段名 | 类型 | 可空 | 默认值 | COMMENT | 安全标注 |
|--------|------|------|--------|---------|----------|
| id | BIGSERIAL | NO | 自增 | 主键 | 公开 |
| user_id | BIGINT | NO | — | 关联用户 ID | 公开 |
| addon_type | VARCHAR(32) | NO | — | Add-on 类型：brand_slot / query_pack / content_pack | 公开 |
| quantity | INT | NO | 1 | 购买数量 | 公开 |
| amount | DECIMAL(18,4) | NO | 0 | 支付金额（美元） | 公开 |
| currency | VARCHAR(3) | NO | 'USD' | 货币代码 | 公开 |
| stripe_session_id | VARCHAR(255) | YES | NULL | Stripe Checkout Session ID | 公开 |
| status | VARCHAR(16) | NO | 'pending' | 状态：pending / active / expired / cancelled | 公开 |
| plan_period_start | TIMESTAMPTZ | NO | — | 关联订阅周期开始时间 | 公开 |
| plan_period_end | TIMESTAMPTZ | NO | — | 关联订阅周期结束时间 | 公开 |
| expires_at | TIMESTAMPTZ | NO | — | Add-on 到期时间 | 公开 |
| created_at | TIMESTAMPTZ | NO | NOW() | 创建时间 | 公开 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新时间 | 公开 |
| created_by | VARCHAR(64) | YES | NULL | 创建者 | 公开 |
| updated_by | VARCHAR(64) | YES | NULL | 更新者 | 公开 |

**索引策略：**
- 主索引：`id`（BIGSERIAL 主键）
- 查询索引：`idx_addon_user_status_expires ON (user_id, status, expires_at)` — 查询用户有效 Add-on
- 唯一约束：`uq_addon_user_type_period ON (user_id, addon_type, plan_period_start)` — 防止同一周期重复购买同类 Add-on
- 不建索引：`stripe_session_id`（低查询频率，仅 Webhook 回调时使用）

**关系：**
- `user_id` → `users.id`（应用层维护，不使用数据库外键约束，与现有设计一致）

**性能备注：**
- 预估数据量：~用户数 × 月均购买 0.5 次 × 12 月 = 约数千行/年
- 无 N+1 风险（按 user_id 批量查询）
- 无需分页

**安全备注：**
- 无 PII 字段
- `amount` 为金额字段，使用 DECIMAL(18,4) 存储

**种子数据：** 无（动态购买产生）
