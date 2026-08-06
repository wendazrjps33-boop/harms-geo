import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import stripe
from sqlalchemy.orm import Session

from app.config import settings
from app.models.subscription import UserSubscription, SubscriptionPlan

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY if hasattr(settings, "STRIPE_SECRET_KEY") else ""


def get_plan_price(db: Session, plan_code: str, billing_cycle: str) -> Decimal:
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_code == plan_code).first()
    if not plan:
        raise ValueError(f"Plan {plan_code} not found")
    if billing_cycle == "yearly":
        return Decimal(str(plan.price_yearly))
    return Decimal(str(plan.price_monthly))


def get_or_create_stripe_customer(user_id: int, email: str, name: str) -> str:
    customers = stripe.Customer.list(email=email, limit=1)
    if customers.data:
        return customers.data[0].id
    customer = stripe.Customer.create(email=email, name=name, metadata={"user_id": str(user_id)})
    return customer.id


def create_checkout_session(
    db: Session,
    user_id: int,
    email: str,
    name: str,
    plan_code: str,
    billing_cycle: str,
) -> dict:
    existing = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status.in_(["active", "trialing"]),
            UserSubscription.plan_code != "free",
        )
        .first()
    )
    if existing:
        raise ValueError("已有活跃订阅，请先取消当前订阅")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_code == plan_code).first()
    if not plan:
        raise ValueError(f"Plan {plan_code} not found")

    stripe_customer_id = get_or_create_stripe_customer(user_id, email, name)

    price = get_plan_price(db, plan_code, billing_cycle)
    price_cents = int(price * 100)

    if price_cents <= 0:
        raise ValueError("Free plan does not require checkout")

    interval = "month" if billing_cycle == "monthly" else "year"

    session = stripe.checkout.Session.create(
        customer=stripe_customer_id,
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": f"GeoRank {plan.name} Plan"},
                    "unit_amount": price_cents,
                    "recurring": {"interval": interval},
                },
                "quantity": 1,
            }
        ],
        mode="subscription",
        success_url=f"{settings.FRONTEND_URL}/subscription?success=true",
        cancel_url=f"{settings.FRONTEND_URL}/subscription?canceled=true",
        metadata={
            "user_id": str(user_id),
            "plan_code": plan_code,
            "billing_cycle": billing_cycle,
        },
    )

    return {"checkout_url": session.url, "session_id": session.id}


def handle_webhook(db: Session, payload: bytes, sig_header: str) -> dict:
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET if hasattr(settings, "STRIPE_WEBHOOK_SECRET") else ""
    if not webhook_secret:
        raise ValueError("Stripe webhook secret not configured")

    event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(db, data)
    elif event_type == "invoice.payment_succeeded":
        _handle_payment_succeeded(db, data)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(db, data)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, data)

    return {"received": True, "event_type": event_type}


def _handle_checkout_completed(db: Session, session: dict):
    user_id = int(session["metadata"]["user_id"])
    plan_code = session["metadata"]["plan_code"]
    billing_cycle = session["metadata"]["billing_cycle"]
    stripe_subscription_id = session.get("subscription")
    stripe_customer_id = session.get("customer")

    now = datetime.now(timezone.utc)
    if billing_cycle == "yearly":
        period_end = now + timedelta(days=365)
    else:
        period_end = now + timedelta(days=30)

    existing = (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user_id, UserSubscription.plan_code != "free")
        .first()
    )

    if existing:
        existing.plan_code = plan_code
        existing.status = "active"
        existing.billing_cycle = billing_cycle
        existing.current_period_start = now
        existing.current_period_end = period_end
        existing.stripe_subscription_id = stripe_subscription_id
        existing.stripe_customer_id = stripe_customer_id
        existing.cancel_at_period_end = False
        existing.canceled_at = None
    else:
        sub = UserSubscription(
            user_id=user_id,
            plan_code=plan_code,
            status="active",
            billing_cycle=billing_cycle,
            current_period_start=now,
            current_period_end=period_end,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id,
        )
        db.add(sub)

    db.commit()


def _handle_payment_succeeded(db: Session, invoice: dict):
    stripe_subscription_id = invoice.get("subscription")
    if not stripe_subscription_id:
        return

    sub = (
        db.query(UserSubscription)
        .filter(UserSubscription.stripe_subscription_id == stripe_subscription_id)
        .first()
    )
    if not sub:
        return

    sub.status = "active"
    now = datetime.now(timezone.utc)
    sub.current_period_start = now
    if sub.billing_cycle == "yearly":
        sub.current_period_end = now + timedelta(days=365)
    else:
        sub.current_period_end = now + timedelta(days=30)
    db.commit()


def _handle_payment_failed(db: Session, invoice: dict):
    stripe_subscription_id = invoice.get("subscription")
    if not stripe_subscription_id:
        return

    sub = (
        db.query(UserSubscription)
        .filter(UserSubscription.stripe_subscription_id == stripe_subscription_id)
        .first()
    )
    if not sub:
        return

    sub.status = "past_due"
    db.commit()

    # 发送支付失败通知邮件
    try:
        from app.models.user import User
        from app.services.email_service import send_payment_failed
        user = db.query(User).filter(User.id == sub.user_id).first()
        if user and user.email:
            amount = invoice.get("amount_due", 0) / 100
            plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_code == sub.plan_code).first()
            plan_name = plan.name if plan else sub.plan_code
            send_payment_failed(
                user_email=user.email,
                user_name=user.name or user.email,
                amount=amount,
                plan_name=plan_name,
            )
    except Exception as e:
        logger.error("Failed to send payment failed email: %s", e)


def _handle_subscription_deleted(db: Session, subscription: dict):
    stripe_subscription_id = subscription.get("id")

    sub = (
        db.query(UserSubscription)
        .filter(UserSubscription.stripe_subscription_id == stripe_subscription_id)
        .first()
    )
    if not sub:
        return

    sub.status = "canceled"
    sub.canceled_at = datetime.now(timezone.utc)
    sub.plan_code = "free"
    sub.stripe_subscription_id = None
    db.commit()

    # 发送订阅取消通知邮件
    try:
        from app.models.user import User
        from app.services.email_service import send_subscription_changed
        user = db.query(User).filter(User.id == sub.user_id).first()
        if user and user.email:
            send_subscription_changed(
                user_email=user.email,
                user_name=user.name or user.email,
                action="canceled",
                plan_name="Free",
                effective_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            )
    except Exception as e:
        logger.error("Failed to send subscription canceled email: %s", e)


def cancel_subscription(db: Session, user_id: int) -> dict:
    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status.in_(["active", "trialing"]),
        )
        .first()
    )
    if not sub:
        raise ValueError("No active subscription found")

    if sub.stripe_subscription_id:
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            cancel_at_period_end=True,
        )

    sub.cancel_at_period_end = True
    db.commit()

    return {
        "cancel_at_period_end": True,
        "current_period_end": sub.current_period_end,
        "message": "订阅将在当前计费周期结束后取消",
    }


def reactivate_subscription(db: Session, user_id: int) -> dict:
    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.cancel_at_period_end == True,
        )
        .first()
    )
    if not sub:
        raise ValueError("Subscription not in cancel-pending state")

    if sub.stripe_subscription_id:
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            cancel_at_period_end=False,
        )

    sub.cancel_at_period_end = False
    db.commit()

    return {
        "status": "active",
        "cancel_at_period_end": False,
        "message": "订阅已恢复",
    }
