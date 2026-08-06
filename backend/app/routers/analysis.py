from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.analysis import (
    AnalysisRunRequest,
    AnalysisRunResponse,
    AnalysisSummaryResponse,
    AnalysisDetailResponse,
    AnalysisComparisonResponse,
)
from app.services import brand_service
from app.services.statistical_analysis import (
    run_statistical_analysis,
    get_statistical_summary,
    get_analysis_runs,
    get_run_detail,
    compare_runs,
)
from app.services.export import export_statistical_csv, export_statistical_pdf
from app.middleware.subscription_gate import require_feature, require_quota, require_feature_with_quota

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/brand/{brand_id}/run", response_model=AnalysisRunResponse)
def start_analysis(
    brand_id: int,
    body: AnalysisRunRequest,
    user: User = Depends(require_quota("query")),
    db: Session = Depends(get_db)
):
    """Start statistical analysis for a brand."""
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    queries = brand_service.get_brand_queries(db, brand_id)
    if not queries:
        raise HTTPException(status_code=400, detail="No queries configured for this brand")

    run = run_statistical_analysis(
        db=db,
        brand_id=brand_id,
        brand_name=brand.name,
        queries=queries,
        engines=body.engines,
        samples_per_query=body.samples_per_query
    )

    return AnalysisRunResponse(
        id=run.id,
        brand_id=run.brand_id,
        status=run.status,
        total_queries=run.total_queries,
        completed_queries=run.completed_queries,
        sample_count=run.sample_count,
        created_at=run.created_at,
    )


@router.get("/brand/{brand_id}/runs", response_model=list[AnalysisRunResponse])
def list_analysis_runs(
    brand_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all analysis runs for a brand."""
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    runs = get_analysis_runs(db, brand_id)
    return [
        AnalysisRunResponse(
            id=run.id,
            brand_id=run.brand_id,
            status=run.status,
            total_queries=run.total_queries,
            completed_queries=run.completed_queries,
            sample_count=run.sample_count,
            created_at=run.created_at,
        )
        for run in runs
    ]


@router.get("/runs/{run_id}", response_model=AnalysisDetailResponse)
def get_analysis_detail(
    run_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed results for a single analysis run."""
    detail = get_run_detail(db, run_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    # Verify brand ownership
    brand = brand_service.get_brand_by_id(db, detail["run"]["brand_id"])
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    return detail


@router.get("/runs/{run_id}/summary", response_model=AnalysisSummaryResponse)
def get_analysis_summary(
    run_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistical summary for an analysis run."""
    # First verify the run exists and user has access
    detail = get_run_detail(db, run_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    brand = brand_service.get_brand_by_id(db, detail["run"]["brand_id"])
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    summary = get_statistical_summary(db, run_id)
    return summary


@router.get("/brand/{brand_id}/compare", response_model=list[AnalysisComparisonResponse])
def compare_analysis_runs(
    brand_id: int,
    run_ids: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Compare multiple analysis runs."""
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    try:
        ids = [int(x.strip()) for x in run_ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run_ids format")

    comparisons = compare_runs(db, ids)
    return comparisons


@router.get("/brand/{brand_id}/runs/{run_id}/export")
def export_analysis(
    brand_id: int,
    run_id: int,
    format: str = "csv",
    lang: str = "en",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export statistical analysis results."""
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    detail = get_run_detail(db, run_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    summary = get_statistical_summary(db, run_id)
    if not summary:
        raise HTTPException(status_code=404, detail="No results found for this run")

    if format == "pdf":
        return export_statistical_pdf(detail["results"], summary, brand.name, lang)
    return export_statistical_csv(detail["results"], summary, brand.name, lang)