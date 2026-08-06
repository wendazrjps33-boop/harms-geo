from datetime import datetime, timezone
import logging
import re
import redis as redis_lib

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.brand import Brand
from app.models.content import GeneratedContent, AdoptionCheck, ContentDistribution, BrandProfile
from app.schemas.content import (
    ContentGenerateRequest,
    ContentGenerateResponse,
    ContentListItem,
    ContentDetail,
    ContentUpdateRequest,
    RegenerateRequest,
    PublishRequest,
    ConfirmResponse,
    PublishResponse,
    AdoptionResponse,
    ContentStatsResponse,
    BrandProfileUpdateRequest,
    BrandProfileResponse,
)
from app.services import content_generator, usage_tracker
from app.middleware.subscription_gate import require_feature, require_quota, require_feature_with_quota, get_user_plan_code
from app import task_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/content", tags=["content"])

PREMIUM_ENGINES = {"claude", "gemini"}

# Redis-based distributed generation lock (replaces in-memory threading.Lock)
_gen_lock_redis = redis_lib.from_url(settings.REDIS_URL, password=settings.REDIS_PASSWORD, decode_responses=True)
_GEN_LOCK_TTL = 300  # 5 minutes auto-expire
_GEN_LOCK_PREFIX = "gen_lock:"


def _acquire_generation_lock(user_id: int, brand_id: int) -> bool:
    """Try to acquire generation lock via Redis SETNX. Returns True if acquired."""
    key = f"{_GEN_LOCK_PREFIX}{user_id}:{brand_id}"
    return _gen_lock_redis.set(key, "1", nx=True, ex=_GEN_LOCK_TTL)


def _release_generation_lock(user_id: int, brand_id: int) -> None:
    """Release generation lock."""
    key = f"{_GEN_LOCK_PREFIX}{user_id}:{brand_id}"
    _gen_lock_redis.delete(key)


def _get_content_or_404(content_id: int, user_id: int, db: Session) -> GeneratedContent:
    content = db.query(GeneratedContent).filter(
        GeneratedContent.id == content_id,
        GeneratedContent.user_id == user_id,
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


def _run_generation(
    content_id: int,
    user_id: int,
    brand_id: int,
    content_type: str,
    custom_instructions: str | None,
    language: str,
    target_word_count: int,
    engine: str,
):
    db = SessionLocal()
    try:
        content_generator.generate_content(
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
        usage_tracker.increment(user_id, "content", 1)
        task_store.update_task(content_id, "completed")
        logger.info("Content %d generated successfully", content_id)
    except Exception as e:
        logger.error("Content %d generation failed: %s", content_id, e)
        task_store.update_task(content_id, "failed", error=str(e))
        try:
            content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
            if content:
                content.status = "failed"
                content.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
        # 释放 Redis 分布式锁
        try:
            _release_generation_lock(user_id, brand_id)
        except Exception:
            pass


@router.post("/generate", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
def generate_content(
    body: ContentGenerateRequest,
    user: User = Depends(require_feature_with_quota("content_generation", "content")),
    db: Session = Depends(get_db),
):
    brand = db.query(Brand).filter(
        Brand.id == body.brand_id,
        Brand.user_id == user.id,
    ).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    if body.engine in PREMIUM_ENGINES:
        plan_code = get_user_plan_code(db, user.id)
        if plan_code != "agency":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"引擎 {body.engine} 仅 Agency 计划可用，请升级或切换至其他引擎",
            )

    if not _acquire_generation_lock(user.id, body.brand_id):
        raise HTTPException(status_code=409, detail="已有内容正在生成中，请稍候")

    try:
        existing = db.query(GeneratedContent).filter(
            GeneratedContent.user_id == user.id,
            GeneratedContent.brand_id == body.brand_id,
            GeneratedContent.status == "generating",
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="已有内容正在生成中，请稍候")

        content = GeneratedContent(
            user_id=user.id,
            brand_id=body.brand_id,
            content_type=body.content_type.value,
            title="",
            body="",
            status="generating",
            engine=body.engine,
            target_word_count=body.target_word_count,
            word_count=0,
        )
        db.add(content)
        db.commit()
        db.refresh(content)
    except HTTPException:
        _release_generation_lock(user.id, body.brand_id)
        raise
    except Exception:
        _release_generation_lock(user.id, body.brand_id)
        raise

    # 使用 Celery 异步任务
    from celery_tasks.content_tasks import generate_content_async

    task = generate_content_async.delay(
        content_id=content.id,
        user_id=user.id,
        brand_id=body.brand_id,
        content_type=body.content_type.value,
        custom_instructions=body.custom_instructions,
        language=body.language,
        target_word_count=body.target_word_count,
        engine=body.engine,
    )

    return {
        "success": True,
        "data": {
            "task_id": task.id,
            "content_id": content.id,
            "status": "generating",
            "message": "内容生成中...",
        },
        "error": None,
    }


@router.get("", response_model=dict)
def list_contents(
    brand_id: int | None = Query(default=None),
    content_type: str | None = Query(default=None),
    content_status: str | None = Query(default=None, alias="status"),
    cursor: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(GeneratedContent).filter(GeneratedContent.user_id == user.id)

    if brand_id:
        query = query.filter(GeneratedContent.brand_id == brand_id)
    if content_type:
        query = query.filter(GeneratedContent.content_type == content_type)
    if content_status:
        query = query.filter(GeneratedContent.status == content_status)
    if cursor:
        query = query.filter(GeneratedContent.id < cursor)

    items = query.order_by(GeneratedContent.id.desc()).limit(limit + 1).all()
    has_more = len(items) > limit
    items = items[:limit]

    brand_ids = list(set(c.brand_id for c in items))
    brands_map = {}
    if brand_ids:
        brands = db.query(Brand).filter(Brand.id.in_(brand_ids)).all()
        brands_map = {b.id: b.name for b in brands}

    result = []
    for c in items:
        result.append({
            "id": c.id,
            "brand_id": c.brand_id,
            "brand_name": brands_map.get(c.brand_id, ""),
            "content_type": c.content_type,
            "title": c.title,
            "body": c.body or "",
            "tags": c.tags if isinstance(c.tags, list) else [],
            "status": c.status,
            "word_count": c.word_count,
            "quality_score": float(c.quality_score) if c.quality_score else None,
            "target_platform": c.target_platform,
            "published_at": c.published_at.isoformat() if c.published_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "engine": c.engine or "mimo",
            "target_word_count": c.target_word_count or 1000,
        })

    next_cursor = items[-1].id if items and has_more else None

    return {
        "success": True,
        "data": {
            "items": result,
            "next_cursor": str(next_cursor) if next_cursor else None,
            "has_more": has_more,
        },
        "error": None,
    }


@router.get("/stats", response_model=dict)
def get_content_stats(
    brand_id: int | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(GeneratedContent).filter(GeneratedContent.user_id == user.id)
    if brand_id:
        query = query.filter(GeneratedContent.brand_id == brand_id)

    all_contents = query.all()

    by_status = {}
    by_type = {}
    for c in all_contents:
        by_status[c.status] = by_status.get(c.status, 0) + 1
        by_type[c.content_type] = by_type.get(c.content_type, 0) + 1

    published = [c for c in all_contents if c.status in ("published", "verified")]
    adopted_count = 0
    total_delta = 0
    delta_count = 0
    for c in published:
        checks = db.query(AdoptionCheck).filter(
            AdoptionCheck.content_id == c.id,
            AdoptionCheck.is_adopted == True,
        ).first()
        if checks:
            adopted_count += 1
        if c.id:
            latest_delta = (
                db.query(AdoptionCheck)
                .filter(
                    AdoptionCheck.content_id == c.id,
                    AdoptionCheck.check_type == "ranking_delta",
                    AdoptionCheck.score_delta.isnot(None),
                )
                .order_by(AdoptionCheck.id.desc())
                .first()
            )
            if latest_delta and latest_delta.score_delta:
                total_delta += float(latest_delta.score_delta)
                delta_count += 1

    usage = usage_tracker.get_current_usage(db, user.id)
    content_usage = usage["dimensions"]["content"]

    return {
        "success": True,
        "data": {
            "total_contents": len(all_contents),
            "by_status": by_status,
            "by_type": by_type,
            "adoption_summary": {
                "total_published": len(published),
                "total_adopted": adopted_count,
                "adoption_rate": round(adopted_count / len(published) * 100, 1) if published else 0,
                "avg_ranking_delta": round(total_delta / delta_count, 1) if delta_count else 0,
            },
            "this_month": {
                "generated": content_usage["used"],
                "limit": content_usage["limit"],
                "remaining": max(0, content_usage["limit"] - content_usage["used"]) if content_usage["limit"] > 0 else 0,
            },
        },
        "error": None,
    }


@router.get("/{content_id}", response_model=dict)
def get_content(
    content_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = _get_content_or_404(content_id, user.id, db)
    brand = db.query(Brand).filter(Brand.id == c.brand_id).first()

    return {
        "success": True,
        "data": {
            "id": c.id,
            "user_id": c.user_id,
            "brand_id": c.brand_id,
            "brand_name": brand.name if brand else "",
            "content_type": c.content_type,
            "title": c.title,
            "body": c.body,
            "tags": c.tags if isinstance(c.tags, list) else [],
            "platform_format": c.platform_format,
            "distribution_guide": c.distribution_guide,
            "status": c.status,
            "source_analysis_run_id": c.source_analysis_run_id,
            "source_weak_keywords": c.source_weak_keywords,
            "source_competitor_gaps": c.source_competitor_gaps,
            "published_at": c.published_at.isoformat() if c.published_at else None,
            "target_platform": c.target_platform,
            "target_platform_url": c.target_platform_url,
            "quality_score": float(c.quality_score) if c.quality_score else None,
            "word_count": c.word_count,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "engine": c.engine or "mimo",
            "target_word_count": c.target_word_count or 1000,
            "is_generating": c.status == "generating",
        },
        "error": None,
    }


@router.put("/{content_id}", response_model=dict)
def update_content(
    content_id: int,
    body: ContentUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = _get_content_or_404(content_id, user.id, db)
    if c.status not in ("draft", "ready"):
        raise HTTPException(status_code=409, detail="Only draft or ready content can be edited")

    if body.title is not None:
        c.title = body.title
    if body.body is not None:
        c.body = body.body
        c.word_count = len(re.sub(r"<[^>]+>", "", body.body))
    if body.tags is not None:
        c.tags = body.tags

    c.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(c)

    return {
        "success": True,
        "data": {
            "id": c.id,
            "title": c.title,
            "body": c.body,
            "tags": c.tags if isinstance(c.tags, list) else [],
            "word_count": c.word_count,
            "updated_at": c.updated_at.isoformat(),
        },
        "error": None,
    }


@router.post("/{content_id}/regenerate", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
def regenerate_content(
    content_id: int,
    body: RegenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = _get_content_or_404(content_id, user.id, db)

    if c.status not in ("draft", "failed"):
        raise HTTPException(status_code=409, detail="Only draft or failed content can be regenerated")

    # 更新状态为 generating
    c.status = "generating"
    c.updated_at = datetime.now(timezone.utc)
    db.commit()

    # 使用 Celery 异步任务
    from celery_tasks.content_tasks import regenerate_content_async

    task = regenerate_content_async.delay(
        content_id=content_id,
        section_text=body.section_text,
        modification_instructions=body.modification_instructions,
    )

    logger.info("Content %d regeneration started (task_id=%s)", content_id, task.id)

    return {
        "success": True,
        "data": {
            "task_id": task.id,
            "content_id": content_id,
            "status": "generating",
            "regenerate_type": "partial" if body.section_text else "full",
            "message": "内容重新生成已启动，请通过轮询 GET /api/content/{id} 查询状态",
        },
        "error": None,
    }


@router.post("/{content_id}/confirm", response_model=dict)
def confirm_content(
    content_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = _get_content_or_404(content_id, user.id, db)
    if c.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft content can be confirmed")

    c.status = "ready"
    c.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "success": True,
        "data": {"id": c.id, "status": "ready", "message": "内容已确认，可进行分发"},
        "error": None,
    }


@router.post("/{content_id}/publish", response_model=dict)
def publish_content(
    content_id: int,
    body: PublishRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = _get_content_or_404(content_id, user.id, db)

    if c.status == "ready":
        c.status = "published"
        c.published_at = datetime.now(timezone.utc)
        c.target_platform = body.target_platform.value if body.target_platform else None
        c.target_platform_url = body.platform_url
        c.updated_at = datetime.now(timezone.utc)
    elif c.status == "published":
        raise HTTPException(status_code=409, detail="Content is already published. Use PUT /api/content/{id} to update.")
    else:
        raise HTTPException(status_code=409, detail="Only ready content can be published")

    if body.platform_url:
        dist = ContentDistribution(
            content_id=content_id,
            platform=body.target_platform.value if body.target_platform else "other",
            platform_url=body.platform_url,
            status="published",
            published_at=datetime.now(timezone.utc),
            notes=body.publish_notes,
        )
        db.add(dist)

    db.commit()
    db.refresh(c)

    return {
        "success": True,
        "data": {
            "id": c.id,
            "status": "published",
            "published_at": c.published_at.isoformat() if c.published_at else None,
            "target_platform": c.target_platform,
            "target_platform_url": c.target_platform_url,
            "message": "已标记为发布，采纳检测将于第 3 天开始",
        },
        "error": None,
    }


@router.get("/{content_id}/adoption", response_model=dict)
def get_adoption(
    content_id: int,
    user: User = Depends(require_feature("adoption_tracking")),
    db: Session = Depends(get_db),
):
    c = _get_content_or_404(content_id, user.id, db)

    checks = db.query(AdoptionCheck).filter(AdoptionCheck.content_id == content_id).all()

    platform_index = next((ch for ch in checks if ch.check_type == "platform_index"), None)
    ai_citations = [ch for ch in checks if ch.check_type == "ai_citation"]
    ranking_delta = next((ch for ch in checks if ch.check_type == "ranking_delta"), None)

    days_since = 0
    if c.published_at:
        days_since = (datetime.now(timezone.utc) - c.published_at).days

    timeline = []
    for d in [3, 7, 14, 30]:
        check = next((ch for ch in checks if ch.days_after_publish == d), None)
        if c.published_at:
            from datetime import timedelta
            check_date = (c.published_at + timedelta(days=d)).strftime("%Y-%m-%d")
        else:
            check_date = "pending"
        timeline.append({
            "days_after_publish": d,
            "check_date": check_date,
            "is_adopted": check.is_adopted if check else None,
            "citation_count": check.citation_count if check else None,
            "status": "done" if check else ("overdue" if d <= days_since else "pending"),
        })

    engines = []
    for engine_name in ["openai", "claude", "gemini", "deepseek", "qianwen", "mimo"]:
        ch = next((ac for ac in ai_citations if ac.detail and ac.detail.get("engine") == engine_name), None)
        engines.append({
            "engine": engine_name,
            "cited": ch.is_adopted if ch else False,
            "position": int(ch.citation_position) if ch and ch.citation_position else None,
            "accuracy": float(ch.citation_accuracy) if ch and ch.citation_accuracy else None,
            "checked_at": ch.created_at.isoformat() if ch else None,
        })

    return {
        "success": True,
        "data": {
            "content_id": content_id,
            "published_at": c.published_at.isoformat() if c.published_at else None,
            "days_since_publish": days_since,
            "platform_indexing": {
                "is_indexed": platform_index.is_adopted if platform_index else False,
                "indexed_at": platform_index.created_at.isoformat() if platform_index and platform_index.is_adopted else None,
                "search_rank": int(platform_index.citation_position) if platform_index and platform_index.citation_position else None,
                "search_engine": "google",
            },
            "ai_citations": {
                "total_citations": sum(1 for e in engines if e["cited"]),
                "engines": engines,
            },
            "ranking_delta": {
                "score_before": float(ranking_delta.score_before) if ranking_delta and ranking_delta.score_before else None,
                "score_after": float(ranking_delta.score_after) if ranking_delta and ranking_delta.score_after else None,
                "delta": float(ranking_delta.score_delta) if ranking_delta and ranking_delta.score_delta else None,
                "delta_percent": round(float(ranking_delta.score_delta) / float(ranking_delta.score_before) * 100, 1) if ranking_delta and ranking_delta.score_before and ranking_delta.score_delta else None,
                "checked_at": ranking_delta.created_at.isoformat() if ranking_delta else None,
            },
            "timeline": timeline,
        },
        "error": None,
    }
