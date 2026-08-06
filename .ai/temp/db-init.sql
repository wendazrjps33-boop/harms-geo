-- GeoRank 商业化 MVP · DDL 初始化脚本
-- 数据库：PostgreSQL 16+
-- 注意：此脚本为全新初始化，非迁移脚本

-- ============================================================
-- 0. 扩展
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 现有表（迁移自 MySQL，增加强制字段）
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255) NULL,
    default_plan_code VARCHAR(20) NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_users_email ON users(email) WHERE is_deleted = FALSE;

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255) NOT NULL,
    description TEXT NULL,
    visibility_score DECIMAL(10,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_brands_user_id ON brands(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_brands_name ON brands(name) WHERE is_deleted = FALSE;

-- Brand queries
CREATE TABLE IF NOT EXISTS brand_queries (
    id BIGSERIAL PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    query TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_brand_queries_brand_id ON brand_queries(brand_id) WHERE is_deleted = FALSE;

-- Visibility reports
CREATE TABLE IF NOT EXISTS visibility_reports (
    id BIGSERIAL PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    engine VARCHAR(50) NOT NULL,
    query TEXT NOT NULL,
    mentioned BOOLEAN NOT NULL DEFAULT FALSE,
    position INT NOT NULL DEFAULT 0,
    word_count INT NOT NULL DEFAULT 0,
    visibility_score DECIMAL(10,2) NOT NULL DEFAULT 0,
    citation_text TEXT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_visibility_reports_brand_id ON visibility_reports(brand_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_visibility_reports_checked_at ON visibility_reports(checked_at);
CREATE INDEX idx_visibility_reports_engine ON visibility_reports(engine);

-- Analysis runs
CREATE TABLE IF NOT EXISTS analysis_runs (
    id BIGSERIAL PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    sample_count INT NOT NULL DEFAULT 3,
    composite_score DECIMAL(10,2) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_analysis_runs_brand_id ON analysis_runs(brand_id) WHERE is_deleted = FALSE;

-- Analysis results
CREATE TABLE IF NOT EXISTS analysis_results (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL,
    engine VARCHAR(50) NOT NULL,
    query TEXT NOT NULL,
    mention_count INT NOT NULL DEFAULT 0,
    total_samples INT NOT NULL DEFAULT 0,
    mention_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_position DECIMAL(10,2) NOT NULL DEFAULT 0,
    avg_word_count DECIMAL(10,2) NOT NULL DEFAULT 0,
    avg_score DECIMAL(10,2) NOT NULL DEFAULT 0,
    citation_texts JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_analysis_results_run_id ON analysis_results(run_id) WHERE is_deleted = FALSE;

-- Brand competitors
CREATE TABLE IF NOT EXISTS brand_competitors (
    id BIGSERIAL PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    competitor_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_brand_competitor UNIQUE (brand_id, competitor_id)
);

CREATE INDEX idx_brand_competitors_brand ON brand_competitors(brand_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_brand_competitors_competitor ON brand_competitors(competitor_id) WHERE is_deleted = FALSE;

-- ============================================================
-- 2. 新增表：订阅与计费
-- ============================================================

-- 订阅计划定义
CREATE TABLE IF NOT EXISTS subscription_plans (
    id BIGSERIAL PRIMARY KEY,
    plan_code VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    price_monthly DECIMAL(18,4) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(18,4) NOT NULL DEFAULT 0,
    brand_limit INT NOT NULL DEFAULT 1,
    query_limit_per_brand INT NOT NULL DEFAULT 5,
    engine_limit INT NOT NULL DEFAULT 2,
    allowed_engines JSONB NOT NULL DEFAULT '["openai","deepseek"]',
    check_interval_hours INT NOT NULL DEFAULT 0,
    history_days INT NOT NULL DEFAULT 7,
    competitor_limit INT NOT NULL DEFAULT 0,
    content_monthly_limit INT NOT NULL DEFAULT 0,
    content_types_allowed JSONB NOT NULL DEFAULT '[]',
    team_members INT NOT NULL DEFAULT 1,
    api_access BOOLEAN NOT NULL DEFAULT FALSE,
    white_label BOOLEAN NOT NULL DEFAULT FALSE,
    report_watermark BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_subscription_plans_code ON subscription_plans(plan_code) WHERE is_deleted = FALSE;

-- 种子数据：三档计划
INSERT INTO subscription_plans (plan_code, name, price_monthly, price_yearly, brand_limit, query_limit_per_brand, engine_limit, allowed_engines, check_interval_hours, history_days, competitor_limit, content_monthly_limit, content_types_allowed, team_members, api_access, white_label, report_watermark, sort_order, created_by) VALUES
('free', 'Free', 0, 0, 1, 5, 2, '["openai","deepseek"]', 0, 7, 0, 0, '[]', 1, FALSE, TRUE, TRUE, 1, NULL),
('pro', 'Pro', 49.0000, 470.4000, 5, 20, 6, '["openai","claude","gemini","deepseek","qianwen","mimo"]', 24, 90, 3, 10, '["faq","community_qa","article","press_release"]', 1, FALSE, FALSE, FALSE, 2, NULL),
('agency', 'Agency', 199.0000, 1910.4000, 25, 50, 6, '["openai","claude","gemini","deepseek","qianwen","mimo"]', 4, 365, 10, 50, '["faq","community_qa","article","press_release"]', 5, TRUE, TRUE, FALSE, 3, NULL);

-- 用户订阅
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_code VARCHAR(20) NOT NULL DEFAULT 'free',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    trial_end TIMESTAMPTZ NULL,
    stripe_customer_id VARCHAR(255) NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    canceled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_subscription_status CHECK (status IN ('trialing', 'active', 'canceled', 'past_due')),
    CONSTRAINT chk_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly'))
);

CREATE UNIQUE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================================
-- 3. 新增表：用量追踪
-- ============================================================

CREATE TABLE IF NOT EXISTS usage_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    dimension VARCHAR(20) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    limit_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usage_dimension CHECK (dimension IN ('brand', 'query', 'check', 'content'))
);

CREATE UNIQUE INDEX idx_usage_records_unique ON usage_records(user_id, dimension, period_start);
CREATE INDEX idx_usage_records_user ON usage_records(user_id, dimension) WHERE used_count > 0;

-- ============================================================
-- 4. 新增表：品牌资料
-- ============================================================

CREATE TABLE IF NOT EXISTS brand_profiles (
    id BIGSERIAL PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    brand_description TEXT NULL,
    core_products TEXT NULL,
    target_audience TEXT NULL,
    key_selling_points TEXT NULL,
    industry VARCHAR(100) NULL,
    website_crawled_data JSONB NULL,
    website_crawled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_brand_profiles_brand ON brand_profiles(brand_id) WHERE is_deleted = FALSE;

-- ============================================================
-- 5. 新增表：AI 内容生成
-- ============================================================

CREATE TABLE IF NOT EXISTS generated_contents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    brand_id BIGINT NOT NULL,
    content_type VARCHAR(30) NOT NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    tags JSONB NULL,
    platform_format VARCHAR(20) NOT NULL DEFAULT 'html',
    distribution_guide JSONB NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    source_analysis_run_id BIGINT NULL,
    source_weak_keywords JSONB NULL,
    source_competitor_gaps JSONB NULL,
    published_at TIMESTAMPTZ NULL,
    target_platform VARCHAR(30) NULL,
    target_platform_url VARCHAR(2048) NULL,
    quality_score DECIMAL(5,2) NULL,
    word_count INT NOT NULL DEFAULT 0,
    engine VARCHAR(20) NOT NULL DEFAULT 'mimo',
    target_word_count INT NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_content_type CHECK (content_type IN ('faq', 'community_qa', 'article', 'press_release')),
    CONSTRAINT chk_content_status CHECK (status IN ('draft', 'generating', 'failed', 'ready', 'distributing', 'published', 'verified')),
    CONSTRAINT chk_platform_format CHECK (platform_format IN ('markdown', 'html', 'plain', 'json_ld'))
);

CREATE INDEX idx_generated_contents_user_status ON generated_contents(user_id, status) WHERE is_deleted = FALSE;
CREATE INDEX idx_generated_contents_brand ON generated_contents(brand_id, content_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_generated_contents_published ON generated_contents(published_at) WHERE status = 'published';

-- ============================================================
-- 6. 新增表：内容分发
-- ============================================================

CREATE TABLE IF NOT EXISTS content_distributions (
    id BIGSERIAL PRIMARY KEY,
    content_id BIGINT NOT NULL,
    platform VARCHAR(30) NOT NULL,
    platform_url VARCHAR(2048) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    published_at TIMESTAMPTZ NULL,
    indexed_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_distribution_platform CHECK (platform IN ('reddit', 'quora', 'medium', 'zhihu', 'wechat', 'website', 'pr', 'other')),
    CONSTRAINT chk_distribution_status CHECK (status IN ('pending', 'published', 'indexed'))
);

CREATE INDEX idx_content_distributions_content ON content_distributions(content_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_content_distributions_status ON content_distributions(status, published_at) WHERE status = 'published';

-- ============================================================
-- 7. 新增表：采纳效果检测
-- ============================================================

CREATE TABLE IF NOT EXISTS adoption_checks (
    id BIGSERIAL PRIMARY KEY,
    content_id BIGINT NOT NULL,
    check_type VARCHAR(30) NOT NULL,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    days_after_publish INT NOT NULL,
    is_adopted BOOLEAN NOT NULL DEFAULT FALSE,
    citation_count INT NULL,
    citation_position DECIMAL(5,2) NULL,
    citation_accuracy DECIMAL(5,2) NULL,
    score_before DECIMAL(10,2) NULL,
    score_after DECIMAL(10,2) NULL,
    score_delta DECIMAL(10,2) NULL,
    detail JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_check_type CHECK (check_type IN ('platform_index', 'ai_citation', 'ranking_delta'))
);

CREATE INDEX idx_adoption_checks_content ON adoption_checks(content_id, check_type, check_date);
CREATE INDEX idx_adoption_checks_scan ON adoption_checks(check_date, check_type) WHERE is_adopted = FALSE;

-- ============================================================
-- 8. 新增表：团队管理
-- ============================================================

CREATE TABLE IF NOT EXISTS team_members (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    member_user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by BIGINT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_team_role CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT chk_team_status CHECK (status IN ('pending', 'accepted', 'removed'))
);

CREATE UNIQUE INDEX idx_team_members_unique ON team_members(owner_user_id, member_user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_team_members_member ON team_members(member_user_id) WHERE status = 'accepted';
