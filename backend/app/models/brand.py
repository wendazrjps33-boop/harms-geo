from datetime import datetime

from sqlalchemy import String, Boolean, Text, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    website: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    visibility_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    user = relationship("User", back_populates="brands")
    queries = relationship("BrandQuery", back_populates="brand", cascade="all, delete-orphan")
    reports = relationship("VisibilityReport", back_populates="brand", cascade="all, delete-orphan")
    analysis_runs = relationship("AnalysisRun", back_populates="brand", cascade="all, delete-orphan")
    competitor_links = relationship("BrandCompetitor", foreign_keys="BrandCompetitor.brand_id", back_populates="brand", cascade="all, delete-orphan")
    competitor_of_links = relationship("BrandCompetitor", foreign_keys="BrandCompetitor.competitor_id", back_populates="competitor")


class BrandQuery(Base):
    __tablename__ = "brand_queries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    query: Mapped[str] = mapped_column(Text)

    brand = relationship("Brand", back_populates="queries")
