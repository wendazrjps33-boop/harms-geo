-- Create analysis_runs table
CREATE TABLE IF NOT EXISTS analysis_runs (
    id INTEGER NOT NULL AUTO_INCREMENT,
    brand_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_queries INTEGER NOT NULL DEFAULT 0,
    completed_queries INTEGER NOT NULL DEFAULT 0,
    engines TEXT NOT NULL,
    samples_per_query INTEGER NOT NULL DEFAULT 3,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_analysis_runs_brand_id (brand_id),
    FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER NOT NULL AUTO_INCREMENT,
    run_id INTEGER NOT NULL,
    engine VARCHAR(50) NOT NULL,
    query TEXT NOT NULL,
    mention_count INTEGER NOT NULL DEFAULT 0,
    total_samples INTEGER NOT NULL DEFAULT 0,
    mention_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    avg_position NUMERIC(5, 2),
    avg_word_count NUMERIC(8, 2),
    avg_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    citation_texts TEXT,
    PRIMARY KEY (id),
    INDEX idx_analysis_results_run_id (run_id),
    INDEX idx_analysis_results_engine (engine),
    FOREIGN KEY (run_id) REFERENCES analysis_runs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
