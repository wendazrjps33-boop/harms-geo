-- ============================================================
-- 迁移脚本：创建 api_keys 表
-- 执行方式：
--   MySQL:      mysql -u <user> -p <database> < migrations/001_create_api_keys_table.sql
--   PostgreSQL: psql -U <user> -d <database> -f migrations/001_create_api_keys_table.sql
-- ============================================================

-- ── PostgreSQL 版本 ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(50) NOT NULL,
    key_hash    VARCHAR(64) NOT NULL UNIQUE,
    key_prefix  VARCHAR(16) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS ix_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS ix_api_keys_user_active ON api_keys(user_id, is_active);


-- ── MySQL 版本（取消注释使用） ──────────────────────────────
--
-- CREATE TABLE IF NOT EXISTS api_keys (
--     id          INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
--     user_id     INTEGER NOT NULL,
--     name        VARCHAR(50) NOT NULL,
--     key_hash    VARCHAR(64) NOT NULL UNIQUE,
--     key_prefix  VARCHAR(16) NOT NULL,
--     expires_at  DATETIME NOT NULL,
--     last_used_at DATETIME,
--     is_active   BOOLEAN NOT NULL DEFAULT TRUE,
--     created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--     INDEX ix_api_keys_user_id (user_id),
--     INDEX ix_api_keys_user_active (user_id, is_active),
--     CONSTRAINT fk_api_keys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
