from datetime import datetime

from pydantic import BaseModel


class ReportCheckRequest(BaseModel):
    brand_id: int
    query: str
    engine: str = "openai"


class ReportResponse(BaseModel):
    id: int
    brand_id: int
    engine: str
    query: str
    mentioned: bool
    position: int | None
    word_count: int | None
    visibility_score: float
    citation_text: str | None
    checked_at: datetime

    class Config:
        from_attributes = True
