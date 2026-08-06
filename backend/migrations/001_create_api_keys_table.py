"""
迁移脚本：创建 api_keys 表。

Usage:
    # 方式一：通过 init_db.py 自动创建（新数据库）
    python init_db.py

    # 方式二：手动执行 SQL（已有数据库）
    # MySQL:
    mysql -u <user> -p <database> < migrations/001_create_api_keys_table.sql
    # PostgreSQL:
    psql -U <user> -d <database> -f migrations/001_create_api_keys_table.sql
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, Base
from app.models.api_key import ApiKey  # noqa: F401 — 确保 model 注册到 Base.metadata


def migrate():
    """仅创建 api_keys 表（不影响已有表）。"""
    print("Creating api_keys table...")

    with engine.begin() as conn:
        # 检查表是否已存在（兼容 MySQL 和 PostgreSQL）
        dialect = engine.dialect.name
        if dialect == "mysql":
            result = conn.execute(text("SHOW TABLES LIKE 'api_keys'"))
            exists = result.fetchone() is not None
        elif dialect == "postgresql":
            result = conn.execute(
                text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys')")
            )
            exists = result.scalar()
        else:
            # 通用方式：尝试查询
            try:
                conn.execute(text("SELECT 1 FROM api_keys LIMIT 1"))
                exists = True
            except Exception:
                exists = False

        if exists:
            print("  api_keys table already exists, skipping.")
            return

        # 使用 SQLAlchemy 的 create_all 只创建目标表
        ApiKey.__table__.create(bind=conn, checkfirst=True)
        print("  api_keys table created successfully.")

    # 添加外键约束（create_all 不一定处理跨表外键）
    print("Migration complete.")


if __name__ == "__main__":
    migrate()
