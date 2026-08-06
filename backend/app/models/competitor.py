from datetime import datetime

from sqlalchemy import Column, BigInteger, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class BrandCompetitor(Base):
    __tablename__ = "brand_competitors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    brand_id = Column(BigInteger, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    competitor_id = Column(BigInteger, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    brand = relationship("Brand", foreign_keys=[brand_id], back_populates="competitor_links")
    competitor = relationship("Brand", foreign_keys=[competitor_id], back_populates="competitor_of_links")

    __table_args__ = (
        UniqueConstraint('brand_id', 'competitor_id', name='uq_brand_competitor'),
    )
