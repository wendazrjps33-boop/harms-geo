"""Add-on 购买记录模型。"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AddonPurchase(Base):
    """Add-on 购买记录表。"""

    __tablename__ = "addon_purchases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(nullable=False)
    addon_type: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    stripe_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    plan_period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    plan_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index("idx_addon_user_status", "user_id", "status", "expires_at"),
        Index("idx_addon_expiring", "status", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<AddonPurchase(id={self.id}, user_id={self.user_id}, type={self.addon_type}, qty={self.quantity})>"
