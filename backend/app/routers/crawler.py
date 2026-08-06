from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.brand import Brand
from app.schemas.content import CrawlerRequest, CrawlerResponse
from app.services import crawler
from app.middleware.subscription_gate import require_feature

router = APIRouter(prefix="/api/crawler", tags=["crawler"])


@router.post("/analyze", response_model=dict)
def analyze_website(
    body: CrawlerRequest,
    user: User = Depends(require_feature("content_generation")),
    db: Session = Depends(get_db),
):
    brand = db.query(Brand).filter(
        Brand.id == body.brand_id,
        Brand.user_id == user.id,
    ).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    try:
        result = crawler.analyze_website(
            db=db,
            user_id=user.id,
            brand_id=body.brand_id,
            url=str(body.url),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "VALIDATION_ERROR",
                "message": str(e),
                "details": {"url": str(body.url)},
            },
        )

    return {
        "success": True,
        "data": {
            "task_id": f"crawl-{body.brand_id}",
            "estimated_seconds": 15,
            "message": "官网分析完成",
            "brand_info": result["brand_info"],
            "crawl_summary": result["crawl_summary"],
        },
        "error": None,
    }
