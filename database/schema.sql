-- GeoRank Database Schema (MySQL 8.x)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255) NOT NULL,
    description TEXT,
    visibility_score DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_brands_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_brands_user_id ON brands(user_id);
CREATE INDEX idx_brands_name ON brands(name);

-- Brand queries table
CREATE TABLE IF NOT EXISTS brand_queries (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    query TEXT NOT NULL,
    CONSTRAINT fk_brand_queries_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_brand_queries_brand_id ON brand_queries(brand_id);

-- Visibility reports table
CREATE TABLE IF NOT EXISTS visibility_reports (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    engine VARCHAR(50) NOT NULL,
    query TEXT NOT NULL,
    mentioned TINYINT(1) NOT NULL,
    position INT NOT NULL,
    word_count INT NOT NULL,
    visibility_score DECIMAL(10,2) NOT NULL,
    citation_text TEXT,
    checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_visibility_reports_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_visibility_reports_brand_id ON visibility_reports(brand_id);
CREATE INDEX idx_visibility_reports_checked_at ON visibility_reports(checked_at);
CREATE INDEX idx_visibility_reports_engine ON visibility_reports(engine);
