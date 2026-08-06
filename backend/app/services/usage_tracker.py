from datetime import datetime, timezone, timedelta
from decimal import Decimal

import redis
from sqlalchemy.orm import Session

from app.config import settings
from app.models.subscription import UserSubscription, SubscriptionPlan, UsageRecord

# Redis 连接池配置
redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL,
    password=settings.REDIS_PASSWORD,
    decode_responses=True,
    max_connections=20,
    socket_timeout=5,
    socket_connect_timeout=5,
    retry_on_timeout=True,
)
redis_client = redis.Redis(connection_pool=redis_pool)


def _get_period_key(user_id: int, dimension: str) -> str:
    now = datetime.now(timezone.utc)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return f"usage:{user_id}:{dimension}:{period_start.strftime('%Y-%m')}"


def _get_plan_limits(db: Session, plan_code: str) -> dict:
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_code == plan_code).first()
    if not plan:
        return {}
    return {
        "brand": plan.brand_limit,
        "query": -1,   # 查询词维度：当前设计为无限制（-1），按品牌数限制间接控制
        "check": -1,   # 检查次数维度：当前设计为无限制（-1），按计划频率限制间接控制
        "content": plan.content_monthly_limit,
    }


def _get_current_plan_code(db: Session, user_id: int) -> str:
    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.plan_code != "free",
            UserSubscription.status.in_(["active", "trialing"]),
        )
        .first()
    )
    if sub:
        return sub.plan_code

    sub = (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user_id, UserSubscription.plan_code == "free")
        .first()
    )
    if sub:
        return "free"

    return "free"


def increment(user_id: int, dimension: str, count: int = 1) -> int:
    key = _get_period_key(user_id, dimension)
    pipe = redis_client.pipeline()
    pipe.incrby(key, count)
    # 设置 TTL 为 35 天（当前周期 + 缓冲），防止 key 永久累积
    pipe.expire(key, 35 * 24 * 3600)
    results = pipe.execute()
    return results[0]


def get_count(user_id: int, dimension: str) -> int:
    key = _get_period_key(user_id, dimension)
    val = redis_client.get(key)
    return int(val) if val else 0


def check_quota(db: Session, user_id: int, dimension: str, count: int = 1) -> bool:
    plan_code = _get_current_plan_code(db, user_id)
    limits = _get_plan_limits(db, plan_code)

    limit = limits.get(dimension, -1)
    if limit == -1:
        return True

    current = get_count(user_id, dimension)
    return (current + count) <= limit


def get_limit(db: Session, user_id: int, dimension: str) -> int:
    """获取配额上限（含 Add-on 合并）。"""
    plan_code = _get_current_plan_code(db, user_id)
    limits = _get_plan_limits(db, plan_code)
    base_limit = limits.get(dimension, -1)

    if base_limit == -1:
        return -1  # 无限制

    # 查询 Add-on 额度
    from app.models.addon_purchase import AddonPurchase
    from sqlalchemy import func

    addon_quota = db.query(
        func.coalesce(func.sum(AddonPurchase.quantity), 0)
    ).filter(
        AddonPurchase.user_id == user_id,
        AddonPurchase.addon_type == dimension,
        AddonPurchase.status == "active",
        AddonPurchase.expires_at > datetime.now(timezone.utc),
    ).scalar()

    return base_limit + int(addon_quota)


def get_current_usage(db: Session, user_id: int) -> dict:
    """获取当前用量（含 Add-on 配额合并）。"""
    plan_code = _get_current_plan_code(db, user_id)
    limits = _get_plan_limits(db, plan_code)

    now = datetime.now(timezone.utc)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        period_end = period_start.replace(year=now.year + 1, month=1)
    else:
        period_end = period_start.replace(month=now.month + 1)

    # 查询所有 Add-on 额度
    from app.models.addon_purchase import AddonPurchase
    from sqlalchemy import func

    addon_quotas = {}
    addon_results = db.query(
        AddonPurchase.addon_type,
        func.sum(AddonPurchase.quantity)
    ).filter(
        AddonPurchase.user_id == user_id,
        AddonPurchase.status == "active",
        AddonPurchase.expires_at > now,
    ).group_by(AddonPurchase.addon_type).all()

    for addon_type, qty in addon_results:
        addon_quotas[addon_type] = int(qty)

    usage = {}
    for dim, limit in limits.items():
        used = get_count(user_id, dim)
        addon_quota = addon_quotas.get(dim, 0)
        total_limit = limit if limit == -1 else limit + addon_quota
        usage[dim] = {
            "used": used,
            "limit": limit,
            "addon_quota": addon_quota,
            "total_limit": total_limit,
            "unit": _get_dimension_unit(dim),
        }

    return {
        "plan_code": plan_code,
        "period_start": period_start,
        "period_end": period_end,
        "dimensions": usage,
    }


def _get_dimension_unit(dimension: str) -> str:
    units = {
        "brand": "个",
        "query": "个",
        "check": "次",
        "content": "篇",
    }
    return units.get(dimension, "")


def sync_to_db(db: Session, user_id: int, dimension: str):
    now = datetime.now(timezone.utc)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        period_end = period_start.replace(year=now.year + 1, month=1)
    else:
        period_end = period_start.replace(month=now.month + 1)

    redis_count = get_count(user_id, dimension)
    limit = get_limit(db, user_id, dimension)

    existing = (
        db.query(UsageRecord)
        .filter(
            UsageRecord.user_id == user_id,
            UsageRecord.dimension == dimension,
            UsageRecord.period_start == period_start,
        )
        .first()
    )

    if existing:
        existing.used_count = redis_count
        existing.limit_count = limit
        existing.updated_at = now
    else:
        record = UsageRecord(
            user_id=user_id,
            dimension=dimension,
            period_start=period_start,
            period_end=period_end,
            used_count=redis_count,
            limit_count=limit,
        )
        db.add(record)

    db.commit()


def get_usage_history(db: Session, user_id: int, months: int = 6) -> list:
    now = datetime.now(timezone.utc)
    records = (
        db.query(UsageRecord)
        .filter(UsageRecord.user_id == user_id)
        .order_by(UsageRecord.period_start.desc())
        .limit(months * 4)
        .all()
    )

    grouped = {}
    for r in records:
        key = r.period_start.strftime("%Y-%m")
        if key not in grouped:
            grouped[key] = {
                "period_start": r.period_start,
                "period_end": r.period_end,
                "dimensions": {},
            }
        grouped[key]["dimensions"][r.dimension] = {
            "used": r.used_count,
            "limit": r.limit_count,
            "unit": _get_dimension_unit(r.dimension),
        }

    return list(grouped.values())
