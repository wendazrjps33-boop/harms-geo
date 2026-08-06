import logging
import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.content import GeneratedContent, AdoptionCheck
from app.models.report import VisibilityReport
from app.services.ai_gateway import check_visibility, ENGINE_MAP
from app.services.serp_gateway import check_url_indexed

logger = logging.getLogger(__name__)

# 采纳检测时间节点（发布后第 N 天）
ADOPTION_CHECK_INTERVALS = [3, 7, 14, 30]


def _get_current_check_interval(days_since: int) -> int | None:
    """根据距发布天数，返回当前应执行的检测时间节点。未到时间返回 None。"""
    # 取最近的已到达节点
    reached = [i for i in ADOPTION_CHECK_INTERVALS if days_since >= i]
    return max(reached) if reached else None


def check_platform_indexing(db: Session, content_id: int, url: str, days_after_publish: int) -> AdoptionCheck:
    """平台收录检测 — 使用 SERP API 检查 URL 是否被搜索引擎收录。"""
    result = check_url_indexed(url)

    check = AdoptionCheck(
        content_id=content_id,
        check_type="platform_index",
        check_date=datetime.now(timezone.utc),
        days_after_publish=days_after_publish,
        is_adopted=result.get("is_indexed", False),
        citation_position=None,
        detail={
            "url": url,
            "method": result.get("method", "unknown"),
            "error": result.get("error"),
        },
    )
    db.add(check)
    db.commit()
    db.refresh(check)

    logger.info(
        "Platform indexing check for %s: method=%s, indexed=%s",
        url,
        result.get("method"),
        result.get("is_indexed"),
    )

    return check


def check_ai_citation(db: Session, content_id: int, brand_name: str, content_title: str, days_after_publish: int) -> list[AdoptionCheck]:
    """AI 引擎引用检测 — 检查品牌是否被 AI 引擎引用。"""
    content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
    if not content:
        return []

    checks = []
    for engine in ENGINE_MAP:
        try:
            query = f"{brand_name} {content_title}"
            result = check_visibility(brand_name, query, engine)

            is_cited = False
            citation_position = None
            citation_accuracy = None

            if isinstance(result, dict):
                is_cited = result.get("mentioned", False)
                citation_position = result.get("position")
                citation_accuracy = result.get("accuracy")
            elif isinstance(result, str):
                is_cited = brand_name.lower() in result.lower()

            check = AdoptionCheck(
                content_id=content_id,
                check_type="ai_citation",
                check_date=datetime.now(timezone.utc),
                days_after_publish=days_after_publish,
                is_adopted=is_cited,
                citation_count=1 if is_cited else 0,
                citation_position=citation_position,
                citation_accuracy=citation_accuracy,
                detail={"engine": engine, "query": query},
            )
            db.add(check)
            checks.append(check)
        except Exception as e:
            logger.error("AI citation check failed for engine %s: %s", engine, e)
            continue

    db.commit()
    for check in checks:
        db.refresh(check)
    return checks


def calculate_ranking_delta(db: Session, content_id: int, brand_id: int, days_after_publish: int) -> AdoptionCheck | None:
    """排名变化对比 — 对比发布前后的可见度分数。"""
    content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
    if not content or not content.published_at:
        return None

    latest_report = (
        db.query(VisibilityReport)
        .filter(VisibilityReport.brand_id == brand_id)
        .order_by(VisibilityReport.id.desc())
        .first()
    )
    if not latest_report:
        return None

    score_after = float(latest_report.visibility_score) if latest_report.visibility_score else 0

    old_reports = (
        db.query(VisibilityReport)
        .filter(
            VisibilityReport.brand_id == brand_id,
            VisibilityReport.created_at < content.published_at,
        )
        .order_by(VisibilityReport.id.desc())
        .limit(5)
        .all()
    )

    score_before = 0
    if old_reports:
        scores = [float(r.visibility_score) for r in old_reports if r.visibility_score]
        score_before = sum(scores) / len(scores) if scores else 0

    score_delta = score_after - score_before

    check = AdoptionCheck(
        content_id=content_id,
        check_type="ranking_delta",
        check_date=datetime.now(timezone.utc),
        days_after_publish=days_after_publish,
        is_adopted=score_delta > 0,
        score_before=score_before,
        score_after=score_after,
        score_delta=score_delta,
        detail={"brand_id": brand_id},
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    return check


def run_adoption_checks(db: Session, content_id: int):
    """统一入口 — 按时间节点（3/7/14/30 天）执行采纳检测，每个节点只执行一次。"""
    content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
    if not content or content.status != "published":
        return

    if not content.published_at:
        return

    days_since = (datetime.now(timezone.utc) - content.published_at).days
    current_interval = _get_current_check_interval(days_since)

    if current_interval is None:
        logger.debug("Content %d: not yet at first check interval (day %d)", content_id, days_since)
        return

    # 检查当前时间节点是否已执行过
    existing_platform = (
        db.query(AdoptionCheck)
        .filter(
            AdoptionCheck.content_id == content_id,
            AdoptionCheck.check_type == "platform_index",
            AdoptionCheck.days_after_publish == current_interval,
        )
        .first()
    )

    if not existing_platform and content.target_platform_url:
        logger.info("Content %d: running platform indexing check at day %d", content_id, current_interval)
        check_platform_indexing(db, content_id, content.target_platform_url, current_interval)

    from app.models.brand import Brand
    brand = db.query(Brand).filter(Brand.id == content.brand_id).first()
    if brand:
        existing_ai_check = (
            db.query(AdoptionCheck)
            .filter(
                AdoptionCheck.content_id == content_id,
                AdoptionCheck.check_type == "ai_citation",
                AdoptionCheck.days_after_publish == current_interval,
            )
            .first()
        )
        if not existing_ai_check:
            logger.info("Content %d: running AI citation check at day %d", content_id, current_interval)
            check_ai_citation(db, content_id, brand.name, content.title, current_interval)

    existing_delta = (
        db.query(AdoptionCheck)
        .filter(
            AdoptionCheck.content_id == content_id,
            AdoptionCheck.check_type == "ranking_delta",
            AdoptionCheck.days_after_publish == current_interval,
        )
        .first()
    )
    if not existing_delta:
        logger.info("Content %d: running ranking delta check at day %d", content_id, current_interval)
        calculate_ranking_delta(db, content_id, content.brand_id, current_interval)
