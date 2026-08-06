from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.brand import Brand
from app.models.competitor import BrandCompetitor
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse
from app.schemas.competitor import CompetitorAddRequest, CompetitorResponse
from app.schemas.content import BrandProfileUpdateRequest, BrandProfileResponse
from app.services import brand_service
from app.services.analytics import get_brand_analytics
from app.models.content import BrandProfile

router = APIRouter(prefix="/api/brands", tags=["brands"])


@router.get("", response_model=list[BrandResponse])
def list_brands(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brands = brand_service.get_brands_by_user(db, user.id)
    result = []
    for b in brands:
        queries = brand_service.get_brand_queries(db, b.id)
        result.append(_to_response(b, queries))
    return result


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(body: BrandCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.create_brand(db, user.id, body.name, body.website, body.description, body.queries)
    return _to_response(brand, body.queries)


@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")
    queries = brand_service.get_brand_queries(db, brand.id)
    return _to_response(brand, queries)


@router.put("/{brand_id}", response_model=BrandResponse)
def update_brand(brand_id: int, body: BrandUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")
    updated = brand_service.update_brand(db, brand_id, **body.model_dump(exclude_unset=True))
    queries = brand_service.get_brand_queries(db, updated.id)
    return _to_response(updated, queries)


@router.delete("/{brand_id}")
def delete_brand(brand_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")
    brand_service.delete_brand(db, brand_id)
    return {"message": "Brand deleted"}


@router.put("/{brand_id}/profile", response_model=dict)
def update_brand_profile(
    brand_id: int,
    body: BrandProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    profile = db.query(BrandProfile).filter(BrandProfile.brand_id == brand_id).first()
    if not profile:
        profile = BrandProfile(brand_id=brand_id)
        db.add(profile)

    profile.brand_description = body.brand_description
    profile.core_products = body.core_products
    profile.target_audience = body.target_audience
    if body.key_selling_points is not None:
        profile.key_selling_points = body.key_selling_points
    if body.industry is not None:
        profile.industry = body.industry.value if hasattr(body.industry, 'value') else body.industry

    from datetime import datetime, timezone
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)

    return {
        "success": True,
        "data": {
            "brand_id": profile.brand_id,
            "brand_description": profile.brand_description,
            "core_products": profile.core_products,
            "target_audience": profile.target_audience,
            "key_selling_points": profile.key_selling_points,
            "industry": profile.industry,
            "website_crawled_at": profile.website_crawled_at.isoformat() if profile.website_crawled_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        },
        "error": None,
    }


@router.get("/{brand_id}/profile", response_model=dict)
def get_brand_profile(
    brand_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    profile = db.query(BrandProfile).filter(BrandProfile.brand_id == brand_id).first()
    if not profile:
        return {
            "success": True,
            "data": None,
            "error": None,
        }

    return {
        "success": True,
        "data": {
            "brand_id": profile.brand_id,
            "brand_description": profile.brand_description,
            "core_products": profile.core_products,
            "target_audience": profile.target_audience,
            "key_selling_points": profile.key_selling_points,
            "industry": profile.industry,
            "website_crawled_at": profile.website_crawled_at.isoformat() if profile.website_crawled_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        },
        "error": None,
    }


@router.get("/{brand_id}/analytics")
def brand_analytics(brand_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")
    return get_brand_analytics(db, brand_id)


# Competitor Management Endpoints

@router.get("/{brand_id}/competitors", response_model=list[CompetitorResponse])
def list_competitors(brand_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all competitors for a brand."""
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    competitors = db.query(BrandCompetitor).filter(
        BrandCompetitor.brand_id == brand_id
    ).all()

    result = []
    for link in competitors:
        comp = link.competitor
        result.append(CompetitorResponse(
            id=comp.id,
            name=comp.name,
            website=comp.website,
            visibility_score=float(comp.visibility_score),
            added_at=link.created_at.isoformat() if link.created_at else ""
        ))
    return result


@router.post("/{brand_id}/competitors", response_model=CompetitorResponse)
def add_competitor(
    brand_id: int,
    body: CompetitorAddRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a competitor to a brand."""
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    # Check competitor exists
    competitor = brand_service.get_brand_by_id(db, body.competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor brand not found")

    # Can't add self as competitor
    if brand_id == body.competitor_id:
        raise HTTPException(status_code=400, detail="Cannot add self as competitor")

    # Check if already exists
    existing = db.query(BrandCompetitor).filter(
        and_(
            BrandCompetitor.brand_id == brand_id,
            BrandCompetitor.competitor_id == body.competitor_id
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Competitor already added")

    link = BrandCompetitor(brand_id=brand_id, competitor_id=body.competitor_id)
    db.add(link)
    db.commit()
    db.refresh(link)

    return CompetitorResponse(
        id=competitor.id,
        name=competitor.name,
        website=competitor.website,
        visibility_score=float(competitor.visibility_score),
        added_at=link.created_at.isoformat() if link.created_at else ""
    )


@router.delete("/{brand_id}/competitors/{competitor_id}")
def remove_competitor(
    brand_id: int,
    competitor_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a competitor from a brand."""
    brand = brand_service.get_brand_by_id(db, brand_id)
    if not brand or brand.user_id != user.id:
        raise HTTPException(status_code=404, detail="Brand not found")

    link = db.query(BrandCompetitor).filter(
        and_(
            BrandCompetitor.brand_id == brand_id,
            BrandCompetitor.competitor_id == competitor_id
        )
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Competitor not found")

    db.delete(link)
    db.commit()
    return {"message": "Competitor removed"}


def _to_response(brand, queries):
    return BrandResponse(
        id=brand.id,
        user_id=brand.user_id,
        name=brand.name,
        website=brand.website,
        description=brand.description,
        visibility_score=float(brand.visibility_score),
        created_at=brand.created_at,
        active=brand.active,
        queries=queries,
    )
