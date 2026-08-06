from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User
from app.models.subscription import UserSubscription


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def register_user(db: Session, email: str, password: str, name: str) -> User:
    if db.query(User).filter(User.email == email).first():
        raise ValueError("Email already registered")
    user = User(email=email, password=hash_password(password), name=name)
    db.add(user)
    db.flush()

    now = datetime.now(timezone.utc)
    subscription = UserSubscription(
        user_id=user.id,
        plan_code="free",
        status="active",
        billing_cycle="monthly",
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
        cancel_at_period_end=False,
    )
    db.add(subscription)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, email: str, password: str) -> str:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password):
        raise ValueError("Invalid email or password")
    return create_access_token(user.id)
