from datetime import datetime

from pydantic import BaseModel


class BrandCreate(BaseModel):
    name: str
    website: str
    description: str | None = None
    queries: list[str] = []


class BrandUpdate(BaseModel):
    name: str | None = None
    website: str | None = None
    description: str | None = None
    queries: list[str] | None = None


class BrandResponse(BaseModel):
    id: int
    user_id: int
    name: str
    website: str
    description: str | None
    visibility_score: float
    created_at: datetime
    active: bool
    queries: list[str] = []

    class Config:
        from_attributes = True
