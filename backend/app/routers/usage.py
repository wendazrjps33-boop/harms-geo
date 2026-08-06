from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services import usage_tracker

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.get("/current", response_model=dict)
def get_current_usage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    usage = usage_tracker.get_current_usage(db, user.id)
    return {"success": True, "data": usage, "error": None}


@router.get("/history", response_model=dict)
def get_usage_history(
    dimension: str | None = Query(default=None),
    months: int = Query(default=6, ge=1, le=24),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = usage_tracker.get_usage_history(db, user.id, months)
    if dimension:
        for record in records:
            record["dimensions"] = {
                k: v for k, v in record["dimensions"].items() if k == dimension
            }
    return {"success": True, "data": {"records": records}, "error": None}
