"""
Script to initialize the database tables for GeoRank MVP.
Run this script to create the analysis_runs and analysis_results tables.

Usage:
    python init_db.py
"""

import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models import user, brand, report, api_key

def init_database():
    """Initialize the database by creating all tables."""
    print("Creating database tables...")

    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✓ All tables created successfully!")
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        print("\nTrying to create tables individually...")

        # Try to create tables one by one
        from sqlalchemy import text

        with engine.connect() as conn:
            # Check if analysis_runs table exists
            result = conn.execute(text("SHOW TABLES LIKE 'analysis_runs'"))
            if not result.fetchone():
                print("Creating analysis_runs table...")
                conn.execute(text("""
                    CREATE TABLE analysis_runs (
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
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                print("✓ analysis_runs table created!")
            else:
                print("✓ analysis_runs table already exists.")

            # Check if analysis_results table exists
            result = conn.execute(text("SHOW TABLES LIKE 'analysis_results'"))
            if not result.fetchone():
                print("Creating analysis_results table...")
                conn.execute(text("""
                    CREATE TABLE analysis_results (
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
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                print("✓ analysis_results table created!")
            else:
                print("✓ analysis_results table already exists.")

            conn.commit()

    print("\nDatabase initialization complete!")
    print("\nYou can now start the backend server with:")
    print("  uvicorn app.main:app --reload")


if __name__ == "__main__":
    init_database()