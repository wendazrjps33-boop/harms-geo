from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WebhookEvent(Base):
    """Stripe Webhook 事件去重记录。

    每个 event_id 仅处理一次，防止 Stripe 重试导致重复操作。
    """
    __tablename__ = "webhook_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, comment="Stripe event ID")
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, comment="事件类型")
    status: Mapped[str] = mapped_column(String(20), default="processed", comment="处理状态: processed/failed")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="失败原因")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间")

    __table_args__ = (
        Index("ix_webhook_events_event_id", "event_id", unique=True),
    )
