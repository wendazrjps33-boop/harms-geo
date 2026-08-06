"""团队管理 API — Agency 计划多用户协作。"""

import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.subscription import TeamMember, UserSubscription, SubscriptionPlan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/team", tags=["team"])

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


# ──────────────────── Schemas ────────────────────


class InviteRequest(BaseModel):
    email: str = Field(..., description="被邀请人邮箱")
    role: str = Field(default="member", description="角色：admin/member")


class MemberResponse(BaseModel):
    id: int
    user_id: int
    email: str
    name: str | None
    role: str
    status: str
    invited_at: str
    accepted_at: str | None


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., description="新角色：admin/member")


# ──────────────────── 辅助函数 ────────────────────


def _get_team_owner_check(user_id: int, db: Session) -> None:
    """检查用户是否为 Agency 计划的团队拥有者。"""
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
        raise HTTPException(status_code=403, detail="Team management requires Agency plan")


def _check_team_limit(owner_id: int, db: Session) -> None:
    """检查团队成员数量是否超限。"""
    # 从数据库获取团队成员上限
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_code == "agency").first()
    team_limit = plan.team_members if plan else 5  # 默认 5 人

    current_count = (
        db.query(TeamMember)
        .filter(
            TeamMember.owner_user_id == owner_id,
            TeamMember.is_deleted == False,
            TeamMember.status == "accepted",
        )
        .count()
    )
    # +1 因为 owner 自己也算一个席位
    if current_count + 1 >= team_limit:
        raise HTTPException(status_code=409, detail=f"Team member limit reached ({team_limit} members max)")


# ──────────────────── API 端点 ────────────────────


@router.get("/members", response_model=dict)
def list_members(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取团队成员列表。"""
    _get_team_owner_check(user.id, db)

    members = (
        db.query(TeamMember)
        .filter(
            TeamMember.owner_user_id == user.id,
            TeamMember.is_deleted == False,
        )
        .all()
    )

    # 批量查询用户信息，避免 N+1 查询
    user_ids = [m.member_user_id for m in members]
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    result = []
    for m in members:
        member_user = users_map.get(m.member_user_id)
        result.append({
            "id": m.id,
            "user_id": m.member_user_id,
            "email": member_user.email if member_user else "unknown",
            "name": member_user.name if member_user else None,
            "role": m.role,
            "status": m.status,
            "invited_at": m.invited_at.isoformat() if m.invited_at else None,
            "accepted_at": m.accepted_at.isoformat() if m.accepted_at else None,
        })

    return {
        "success": True,
        "data": {"members": result, "total": len(result)},
        "error": None,
    }


@router.post("/invite", response_model=dict, status_code=status.HTTP_201_CREATED)
def invite_member(
    body: InviteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """邀请团队成员。"""
    _get_team_owner_check(user.id, db)
    _check_team_limit(user.id, db)

    # 验证邮箱格式
    if not EMAIL_REGEX.match(body.email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # 检查被邀请人是否存在
    invitee = db.query(User).filter(User.email == body.email).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User with this email not found")

    if invitee.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    # 检查是否已经是团队成员
    existing = (
        db.query(TeamMember)
        .filter(
            TeamMember.owner_user_id == user.id,
            TeamMember.member_user_id == invitee.id,
            TeamMember.is_deleted == False,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="User is already a team member")

    # 验证角色
    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

    # 创建邀请
    team_member = TeamMember(
        owner_user_id=user.id,
        member_user_id=invitee.id,
        role=body.role,
        status="accepted",  # MVP 阶段直接接受，后续可改为邀请制
        invited_at=datetime.now(timezone.utc),
        accepted_at=datetime.now(timezone.utc),
        created_by=user.id,
    )
    db.add(team_member)
    db.commit()
    db.refresh(team_member)

    logger.info("User %d invited user %d as %s", user.id, invitee.id, body.role)

    return {
        "success": True,
        "data": {
            "id": team_member.id,
            "member_user_id": invitee.id,
            "email": invitee.email,
            "role": body.role,
            "status": "accepted",
        },
        "error": None,
    }


@router.put("/{member_id}/role", response_model=dict)
def update_member_role(
    member_id: int,
    body: UpdateRoleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """变更团队成员角色。"""
    _get_team_owner_check(user.id, db)

    member = (
        db.query(TeamMember)
        .filter(
            TeamMember.id == member_id,
            TeamMember.owner_user_id == user.id,
            TeamMember.is_deleted == False,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

    member.role = body.role
    member.updated_at = datetime.now(timezone.utc)
    member.updated_by = user.id
    db.commit()

    logger.info("User %d changed member %d role to %s", user.id, member_id, body.role)

    return {
        "success": True,
        "data": {"id": member_id, "role": body.role},
        "error": None,
    }


@router.delete("/{member_id}", response_model=dict)
def remove_member(
    member_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """移除团队成员（软删除）。"""
    _get_team_owner_check(user.id, db)

    member = (
        db.query(TeamMember)
        .filter(
            TeamMember.id == member_id,
            TeamMember.owner_user_id == user.id,
            TeamMember.is_deleted == False,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    member.is_deleted = True
    member.deleted_at = datetime.now(timezone.utc)
    member.updated_at = datetime.now(timezone.utc)
    member.updated_by = user.id
    db.commit()

    logger.info("User %d removed member %d", user.id, member_id)

    return {
        "success": True,
        "data": {"id": member_id, "status": "removed"},
        "error": None,
    }
