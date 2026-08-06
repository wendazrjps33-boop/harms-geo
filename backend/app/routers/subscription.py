from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.subscription import SubscriptionPlan, UserSubscription
from app.models.addon_purchase import AddonPurchase
from app.schemas.subscription import (
    PlanResponse,
    CurrentSubscriptionResponse,
    CheckoutRequest,
    CheckoutResponse,
    ChangePlanRequest,
    ChangePlanResponse,
    CancelResponse,
    ReactivateResponse,
    SubscriptionDetail,
    UsageSummary,
    UsageDimension,
)
from app.services import billing, usage_tracker
from app.middleware.subscription_gate import get_user_plan_code, get_plan_from_db

router = APIRouter(prefix="/api/subscription", tags=["subscription"])


@router.get("/plans", response_model=dict)
def list_plans(db: Session = Depends(get_db)):
    plans = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.is_active == True)
        .order_by(SubscriptionPlan.sort_order)
        .all()
    )
    return {
        "success": True,
        "data": {"plans": [PlanResponse.model_validate(p) for p in plans]},
        "error": None,
    }


@router.get("/current", response_model=dict)
def get_current_subscription(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan_code = get_user_plan_code(db, user.id)
    plan = get_plan_from_db(db, plan_code)

    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user.id,
            UserSubscription.plan_code != "free",
            UserSubscription.status.in_(["active", "trialing", "past_due"]),
        )
        .order_by(UserSubscription.id.desc())
        .first()
    )

    usage = usage_tracker.get_current_usage(db, user.id)

    if sub:
        price = float(sub.plan_code == "agency" and 199 or sub.plan_code == "pro" and 49 or 0)
        sub_detail = SubscriptionDetail(
            plan_code=sub.plan_code,
            plan_name=plan.name if plan else sub.plan_code,
            status=sub.status,
            billing_cycle=sub.billing_cycle,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
            trial_end=sub.trial_end,
            price=price,
            next_billing_date=sub.current_period_end,
        )
    else:
        now = datetime.now(timezone.utc)
        sub_detail = SubscriptionDetail(
            plan_code="free",
            plan_name="Free",
            status="active",
            billing_cycle="monthly",
            current_period_start=now,
            current_period_end=now,
            cancel_at_period_end=False,
            trial_end=None,
            price=0,
            next_billing_date=now,
        )

    usage_summary = UsageSummary(
        brands=UsageDimension(used=usage["dimensions"]["brand"]["used"], limit=usage["dimensions"]["brand"]["limit"]),
        queries=UsageDimension(used=usage["dimensions"]["query"]["used"], limit=usage["dimensions"]["query"]["limit"]),
        content=UsageDimension(used=usage["dimensions"]["content"]["used"], limit=usage["dimensions"]["content"]["limit"]),
    )

    return {
        "success": True,
        "data": {
            "subscription": sub_detail.model_dump(),
            "usage": usage_summary.model_dump(),
        },
        "error": None,
    }


@router.post("/checkout", response_model=dict)
def create_checkout(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = billing.create_checkout_session(
            db=db,
            user_id=user.id,
            email=user.email,
            name=user.name,
            plan_code=body.plan_code.value,
            billing_cycle=body.billing_cycle.value,
        )
        return {
            "success": True,
            "data": result,
            "error": None,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        result = billing.handle_webhook(db, payload, sig_header)
        return {"received": True}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/cancel", response_model=dict)
def cancel(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = billing.cancel_subscription(db, user.id)
        return {"success": True, "data": result, "error": None}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/reactivate", response_model=dict)
def reactivate(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = billing.reactivate_subscription(db, user.id)
        return {"success": True, "data": result, "error": None}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/change-plan", response_model=dict)
def change_plan(
    body: ChangePlanRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user.id,
            UserSubscription.status.in_(["active", "trialing"]),
        )
        .first()
    )

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found",
        )

    old_plan = sub.plan_code
    new_plan = body.new_plan_code.value

    if old_plan == new_plan:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already on this plan",
        )

    now = datetime.now(timezone.utc)

    plan_order = {"free": 0, "pro": 1, "agency": 2}
    is_upgrade = plan_order.get(new_plan, 0) > plan_order.get(old_plan, 0)

    if is_upgrade:
        sub.plan_code = new_plan
        sub.updated_at = now
        db.commit()
        effective_date = now
        message = "计划已升级，立即生效"
    else:
        sub.plan_code = new_plan
        sub.cancel_at_period_end = False
        sub.updated_at = now
        db.commit()
        effective_date = sub.current_period_end
        message = "计划已降级，将在当前计费周期结束后生效"

    redis_client_key = f"user_plan:{user.id}"
    import redis as r
    rc = r.from_url(settings.REDIS_URL if hasattr(settings, "REDIS_URL") else "", decode_responses=True)
    rc.delete(redis_client_key)

    return {
        "success": True,
        "data": {
            "previous_plan": old_plan,
            "new_plan": new_plan,
            "effective_date": effective_date.isoformat(),
            "proration_credit": 0,
            "new_charge": 0,
            "message": message,
        },
        "error": None,
    }


# ──────────────────── Add-on 端点 ────────────────────


ADDON_TYPES = {"brand_slot", "query_pack", "content_pack"}

ADDON_PRICES = {
    "brand_slot": Decimal("10.00"),
    "query_pack": Decimal("15.00"),
    "content_pack": Decimal("15.00"),
}


class AddonCheckoutRequest(BaseModel):
    addon_type: str = Field(..., description="Add-on 类型：brand_slot/query_pack/content_pack")
    quantity: int = Field(default=1, ge=1, le=10, description="购买数量")


@router.post("/addon/checkout", response_model=dict)
def create_addon_checkout(
    body: AddonCheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建 Add-on 购买的 Stripe Checkout Session。"""
    if body.addon_type not in ADDON_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid addon_type: {body.addon_type}")

    # 检查用户是否有付费计划
    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user.id,
            UserSubscription.plan_code.in_(["pro", "agency"]),
            UserSubscription.status.in_(["active", "trialing"]),
        )
        .first()
    )
    if not sub:
        raise HTTPException(status_code=403, detail="Add-on requires Pro or Agency plan")

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY

        price = ADDON_PRICES[body.addon_type] * body.quantity
        session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"GeoRank Add-on: {body.addon_type} x{body.quantity}",
                    },
                    "unit_amount": int(price * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            metadata={
                "user_id": str(user.id),
                "addon_type": body.addon_type,
                "quantity": str(body.quantity),
            },
            success_url=f"{settings.FRONTEND_URL}/subscription?addon=success",
            cancel_url=f"{settings.FRONTEND_URL}/subscription?addon=cancel",
        )

        return {
            "success": True,
            "data": {
                "checkout_url": session.url,
                "session_id": session.id,
            },
            "error": None,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to create checkout session: {str(e)}")


@router.get("/addons", response_model=dict)
def list_addons(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询用户已购 Add-on 列表。"""
    addons = (
        db.query(AddonPurchase)
        .filter(
            AddonPurchase.user_id == user.id,
            AddonPurchase.status.in_(["active", "pending"]),
        )
        .order_by(AddonPurchase.created_at.desc())
        .all()
    )

    result = []
    summary = {"brand_slot": 0, "query_pack": 0, "content_pack": 0}

    for addon in addons:
        result.append({
            "id": addon.id,
            "addon_type": addon.addon_type,
            "quantity": addon.quantity,
            "amount": float(addon.amount),
            "currency": addon.currency,
            "status": addon.status,
            "expires_at": addon.expires_at.isoformat() if addon.expires_at else None,
            "created_at": addon.created_at.isoformat() if addon.created_at else None,
        })
        if addon.status == "active":
            summary[addon.addon_type] = summary.get(addon.addon_type, 0) + addon.quantity

    return {
        "success": True,
        "data": {
            "addons": result,
            "total": len(result),
            "summary": summary,
        },
        "error": None,
    }
