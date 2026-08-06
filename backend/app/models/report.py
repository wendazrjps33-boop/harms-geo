from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, Numeric, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VisibilityReport(Base):
    __tablename__ = "visibility_reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    engine: Mapped[str] = mapped_column(String(50), index=True)
    query: Mapped[str] = mapped_column(Text)
    mentioned: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    visibility_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    citation_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    checked_at: Mapped[datetime] = mapped_column(server_default=func.now())

    brand = relationship("Brand", back_populates="reports")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    sample_count: Mapped[int] = mapped_column(Integer, default=3)
    composite_score: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    total_queries: Mapped[int] = mapped_column(Integer, default=0)
    completed_queries: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    created_by: Mapped[int | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    updated_by: Mapped[int | None] = mapped_column(nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    brand = relationship("Brand", back_populates="analysis_runs")
    results = relationship("AnalysisResult", back_populates="run", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True)
    engine: Mapped[str] = mapped_column(String(50), index=True)
    query: Mapped[str] = mapped_column(Text)
    mention_count: Mapped[int] = mapped_column(Integer, default=0)
    total_samples: Mapped[int] = mapped_column(Integer, default=0)
    mention_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    avg_position: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    avg_word_count: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    avg_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    citation_texts: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    created_by: Mapped[int | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    updated_by: Mapped[int | None] = mapped_column(nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    run = relationship("AnalysisRun", back_populates="results")
