from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.brand import Brand
from app.models.report import AnalysisRun
from app.services.competitor_analysis import run_competitor_comparison, save_comparison_result
from app.middleware.subscription_gate import require_feature, require_feature_with_quota

router = APIRouter(prefix="/api/competitor-analysis", tags=["competitor-analysis"])


class ComparisonRequest(BaseModel):
    competitor_ids: list[int]
    queries: list[str]
    engines: list[str]
    samples_per_query: int = 3


@router.post("/brand/{brand_id}/compare")
def start_comparison(
    brand_id: int,
    body: ComparisonRequest,
    user: User = Depends(require_feature_with_quota("competitor_analysis")),
    db: Session = Depends(get_db)
):
    """Start competitor comparison analysis."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    if not body.competitor_ids:
        raise HTTPException(status_code=400, detail="At least one competitor required")

    if not body.queries:
        raise HTTPException(status_code=400, detail="At least one query required")

    if not body.engines:
        raise HTTPException(status_code=400, detail="At least one engine required")

    try:
        result = run_competitor_comparison(
            db=db,
            brand_id=brand_id,
            competitor_ids=body.competitor_ids,
            queries=body.queries,
            engines=body.engines,
            samples_per_query=body.samples_per_query
        )

        # Save for history tracking
        save_comparison_result(db, brand_id, result)

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/brand/{brand_id}/results")
def get_comparison_results(
    brand_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get latest comparison results for a brand."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    # Get the most recent completed analysis run
    latest_run = db.query(AnalysisRun).filter(
        AnalysisRun.brand_id == brand_id,
        AnalysisRun.status == "completed"
    ).order_by(AnalysisRun.created_at.desc()).first()

    if not latest_run:
        return {"message": "No comparison results found", "results": None}

    return {
        "run_id": latest_run.id,
        "created_at": latest_run.created_at.isoformat() if latest_run.created_at else None,
        "total_queries": latest_run.total_queries,
    }


@router.get("/brand/{brand_id}/history")
def get_comparison_history(
    brand_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comparison history for a brand."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    runs = db.query(AnalysisRun).filter(
        AnalysisRun.brand_id == brand_id
    ).order_by(AnalysisRun.created_at.desc()).limit(20).all()

    history = []
    for run in runs:
        history.append({
            "run_id": run.id,
            "status": run.status,
            "total_queries": run.total_queries,
            "completed_queries": run.completed_queries,
            "sample_count": run.sample_count,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        })

    return {"brand_id": brand_id, "history": history}
