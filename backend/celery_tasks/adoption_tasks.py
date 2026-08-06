"""
采纳效果检测 Celery 任务

检测已发布内容的平台收录和 AI 引擎引用情况。
"""

import logging

from celery_app import celery_app
from app.database import SessionLocal
from app.models.content import GeneratedContent

logger = logging.getLogger(__name__)


@celery_app.task
def check_adoption():
    """
    检查已发布内容的采纳效果

    遍历所有已发布内容，按时间节点（3/7/14/30 天）执行检测。
    每天凌晨 2 点执行一次。
    """
    from app.services.adoption_verifier import run_adoption_checks

    db = SessionLocal()
    try:
        # 获取所有已发布内容
        published_contents = (
            db.query(GeneratedContent)
            .filter(GeneratedContent.status == "published")
            .all()
        )

        checked_count = 0
        skipped_count = 0

        for content in published_contents:
            try:
                run_adoption_checks(db, content.id)
                checked_count += 1
            except Exception as e:
                logger.error(
                    "Adoption check failed for content %d: %s",
                    content.id,
                    e,
                )
                skipped_count += 1

        logger.info(
            "Adoption check completed: %d checked, %d skipped",
            checked_count,
            skipped_count,
        )
        return {
            "status": "completed",
            "checked": checked_count,
            "skipped": skipped_count,
        }

    except Exception as e:
        logger.error("Adoption check failed: %s", e)
        return {"status": "failed", "error": str(e)}

    finally:
        db.close()


@celery_app.task
def check_single_adoption(content_id: int):
    """
    检查单个内容的采纳效果

    Args:
        content_id: 内容 ID
    """
    from app.services.adoption_verifier import run_adoption_checks

    db = SessionLocal()
    try:
        run_adoption_checks(db, content_id)
        logger.info("Adoption check completed for content %d", content_id)
        return {"status": "completed", "content_id": content_id}
    except Exception as e:
        logger.error("Adoption check failed for content %d: %s", content_id, e)
        return {"status": "failed", "content_id": content_id, "error": str(e)}
    finally:
        db.close()
