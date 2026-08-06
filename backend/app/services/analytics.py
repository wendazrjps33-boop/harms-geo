from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.report import VisibilityReport


def get_brand_analytics(db: Session, brand_id: int) -> dict:
    reports = db.query(VisibilityReport).filter(VisibilityReport.brand_id == brand_id).all()
    if not reports:
        return {"total_checks": 0, "mention_count": 0, "mention_rate": 0, "avg_score": 0, "trend": 0}

    total = len(reports)
    mentions = sum(1 for r in reports if r.mentioned)
    scores = [float(r.visibility_score) for r in reports]
    avg_score = sum(scores) / len(scores)

    mid = len(scores) // 2
    first_half = sum(scores[:mid]) / mid if mid > 0 else 0
    second_half = sum(scores[mid:]) / (len(scores) - mid) if (len(scores) - mid) > 0 else 0
    trend = second_half - first_half

    return {
        "total_checks": total,
        "mention_count": mentions,
        "mention_rate": round(mentions / total * 100, 1),
        "avg_score": round(avg_score, 2),
        "trend": round(trend, 2),
    }


def get_competitor_analysis(db: Session, user_id: int, brand_id: int) -> list[dict]:
    brands = db.query(Brand).filter(Brand.user_id == user_id, Brand.active == True, Brand.id != brand_id).all()
    return [{"id": b.id, "name": b.name, "visibility_score": float(b.visibility_score)} for b in brands]
