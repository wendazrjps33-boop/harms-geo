"""API Key 数据库模型 — Agency 计划的 REST API 接入凭证。"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ApiKey(Base):
    """API Key 持久化模型。

    存储用户创建的 API Key 哈希值，用于 REST API 鉴权。
    明文 Key 仅在创建时返回一次，数据库中仅保存 SHA-256 哈希。
    """

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    key_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True,
    )
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=True,
    )

    # 关系
    user = relationship("User", back_populates="api_keys")

    # 复合索引：按用户查询活跃 Key
    __table_args__ = (
        Index("ix_api_keys_user_active", "user_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<ApiKey id={self.id} user_id={self.user_id} name={self.name!r}>"
