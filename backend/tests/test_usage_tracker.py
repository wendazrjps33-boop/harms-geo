"""
用量追踪模块测试
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.services.usage_tracker import (
    _get_period_key,
    _get_plan_limits,
    get_limit,
    check_quota,
)


def test_get_period_key():
    """测试生成 Redis key"""
    key = _get_period_key(1, "brand")
    assert "usage:1:brand:" in key


def test_get_plan_limits_free(db):
    """测试 Free 计划限制"""
    from app.models.subscription import SubscriptionPlan

    plan = SubscriptionPlan(
        plan_code="free",
        name="Free",
        price_monthly=0,
        price_yearly=0,
        brand_limit=1,
        query_limit_per_brand=5,
        content_monthly_limit=3,
        engine_limit=2,
    )
    db.add(plan)
    db.commit()

    limits = _get_plan_limits(db, "free")
    assert limits["brand"] == 1
    assert limits["content"] == 3


def test_get_plan_limits_unknown(db):
    """测试未知计划"""
    limits = _get_plan_limits(db, "unknown")
    assert limits == {}


def test_check_quota_within_limit(db, mock_redis):
    """测试配额检查 - 未超限"""
    from app.models.subscription import SubscriptionPlan, UserSubscription

    plan = SubscriptionPlan(
        plan_code="pro",
        name="Pro",
        price_monthly=49,
        price_yearly=470,
        brand_limit=5,
        query_limit_per_brand=20,
        content_monthly_limit=10,
        engine_limit=6,
    )
    db.add(plan)

    sub = UserSubscription(
        user_id=1,
        plan_code="pro",
        status="active",
    )
    db.add(sub)
    db.commit()

    mock_redis.get.return_value = "5"  # 已用 5
    result = check_quota(db, 1, "content", 1)
    assert result is True


def test_check_quota_exceeded(db, mock_redis):
    """测试配额检查 - 已超限"""
    from app.models.subscription import SubscriptionPlan, UserSubscription

    plan = SubscriptionPlan(
        plan_code="free",
        name="Free",
        price_monthly=0,
        price_yearly=0,
        brand_limit=1,
        query_limit_per_brand=5,
        content_monthly_limit=3,
        engine_limit=2,
    )
    db.add(plan)

    sub = UserSubscription(
        user_id=1,
        plan_code="free",
        status="active",
    )
    db.add(sub)
    db.commit()

    mock_redis.get.return_value = "3"  # 已用 3，上限 3
    result = check_quota(db, 1, "content", 1)
    assert result is False


def test_check_quota_unlimited(db, mock_redis):
    """测试配额检查 - 无限制"""
    from app.models.subscription import SubscriptionPlan, UserSubscription

    plan = SubscriptionPlan(
        plan_code="free",
        name="Free",
        price_monthly=0,
        price_yearly=0,
        brand_limit=1,
        query_limit_per_brand=5,
        content_monthly_limit=3,
        engine_limit=2,
    )
    db.add(plan)

    sub = UserSubscription(
        user_id=1,
        plan_code="free",
        status="active",
    )
    db.add(sub)
    db.commit()

    # query 维度是无限制 (-1)
    mock_redis.get.return_value = "1000"
    result = check_quota(db, 1, "query", 1)
    assert result is True
