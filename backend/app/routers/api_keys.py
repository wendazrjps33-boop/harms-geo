"""API Key 管理 — Agency 计划的 REST API 接入。"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.api_key import ApiKey
from app.models.user import User
from app.models.subscription import UserSubscription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])


# ──────────────────── Schemas ────────────────────


class CreateKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Key 名称")
    expires_days: int = Field(default=90, ge=1, le=365, description="过期天数")


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    key_prefix: str
    created_at: str
    expires_at: str
    last_used_at: str | None
    is_active: bool


# ──────────────────── 辅助函数 ────────────────────


def _generate_api_key() -> tuple[str, str]:
    """生成 API Key，返回 (完整 key, key 前缀)。"""
    raw_key = secrets.token_urlsafe(32)
    key = f"gr_{raw_key}"  # gr_ 前缀标识 GeoRank
    prefix = key[:12] + "..."
    return key, prefix


def _hash_key(key: str) -> str:
    """对 API Key 进行哈希存储。"""
    return hashlib.sha256(key.encode()).hexdigest()


def _check_agency_plan(user_id: int, db: Session) -> None:
    """检查用户是否为 Agency 计划。"""
    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.plan_code == "agency",
            UserSubscription.status.in_(["active", "trialing"]),
        )
        .first()
    )
    if not sub:
        raise HTTPException(status_code=403, detail="API Key management requires Agency plan")


def validate_api_key(api_key: str, db: Session | None = None) -> dict | None:
    """验证 API Key，返回用户信息或 None。

    Args:
        api_key: 待验证的明文 API Key。
        db: SQLAlchemy Session；传入时使用数据库查询，否则返回 None。

    Returns:
        包含 user_id/key_id/name 的字典，验证失败返回 None。
    """
    if not api_key or not api_key.startswith("gr_"):
        return None

    if db is None:
        return None

    key_hash = _hash_key(api_key)
    now = datetime.now(timezone.utc)

    key_row = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()

    if key_row is None:
        return None

    if not key_row.is_active:
        return None

    if key_row.expires_at < now:
        # 标记过期
        key_row.is_active = False
        db.commit()
        return None

    # 更新最后使用时间
    key_row.last_used_at = now
    db.commit()

    return {
        "user_id": key_row.user_id,
        "key_id": key_row.id,
        "name": key_row.name,
    }


# ──────────────────── API 端点 ────────────────────


@router.get("/", response_model=dict)
def list_api_keys(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取用户的 API Key 列表。"""
    _check_agency_plan(user.id, db)

    rows = (
        db.query(ApiKey)
        .filter(ApiKey.user_id == user.id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )

    result = [
        {
            "id": row.id,
            "name": row.name,
            "key_prefix": row.key_prefix,
            "created_at": row.created_at.isoformat(),
            "expires_at": row.expires_at.isoformat(),
            "last_used_at": row.last_used_at.isoformat() if row.last_used_at else None,
            "is_active": row.is_active,
        }
        for row in rows
    ]

    return {
        "success": True,
        "data": {"keys": result, "total": len(result)},
        "error": None,
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_api_key(
    body: CreateKeyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建新的 API Key。"""
    _check_agency_plan(user.id, db)

    # 检查数量限制（每用户最多 3 个活跃 Key）
    active_count = (
        db.query(func.count(ApiKey.id))
        .filter(ApiKey.user_id == user.id, ApiKey.is_active.is_(True))
        .scalar()
    )
    if active_count >= 3:
        raise HTTPException(status_code=409, detail="Maximum 3 API keys per account")

    # 生成 Key
    raw_key, prefix = _generate_api_key()
    key_hash = _hash_key(raw_key)
    now = datetime.now(timezone.utc)

    new_key = ApiKey(
        user_id=user.id,
        name=body.name,
        key_hash=key_hash,
        key_prefix=prefix,
        expires_at=now + timedelta(days=body.expires_days),
        is_active=True,
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)

    logger.info("User %d created API key %d", user.id, new_key.id)

    # 只在创建时返回完整 key
    return {
        "success": True,
        "data": {
            "id": new_key.id,
            "name": new_key.name,
            "key": raw_key,  # 仅此一次显示完整 key
            "key_prefix": prefix,
            "created_at": new_key.created_at.isoformat(),
            "expires_at": new_key.expires_at.isoformat(),
            "message": "Please save this key securely. It will not be shown again.",
        },
        "error": None,
    }


@router.delete("/{key_id}", response_model=dict)
def revoke_api_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """吊销 API Key。"""
    _check_agency_plan(user.id, db)

    key_row = (
        db.query(ApiKey)
        .filter(ApiKey.id == key_id, ApiKey.user_id == user.id)
        .first()
    )
    if not key_row:
        raise HTTPException(status_code=404, detail="API key not found")

    key_row.is_active = False
    key_row.updated_at = datetime.now(timezone.utc)
    db.commit()

    logger.info("User %d revoked API key %d", user.id, key_id)

    return {
        "success": True,
        "data": {"id": key_id, "status": "revoked"},
        "error": None,
    }


@router.post("/{key_id}/rotate", response_model=dict)
def rotate_api_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """轮换 API Key（吊销旧 key，创建新 key）。"""
    _check_agency_plan(user.id, db)

    old_key = (
        db.query(ApiKey)
        .filter(ApiKey.id == key_id, ApiKey.user_id == user.id, ApiKey.is_active.is_(True))
        .first()
    )
    if not old_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # 吊销旧 key
    old_key.is_active = False
    old_key.updated_at = datetime.now(timezone.utc)

    # 生成新 key
    raw_key, prefix = _generate_api_key()
    new_key_hash = _hash_key(raw_key)
    now = datetime.now(timezone.utc)

    new_key = ApiKey(
        user_id=user.id,
        name=old_key.name,
        key_hash=new_key_hash,
        key_prefix=prefix,
        expires_at=now + timedelta(days=90),
        is_active=True,
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)

    logger.info("User %d rotated API key %d -> %d", user.id, key_id, new_key.id)

    return {
        "success": True,
        "data": {
            "id": new_key.id,
            "name": new_key.name,
            "key": raw_key,
            "key_prefix": prefix,
            "created_at": new_key.created_at.isoformat(),
            "expires_at": new_key.expires_at.isoformat(),
            "message": "Please save this key securely. It will not be shown again.",
        },
        "error": None,
    }
