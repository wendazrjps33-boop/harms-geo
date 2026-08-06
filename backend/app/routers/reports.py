from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.report import VisibilityReport
from app.models.brand import Brand
from app.schemas.report import ReportCheckRequest, ReportResponse
from app.services import brand_service
from app.services.ai_gateway import check_visibility, ENGINE_MAP
from app.services.analytics import get_brand_analytics
from app.services.export import export_csv, export_pdf

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/check", response_model=ReportResponse)
def check_report(body: ReportCheckRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.get_brand_by_id(db, body.brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    result = check_visibility(brand.name, body.query, body.engine)
    report = VisibilityReport(
        brand_id=brand.id,
        engine=body.engine,
        query=body.query,
        **result,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    _update_brand_score(db, brand)
    return report


@router.get("/brand/{brand_id}", response_model=list[ReportResponse])
def get_brand_reports(brand_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")
    return db.query(VisibilityReport).filter(VisibilityReport.brand_id == brand_id).order_by(VisibilityReport.checked_at.desc()).all()


@router.post("/brand/{brand_id}/check-all", response_model=list[ReportResponse])
def check_all_queries(brand_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    queries = brand_service.get_brand_queries(db, brand_id)
    reports = []
    for engine in ENGINE_MAP:
        for q in queries:
            try:
                result = check_visibility(brand.name, q, engine)
                report = VisibilityReport(brand_id=brand.id, engine=engine, query=q, **result)
                db.add(report)
                db.flush()
                reports.append(report)
            except Exception:
                continue
    db.commit()
    _update_brand_score(db, brand)
    return reports


@router.get("/brand/{brand_id}/latest", response_model=ReportResponse | None)
def get_latest_report(brand_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")
    return db.query(VisibilityReport).filter(VisibilityReport.brand_id == brand_id).order_by(VisibilityReport.checked_at.desc()).first()


@router.get("/brand/{brand_id}/export")
def export_brand_reports(brand_id: int, format: str = "csv", lang: str = "en", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"[export] format={format}, lang={lang}")
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    reports = db.query(VisibilityReport).filter(VisibilityReport.brand_id == brand_id).order_by(VisibilityReport.checked_at.desc()).all()
    if not reports:
        raise HTTPException(status_code=404, detail="No reports to export")

    if format == "pdf":
        analytics = get_brand_analytics(db, brand_id)
        return export_pdf(reports, brand.name, analytics, lang)
    return export_csv(reports, brand.name, lang)


def _update_brand_score(db: Session, brand: Brand):
    reports = db.query(VisibilityReport).filter(VisibilityReport.brand_id == brand.id).all()
    if reports:
        avg = sum(float(r.visibility_score) for r in reports) / len(reports)
        brand.visibility_score = round(avg, 2)
        db.commit()
