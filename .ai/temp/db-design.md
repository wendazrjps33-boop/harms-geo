# GeoRank 数据库设计文档

> 版本：v5.0 | 日期：2026-08-07
> 基于：现有 SQLAlchemy 模型 + v4.0 重构需求

---

## 1. 命名规范

- 表名：`snake_case`，复数形式（如 `users`, `generated_contents`）
- 字段名：`snake_case`
- 主键：`id`（BIGSERIAL）
- 外键：`{关联表单数}_id`（如 `user_id`, `brand_id`）
- 金额：`DECIMAL(18,4)` — 禁止 FLOAT/DOUBLE
- 布尔：`BOOLEAN` — 禁止 INT/CHAR
- 时间：`TIMESTAMP WITH TIME ZONE`
- 枚举：`VARCHAR` + CHECK 约束

---

## 2. 强制字段

所有业务表必须包含：

```sql
id              BIGSERIAL PRIMARY KEY,
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by      BIGINT,
updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_by      BIGINT,
is_deleted      BOOLEAN DEFAULT FALSE,
deleted_at      TIMESTAMP WITH TIME ZONE NULL
```

---

## 3. 表设计

### 3.1 users（用户表）

```sql
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱',
    name            VARCHAR(100) NOT NULL COMMENT '昵称',
    password_hash   VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希',
    is_active       BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      BIGINT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_users_email ON users(email);
```

### 3.2 brands（品牌表）

```sql
CREATE TABLE brands (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    name            VARCHAR(200) NOT NULL COMMENT '品牌名称',
    website         VARCHAR(2048) COMMENT '官网 URL',
    industry        VARCHAR(100) COMMENT '行业',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      BIGINT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_brands_user ON brands(user_id);
```

### 3.3 brand_queries（查询词表）

```sql
CREATE TABLE brand_queries (
    id              BIGSERIAL PRIMARY KEY,
    brand_id        BIGINT NOT NULL REFERENCES brands(id),
    query_text      VARCHAR(500) NOT NULL COMMENT '查询词',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      BIGINT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_brand_queries_brand ON brand_queries(brand_id);
```

### 3.4 brand_profiles（品牌资料表）

```sql
CREATE TABLE brand_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    brand_id            BIGINT NOT NULL UNIQUE REFERENCES brands(id),
    brand_description   TEXT COMMENT '品牌描述',
    core_products       TEXT COMMENT '核心产品',
    target_audience     TEXT COMMENT '目标受众',
    key_selling_points  TEXT COMMENT '核心卖点',
    industry            VARCHAR(100) COMMENT '行业',
    website_crawled_data JSONB COMMENT '官网抓取数据',
    website_crawled_at  TIMESTAMP WITH TIME ZONE COMMENT '最近抓取时间',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by          BIGINT,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by          BIGINT,
    is_deleted          BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_brand_profiles_brand ON brand_profiles(brand_id);
```

### 3.5 visibility_reports（可见性报告表）

```sql
CREATE TABLE visibility_reports (
    id              BIGSERIAL PRIMARY KEY,
    brand_id        BIGINT NOT NULL REFERENCES brands(id),
    engine          VARCHAR(30) NOT NULL COMMENT 'AI 引擎',
    query_text      VARCHAR(500) NOT NULL COMMENT '查询词',
    visibility_score DECIMAL(10,2) DEFAULT 0 COMMENT '可见性评分',
    mention_rate    DECIMAL(5,4) DEFAULT 0 COMMENT '提及率',
    mentioned       BOOLEAN DEFAULT FALSE COMMENT '是否被提及',
    citation_text   TEXT COMMENT '引文文本',
    citation_position INTEGER COMMENT '引文位置',
    detail          JSONB COMMENT '详细数据',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      BIGINT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_visibility_reports_brand ON visibility_reports(brand_id, engine);
```

### 3.6 analysis_runs / analysis_results（分析批次 + 结果）

```sql
CREATE TABLE analysis_runs (
    id              BIGSERIAL PRIMARY KEY,
    brand_id        BIGINT NOT NULL REFERENCES brands(id),
    status          VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/running/completed/failed',
    sample_count    INTEGER DEFAULT 0 COMMENT '采样数',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      BIGINT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_analysis_runs_brand ON analysis_runs(brand_id);

CREATE TABLE analysis_results (
    id              BIGSERIAL PRIMARY KEY,
    run_id          BIGINT NOT NULL REFERENCES analysis_runs(id),
    engine          VARCHAR(30) NOT NULL,
    query_text      VARCHAR(500) NOT NULL,
    visibility_score DECIMAL(10,2) DEFAULT 0,
    mention_rate    DECIMAL(5,4) DEFAULT 0,
    mentioned       BOOLEAN DEFAULT FALSE,
    citation_text   TEXT,
    detail          JSONB,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_analysis_results_run ON analysis_results(run_id);
```

### 3.7 generated_contents（生成内容表）

```sql
CREATE TABLE generated_contents (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL,
    brand_id                BIGINT NOT NULL,
    content_type            VARCHAR(30) NOT NULL COMMENT 'faq/community_qa/article/press_release',
    title                   VARCHAR(500) NOT NULL,
    body                    TEXT NOT NULL,
    tags                    JSONB COMMENT '标签数组',
    platform_format         VARCHAR(20) DEFAULT 'html',
    distribution_guide      JSONB COMMENT '分发指南',
    status                  VARCHAR(20) DEFAULT 'draft' COMMENT 'generating/draft/ready/published/failed',
    source_analysis_run_id  BIGINT COMMENT '来源分析批次',
    source_weak_keywords    JSONB COMMENT '薄弱关键词',
    source_competitor_gaps  JSONB COMMENT '竞品差距',
    published_at            TIMESTAMP WITH TIME ZONE,
    target_platform         VARCHAR(30) COMMENT '目标平台',
    target_platform_url     VARCHAR(2048) COMMENT '发布 URL',
    quality_score           DECIMAL(5,2) COMMENT '质量评分',
    word_count              INTEGER DEFAULT 0 COMMENT '字数',
    engine                  VARCHAR(20) DEFAULT 'mimo' COMMENT '生成引擎',
    target_word_count       INTEGER DEFAULT 1000 COMMENT '目标字数',
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by              BIGINT,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by              BIGINT,
    is_deleted              BOOLEAN DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_generated_contents_user_status ON generated_contents(user_id, status);
CREATE INDEX idx_generated_contents_brand ON generated_contents(brand_id, content_type);
```

### 3.8 content_distributions（内容分发表）

```sql
CREATE TABLE content_distributions (
    id              BIGSERIAL PRIMARY KEY,
    content_id      BIGINT NOT NULL,
    platform        VARCHAR(30) NOT NULL COMMENT '分发平台',
    platform_url    VARCHAR(2048) COMMENT '平台 URL',
    status          VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/published/indexed',
    published_at    TIMESTAMP WITH TIME ZONE,
    indexed_at      TIMESTAMP WITH TIME ZONE,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      BIGINT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_content_distributions_content ON content_distributions(content_id);
```

### 3.9 adoption_checks（采纳效果检测表）

```sql
CREATE TABLE adoption_checks (
    id                  BIGSERIAL PRIMARY KEY,
    content_id          BIGINT NOT NULL,
    check_type          VARCHAR(30) NOT NULL COMMENT 'platform_index/ai_citation/ranking_delta',
    check_date          DATE NOT NULL,
    days_after_publish  INTEGER NOT NULL COMMENT '发布后第几天',
    is_adopted          BOOLEAN DEFAULT FALSE,
    citation_count      INTEGER,
    citation_position   DECIMAL(5,2),
    citation_accuracy   DECIMAL(5,2),
    score_before        DECIMAL(10,2),
    score_after         DECIMAL(10,2),
    score_delta         DECIMAL(10,2),
    detail              JSONB,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_adoption_checks_content ON adoption_checks(content_id, check_type, check_date);
```

### 3.10 subscription_plans（订阅计划表）

```sql
CREATE TABLE subscription_plans (
    id                      BIGSERIAL PRIMARY KEY,
    plan_code               VARCHAR(20) NOT NULL UNIQUE COMMENT 'free/pro/agency',
    name                    VARCHAR(50) NOT NULL,
    price_monthly           DECIMAL(18,4) NOT NULL DEFAULT 0,
    price_yearly            DECIMAL(18,4) NOT NULL DEFAULT 0,
    brand_limit             INTEGER NOT NULL DEFAULT 1,
    query_limit_per_brand   INTEGER NOT NULL DEFAULT 5,
    engine_limit            INTEGER NOT NULL DEFAULT 6,
    content_monthly_limit   INTEGER NOT NULL DEFAULT 2,
    content_types_allowed   JSONB,
    api_access              BOOLEAN DEFAULT FALSE,
    white_label             BOOLEAN DEFAULT FALSE,
    team_members            INTEGER DEFAULT 1,
    is_active               BOOLEAN DEFAULT TRUE,
    sort_order              INTEGER DEFAULT 0,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by              BIGINT,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by              BIGINT,
    is_deleted              BOOLEAN DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);
```

### 3.11 user_subscriptions（用户订阅表）

```sql
CREATE TABLE user_subscriptions (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL,
    plan_code               VARCHAR(20) NOT NULL DEFAULT 'free',
    status                  VARCHAR(20) DEFAULT 'active' COMMENT 'trialing/active/past_due/canceled',
    billing_cycle           VARCHAR(10) COMMENT 'monthly/yearly',
    current_period_start    TIMESTAMP WITH TIME ZONE,
    current_period_end      TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end    BOOLEAN DEFAULT FALSE,
    canceled_at             TIMESTAMP WITH TIME ZONE,
    trial_end               TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id  VARCHAR(255),
    stripe_customer_id      VARCHAR(255),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by              BIGINT,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by              BIGINT,
    is_deleted              BOOLEAN DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id, status);
```

### 3.12 webhook_events（Stripe Webhook 幂等表）

```sql
CREATE TABLE webhook_events (
    id              BIGSERIAL PRIMARY KEY,
    event_id        VARCHAR(255) NOT NULL UNIQUE COMMENT 'Stripe event ID',
    event_type      VARCHAR(100) NOT NULL,
    status          VARCHAR(20) DEFAULT 'processed' COMMENT 'processed/failed',
    error_message   TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX ix_webhook_events_event_id ON webhook_events(event_id);
```

### 3.13 usage_records（用量记录表）

```sql
CREATE TABLE usage_records (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    dimension       VARCHAR(20) NOT NULL COMMENT 'brand/query/check/content',
    period_start    TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end      TIMESTAMP WITH TIME ZONE NOT NULL,
    used_count      INTEGER DEFAULT 0,
    limit_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_usage_records_user ON usage_records(user_id, dimension, period_start);
```

### 3.14 addon_purchases（Add-on 购买表）

```sql
CREATE TABLE addon_purchases (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    addon_type      VARCHAR(30) NOT NULL COMMENT 'brand_slot/query_pack/content_pack',
    quantity        INTEGER NOT NULL,
    amount          DECIMAL(18,4) NOT NULL,
    currency        VARCHAR(10) DEFAULT 'usd',
    status          VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/active/expired/cancelled',
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    stripe_session_id VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      BIGINT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_addon_purchases_user ON addon_purchases(user_id, status);
```

### 3.15 competitors（竞品表）

```sql
CREATE TABLE competitors (
    id              BIGSERIAL PRIMARY KEY,
    brand_id        BIGINT NOT NULL,
    competitor_id   BIGINT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      BIGINT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX idx_competitors_brand ON competitors(brand_id);
```

---

## 4. Redis Key 规范

| Key 模式 | TTL | 用途 |
|----------|-----|------|
| `usage:{user_id}:{dim}:{YYYY-MM}` | 35 天 | 月度用量计数 |
| `user_plan:{user_id}` | 5 分钟 | 用户计划缓存 |
| `plan:{plan_code}` | 1 小时 | 计划详情缓存 |
| `gen_lock:{user_id}:{brand_id}` | 5 分钟 | 内容生成分布式锁 |

> 所有 Redis key 必须有显式 TTL，禁止永不过期的业务 key。
