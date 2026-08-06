import json

import redis
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.subscription import UserSubscription, SubscriptionPlan
from app.services import usage_tracker

redis_client = redis.from_url(settings.REDIS_URL, password=settings.REDIS_PASSWORD, decode_responses=True)

PLAN_CACHE_KEY = "plan:{plan_code}"
PLAN_CACHE_TTL = 3600

FEATURE_PLAN_MAP = {
    "competitor_analysis": ["pro", "agency"],
    "content_generation": ["pro", "agency"],
    "adoption_tracking": ["pro", "agency"],
    "api_access": ["agency"],
    "white_label": ["agency"],
    "team_management": ["agency"],
    "advanced_analytics": ["agency"],
}


def get_user_plan_code(db: Session, user_id: int) -> str:
    cache_key = f"user_plan:{user_id}"
    cached = redis_client.get(cache_key)
    if cached:
        return cached

    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status.in_(["active", "trialing"]),
        )
        .order_by(UserSubscription.id.desc())
        .first()
    )

    plan_code = sub.plan_code if sub else "free"
    redis_client.setex(cache_key, 300, plan_code)
    return plan_code


def get_plan_from_db(db: Session, plan_code: str) -> SubscriptionPlan | None:
    cache_key = PLAN_CACHE_KEY.format(plan_code=plan_code)
    cached = redis_client.get(cache_key)
    if cached:
        data = json.loads(cached)
        plan = SubscriptionPlan()
        for k, v in data.items():
            if hasattr(plan, k):
                setattr(plan, k, v)
        return plan

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_code == plan_code).first()
    if plan:
        data = {
            "plan_code": plan.plan_code,
            "name": plan.name,
            "brand_limit": plan.brand_limit,
            "query_limit_per_brand": plan.query_limit_per_brand,
            "engine_limit": plan.engine_limit,
            "content_monthly_limit": plan.content_monthly_limit,
            "content_types_allowed": plan.content_types_allowed,
            "api_access": plan.api_access,
            "white_label": plan.white_label,
            "team_members": plan.team_members,
        }
        redis_client.setex(cache_key, PLAN_CACHE_TTL, json.dumps(data))
    return plan


def require_feature(feature_name: str):
    def dependency(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        plan_code = get_user_plan_code(db, user.id)
        allowed_plans = FEATURE_PLAN_MAP.get(feature_name, [])
        if plan_code not in allowed_plans:
            required = " or ".join(allowed_plans)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FEATURE_NOT_AVAILABLE",
                    "message": f"当前计划不支持此功能，需要 {required} 计划",
                    "details": {"current_plan": plan_code, "feature": feature_name},
                },
            )
        return user

    return dependency


def require_quota(dimension: str):
    def dependency(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        if not usage_tracker.check_quota(db, user.id, dimension):
            plan_code = get_user_plan_code(db, user.id)
            limit = usage_tracker.get_limit(db, user.id, dimension)
            used = usage_tracker.get_count(user.id, dimension)
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "code": "QUOTA_EXCEEDED",
                    "message": f"{dimension} 配额已用完",
                    "details": {"current": used, "limit": limit, "plan": plan_code},
                },
            )
        return user

    return dependency
