from datetime import datetime

from pydantic import BaseModel


class CompetitorAddRequest(BaseModel):
    competitor_id: int


class CompetitorResponse(BaseModel):
    id: int
    name: str
    website: str
    visibility_score: float
    added_at: str

    class Config:
        from_attributes = True


class CompetitorListResponse(BaseModel):
    competitors: list[CompetitorResponse]