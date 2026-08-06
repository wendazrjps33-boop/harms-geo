"""
用量相关 Celery 任务

同步用量数据到数据库，检查用量警告。
"""

import logging

from celery_app import celery_app
from app.database import SessionLocal
from app.models.subscription import UserSubscription

logger = logging.getLogger(__name__)


@celery_app.task
def sync_usage_to_db():
    """
    将 Redis 中的用量数据同步到数据库

    防止 Redis 重启丢失数据，每小时执行一次。
    """
    from app.services import usage_tracker

    db = SessionLocal()
    try:
        # 获取所有活跃用户
        users = db.query(UserSubscription.user_id).distinct().all()
        synced_count = 0

        for (user_id,) in users:
            for dimension in ["brand", "content"]:
                try:
                    usage_tracker.sync_to_db(db, user_id, dimension)
                    synced_count += 1
                except Exception as e:
                    logger.error(
                        "Failed to sync usage for user %d, dimension %s: %s",
                        user_id,
                        dimension,
                        e,
                    )

        logger.info("Usage sync completed: %d user-dimension pairs synced", synced_count)
        return {"status": "completed", "synced": synced_count}

    except Exception as e:
        logger.error("Usage sync failed: %s", e)
        return {"status": "failed", "error": str(e)}

    finally:
        db.close()


@celery_app.task
def check_usage_warnings():
    """
    检查用量并发送警告邮件

    当用量达到 80% 或 100% 时发送警告，每 6 小时执行一次。
    """
    from app.services.email_service import check_and_notify_usage

    try:
        check_and_notify_usage(SessionLocal)
        logger.info("Usage warnings check completed")
        return {"status": "completed"}
    except Exception as e:
        logger.error("Usage warnings check failed: %s", e)
        return {"status": "failed", "error": str(e)}
