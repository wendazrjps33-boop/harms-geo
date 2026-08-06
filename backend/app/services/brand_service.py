from sqlalchemy.orm import Session

from app.models.brand import Brand, BrandQuery


def create_brand(db: Session, user_id: int, name: str, website: str, description: str | None, queries: list[str]) -> Brand:
    brand = Brand(user_id=user_id, name=name, website=website, description=description)
    db.add(brand)
    db.flush()
    for q in queries:
        db.add(BrandQuery(brand_id=brand.id, query=q))
    db.commit()
    db.refresh(brand)
    return brand


def get_brands_by_user(db: Session, user_id: int) -> list[Brand]:
    return db.query(Brand).filter(Brand.user_id == user_id, Brand.active == True).all()


def get_brand_by_id(db: Session, brand_id: int) -> Brand | None:
    return db.query(Brand).filter(Brand.id == brand_id, Brand.active == True).first()


def update_brand(db: Session, brand_id: int, **kwargs) -> Brand | None:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.active == True).first()
    if not brand:
        return None
    queries = kwargs.pop("queries", None)
    for k, v in kwargs.items():
        if v is not None:
            setattr(brand, k, v)
    if queries is not None:
        db.query(BrandQuery).filter(BrandQuery.brand_id == brand_id).delete()
        for q in queries:
            db.add(BrandQuery(brand_id=brand_id, query=q))
    db.commit()
    db.refresh(brand)
    return brand


def delete_brand(db: Session, brand_id: int) -> bool:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        return False
    brand.active = False
    db.commit()
    return True


def get_brand_queries(db: Session, brand_id: int) -> list[str]:
    queries = db.query(BrandQuery).filter(BrandQuery.brand_id == brand_id).all()
    return [q.query for q in queries]
