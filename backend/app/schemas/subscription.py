from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class PlanCode(str, Enum):
    PRO = "pro"
    AGENCY = "agency"


class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class ChangePlanCode(str, Enum):
    FREE = "free"
    PRO = "pro"
    AGENCY = "agency"


class PlanResponse(BaseModel):
    plan_code: str
    name: str
    price_monthly: float
    price_yearly: float
    brand_limit: int
    query_limit_per_brand: int
    engine_limit: int
    allowed_engines: list[str]
    check_interval_hours: int
    history_days: int
    competitor_limit: int
    content_monthly_limit: int
    content_types_allowed: list[str]
    team_members: int
    api_access: bool
    white_label: bool
    report_watermark: bool

    class Config:
        from_attributes = True


class UsageDimension(BaseModel):
    used: int
    limit: int


class SubscriptionDetail(BaseModel):
    plan_code: str
    plan_name: str
    status: str
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    trial_end: datetime | None
    price: float
    next_billing_date: datetime


class UsageSummary(BaseModel):
    brands: UsageDimension
    queries: UsageDimension
    content: UsageDimension


class CurrentSubscriptionResponse(BaseModel):
    subscription: SubscriptionDetail
    usage: UsageSummary


class CheckoutRequest(BaseModel):
    plan_code: PlanCode
    billing_cycle: BillingCycle = BillingCycle.MONTHLY


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class ChangePlanRequest(BaseModel):
    new_plan_code: ChangePlanCode


class ChangePlanResponse(BaseModel):
    previous_plan: str
    new_plan: str
    effective_date: datetime
    proration_credit: float
    new_charge: float
    message: str


class CancelResponse(BaseModel):
    cancel_at_period_end: bool
    current_period_end: datetime
    message: str


class ReactivateResponse(BaseModel):
    status: str
    cancel_at_period_end: bool
    message: str
