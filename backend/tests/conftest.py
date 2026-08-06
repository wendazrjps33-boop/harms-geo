"""
Pytest 配置文件

提供测试数据库、客户端和通用 fixtures。
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 设置测试环境变量
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"  # 使用不同的 Redis DB
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret"

from app.main import app
from app.database import Base, get_db
from app.dependencies import get_current_user
from app.models.user import User

# 测试数据库引擎
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """创建测试数据库会话"""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """创建测试客户端"""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """创建测试用户"""
    from app.services.auth_service import hash_password

    user = User(
        email="test@example.com",
        password=hash_password("testpassword123"),
        name="Test User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """获取认证 headers"""
    from app.services.auth_service import create_access_token

    token = create_access_token(data={"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_redis(monkeypatch):
    """Mock Redis 客户端"""
    from unittest.mock import MagicMock

    mock_client = MagicMock()
    mock_client.get.return_value = None
    mock_client.set.return_value = True
    mock_client.incrby.return_value = 1
    mock_client.expire.return_value = True
    mock_client.pipeline.return_value = mock_client
    mock_client.execute.return_value = [1, True]

    monkeypatch.setattr("app.services.usage_tracker.redis_client", mock_client)
    return mock_client
