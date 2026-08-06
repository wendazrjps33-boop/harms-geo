from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import String, Boolean, Integer, Numeric, Text, JSON, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GeneratedContent(Base):
    __tablename__ = "generated_contents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(nullable=False)
    brand_id: Mapped[int] = mapped_column(nullable=False)
    content_type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    platform_format: Mapped[str] = mapped_column(String(20), default="html")
    distribution_guide: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    source_analysis_run_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_weak_keywords: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source_competitor_gaps: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(nullable=True)
    target_platform: Mapped[str | None] = mapped_column(String(30), nullable=True)
    target_platform_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    quality_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    engine: Mapped[str] = mapped_column(String(20), default="mimo")
    target_word_count: Mapped[int] = mapped_column(Integer, default=1000)
    created_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("idx_generated_contents_user_status", "user_id", "status"),
        Index("idx_generated_contents_brand", "brand_id", "content_type"),
    )


class ContentDistribution(Base):
    __tablename__ = "content_distributions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(nullable=False)
    platform: Mapped[str] = mapped_column(String(30), nullable=False)
    platform_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    published_at: Mapped[datetime | None] = mapped_column(nullable=True)
    indexed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("idx_content_distributions_content", "content_id"),
    )


class AdoptionCheck(Base):
    __tablename__ = "adoption_checks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(nullable=False)
    check_type: Mapped[str] = mapped_column(String(30), nullable=False)
    check_date: Mapped[date] = mapped_column(nullable=False)
    days_after_publish: Mapped[int] = mapped_column(Integer, nullable=False)
    is_adopted: Mapped[bool] = mapped_column(Boolean, default=False)
    citation_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    citation_position: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    citation_accuracy: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    score_before: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    score_after: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    score_delta: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")

    __table_args__ = (
        Index("idx_adoption_checks_content", "content_id", "check_type", "check_date"),
    )


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand_id: Mapped[int] = mapped_column(nullable=False, unique=True)
    brand_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    core_products: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_audience: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_selling_points: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_crawled_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    website_crawled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default="CURRENT_TIMESTAMP")
    updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("idx_brand_profiles_brand", "brand_id"),
    )
