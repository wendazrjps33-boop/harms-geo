from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Boolean, Integer, Numeric, Text, JSON, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plan_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    price_monthly: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=0)
    price_yearly: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=0)
    brand_limit: Mapped[int] = mapped_column(Integer, default=1)
    query_limit_per_brand: Mapped[int] = mapped_column(Integer, default=5)
    engine_limit: Mapped[int] = mapped_column(Integer, default=2)
    allowed_engines: Mapped[dict] = mapped_column(JSON, default=list)
    check_interval_hours: Mapped[int] = mapped_column(Integer, default=0)
    history_days: Mapped[int] = mapped_column(Integer, default=7)
    competitor_limit: Mapped[int] = mapped_column(Integer, default=0)
    content_monthly_limit: Mapped[int] = mapped_column(Integer, default=0)
    content_types_allowed: Mapped[dict] = mapped_column(JSON, default=list)
    team_members: Mapped[int] = mapped_column(Integer, default=1)
    api_access: Mapped[bool] = mapped_column(Boolean, default=False)
    white_label: Mapped[bool] = mapped_column(Boolean, default=False)
    report_watermark: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(nullable=False, index=True)
    plan_code: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    billing_cycle: Mapped[str] = mapped_column(String(10), nullable=False, default="monthly")
    current_period_start: Mapped[datetime] = mapped_column(nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(nullable=False)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_end: Mapped[datetime | None] = mapped_column(nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("idx_user_subscriptions_user", "user_id"),
        Index("idx_user_subscriptions_status", "status"),
        Index("idx_user_subscriptions_stripe_customer", "stripe_customer_id"),
    )


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(nullable=False)
    dimension: Mapped[str] = mapped_column(String(20), nullable=False)
    period_start: Mapped[datetime] = mapped_column(nullable=False)
    period_end: Mapped[datetime] = mapped_column(nullable=False)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    limit_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    updated_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")

    __table_args__ = (
        Index("idx_usage_records_unique", "user_id", "dimension", "period_start", unique=True),
    )


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_user_id: Mapped[int] = mapped_column(nullable=False)
    member_user_id: Mapped[int] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")
    invited_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    accepted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("idx_team_members_unique", "owner_user_id", "member_user_id"),
        Index("idx_team_members_member", "member_user_id"),
    )
