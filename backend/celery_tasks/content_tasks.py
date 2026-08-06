"""
内容生成 Celery 任务

将 threading.Thread 替换为 Celery task，支持任务重试和持久化。
"""

import logging
from datetime import datetime, timezone

from celery_app import celery_app
from app.database import SessionLocal
from app.models.content import GeneratedContent

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def generate_content_async(
    self,
    content_id: int,
    user_id: int,
    brand_id: int,
    content_type: str,
    custom_instructions: str | None,
    language: str,
    target_word_count: int,
    engine: str,
):
    """
    异步生成内容

    Args:
        content_id: 内容 ID
        user_id: 用户 ID
        brand_id: 品牌 ID
        content_type: 内容类型
        custom_instructions: 自定义指令
        language: 语言
        target_word_count: 目标字数
        engine: AI 引擎
    """
    from app.services.content_generator import generate_content
    from app.services import usage_tracker

    db = SessionLocal()
    try:
        # 更新状态为 generating
        content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
        if not content:
            logger.error("Content %d not found", content_id)
            return {"status": "failed", "error": "Content not found"}

        content.status = "generating"
        content.updated_at = datetime.now(timezone.utc)
        db.commit()

        # 生成内容
        result = generate_content(
            db=db,
            user_id=user_id,
            brand_id=brand_id,
            content_type=content_type,
            custom_instructions=custom_instructions,
            language=language,
            target_word_count=target_word_count,
            engine=engine,
            content_id=content_id,
        )

        # 增加用量计数
        usage_tracker.increment(user_id, "content", 1)

        logger.info("Content %d generated successfully", content_id)
        return {
            "status": "completed",
            "content_id": content_id,
            "quality_score": result.quality_score,
        }

    except Exception as exc:
        logger.error("Content %d generation failed: %s", content_id, exc)

        # 更新状态为 failed
        try:
            content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
            if content:
                content.status = "failed"
                content.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            db.rollback()

        # 重试
        raise self.retry(exc=exc)

    finally:
        db.close()


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def regenerate_content_async(
    self,
    content_id: int,
    section_text: str | None,
    modification_instructions: str,
):
    """
    异步重新生成内容

    Args:
        content_id: 内容 ID
        section_text: 要重新生成的段落（None 表示全文）
        modification_instructions: 修改指令
    """
    from app.services.content_generator import regenerate_section

    db = SessionLocal()
    try:
        # 更新状态为 generating
        content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
        if not content:
            logger.error("Content %d not found", content_id)
            return {"status": "failed", "error": "Content not found"}

        content.status = "generating"
        content.updated_at = datetime.now(timezone.utc)
        db.commit()

        # 重新生成
        result = regenerate_section(
            db=db,
            content_id=content_id,
            section_text=section_text,
            modification_instructions=modification_instructions,
        )

        # 更新状态为 draft
        content.status = "draft"
        content.updated_at = datetime.now(timezone.utc)
        db.commit()

        logger.info("Content %d regeneration completed", content_id)
        return {
            "status": "completed",
            "content_id": content_id,
            "quality_score": result.quality_score,
        }

    except Exception as exc:
        logger.error("Content %d regeneration failed: %s", content_id, exc)

        # 更新状态为 failed
        try:
            content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
            if content:
                content.status = "failed"
                content.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            db.rollback()

        # 重试
        raise self.retry(exc=exc)

    finally:
        db.close()
