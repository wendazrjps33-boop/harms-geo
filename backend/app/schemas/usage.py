from datetime import datetime
from pydantic import BaseModel


class UsageDimensionDetail(BaseModel):
    used: int
    limit: int
    unit: str


class UsageCurrentResponse(BaseModel):
    plan_code: str
    period_start: datetime
    period_end: datetime
    dimensions: dict[str, UsageDimensionDetail]


class UsageHistoryRecord(BaseModel):
    period_start: datetime
    period_end: datetime
    dimensions: dict[str, UsageDimensionDetail]


class UsageHistoryResponse(BaseModel):
    records: list[UsageHistoryRecord]
