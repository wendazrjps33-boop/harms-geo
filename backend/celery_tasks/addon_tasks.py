"""
Add-on 相关 Celery 任务

处理 Add-on 过期和配额管理。
"""

import logging
from datetime import datetime, timezone

from celery_app import celery_app
from app.database import SessionLocal
from app.models.addon_purchase import AddonPurchase

logger = logging.getLogger(__name__)


@celery_app.task
def expire_addons():
    """
    过期 Add-on

    将已过期的 Add-on 状态从 active 改为 expired。
    每天凌晨 00:05 执行一次。
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # 查找已过期但仍标记为 active 的 Add-on
        expired_addons = (
            db.query(AddonPurchase)
            .filter(
                AddonPurchase.status == "active",
                AddonPurchase.expires_at <= now,
            )
            .all()
        )

        expired_count = 0
        for addon in expired_addons:
            addon.status = "expired"
            addon.updated_at = now
            expired_count += 1

        db.commit()

        logger.info("Expired %d Add-ons", expired_count)
        return {"status": "completed", "expired": expired_count}

    except Exception as e:
        db.rollback()
        logger.error("Add-on expiration failed: %s", e)
        return {"status": "failed", "error": str(e)}

    finally:
        db.close()


@celery_app.task
def cleanup_expired_addons():
    """
    清理过期 Add-on 记录

    删除超过 90 天的过期 Add-on 记录，释放数据库空间。
    每周执行一次。
    """
    from datetime import timedelta

    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)

        # 删除超过 90 天的过期记录
        deleted_count = (
            db.query(AddonPurchase)
            .filter(
                AddonPurchase.status == "expired",
                AddonPurchase.expires_at <= cutoff,
            )
            .delete()
        )

        db.commit()

        logger.info("Cleaned up %d expired Add-on records", deleted_count)
        return {"status": "completed", "deleted": deleted_count}

    except Exception as e:
        db.rollback()
        logger.error("Add-on cleanup failed: %s", e)
        return {"status": "failed", "error": str(e)}

    finally:
        db.close()
