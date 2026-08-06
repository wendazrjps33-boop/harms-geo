import logging

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.brand import Brand
from app.models.report import VisibilityReport
from app.models.subscription import UserSubscription
from app.models.content import GeneratedContent
from app.services.brand_service import get_brand_queries
from app.services.ai_gateway import check_visibility, ENGINE_MAP
from app.services.adoption_verifier import run_adoption_checks
from app.services import usage_tracker

logger = logging.getLogger(__name__)

PLAN_CHECK_INTERVALS = {
    "free": 24,
    "pro": 12,
    "agency": 6,
}


def get_user_plan(db: Session, user_id: int) -> str:
    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status.in_(["active", "trialing"]),
        )
        .order_by(UserSubscription.id.desc())
        .first()
    )
    return sub.plan_code if sub else "free"


def monitor_all_brands():
    db: Session = SessionLocal()
    try:
        brands = db.query(Brand).filter(Brand.active == True).all()
        for brand in brands:
            plan_code = get_user_plan(db, brand.user_id)
            interval_hours = PLAN_CHECK_INTERVALS.get(plan_code, 24)

            queries = get_brand_queries(db, brand.id)
            for engine in ENGINE_MAP:
                for q in queries:
                    try:
                        result = check_visibility(brand.name, q, engine)
                        report = VisibilityReport(brand_id=brand.id, engine=engine, query=q, **result)
                        db.add(report)
                    except Exception:
                        continue
        db.commit()
    finally:
        db.close()


def check_adoption():
    db: Session = SessionLocal()
    try:
        published_contents = (
            db.query(GeneratedContent)
            .filter(GeneratedContent.status == "published")
            .all()
        )
        for content in published_contents:
            try:
                run_adoption_checks(db, content.id)
            except Exception:
                continue
    finally:
        db.close()


def sync_usage_to_db():
    """将 Redis 中的用量数据同步到数据库，防止 Redis 重启丢失数据。"""
    db: Session = SessionLocal()
    try:
        users = db.query(UserSubscription.user_id).distinct().all()
        for (user_id,) in users:
            for dimension in ["brand", "content"]:
                try:
                    usage_tracker.sync_to_db(db, user_id, dimension)
                except Exception as e:
                    logger.error("Failed to sync usage for user %d, dimension %s: %s", user_id, dimension, e)
        logger.info("Usage sync completed for %d users", len(users))
    finally:
        db.close()


def check_usage_warnings():
    """检查用量并发送警告邮件。"""
    from app.services.email_service import check_and_notify_usage
    try:
        check_and_notify_usage(SessionLocal)
    except Exception as e:
        logger.error("Failed to check usage warnings: %s", e)


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(monitor_all_brands, "interval", hours=1, id="monitor_brands")
    scheduler.add_job(check_adoption, "interval", hours=24, id="check_adoption")
    scheduler.add_job(sync_usage_to_db, "interval", hours=1, id="sync_usage")
    scheduler.add_job(check_usage_warnings, "interval", hours=6, id="usage_warnings")
    scheduler.start()
    return scheduler
