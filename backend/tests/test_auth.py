"""
认证模块测试
"""

import pytest


def test_register(client):
    """测试用户注册"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "newpassword123",
            "name": "New User",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]


def test_register_duplicate_email(client, test_user):
    """测试重复邮箱注册"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": test_user.email,
            "password": "password123",
            "name": "Duplicate User",
        },
    )
    assert response.status_code == 409


def test_login(client, test_user):
    """测试用户登录"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]


def test_login_wrong_password(client, test_user):
    """测试错误密码登录"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


def test_profile(client, auth_headers):
    """测试获取用户信息"""
    response = client.get("/api/auth/profile", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "test@example.com"


def test_profile_unauthorized(client):
    """测试未认证访问"""
    response = client.get("/api/auth/profile")
    assert response.status_code == 401
