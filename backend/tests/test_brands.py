"""
品牌模块测试
"""

import pytest


def test_create_brand(client, auth_headers):
    """测试创建品牌"""
    response = client.post(
        "/api/brands",
        json={
            "name": "Test Brand",
            "website": "https://example.com",
            "industry": "Technology",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Test Brand"


def test_list_brands(client, auth_headers):
    """测试获取品牌列表"""
    # 先创建一个品牌
    client.post(
        "/api/brands",
        json={"name": "Brand 1"},
        headers=auth_headers,
    )

    response = client.get("/api/brands", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1


def test_get_brand(client, auth_headers):
    """测试获取单个品牌"""
    # 先创建一个品牌
    create_response = client.post(
        "/api/brands",
        json={"name": "Test Brand"},
        headers=auth_headers,
    )
    brand_id = create_response.json()["data"]["id"]

    response = client.get(f"/api/brands/{brand_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "Test Brand"


def test_update_brand(client, auth_headers):
    """测试更新品牌"""
    # 先创建一个品牌
    create_response = client.post(
        "/api/brands",
        json={"name": "Old Name"},
        headers=auth_headers,
    )
    brand_id = create_response.json()["data"]["id"]

    response = client.put(
        f"/api/brands/{brand_id}",
        json={"name": "New Name"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "New Name"


def test_delete_brand(client, auth_headers):
    """测试删除品牌"""
    # 先创建一个品牌
    create_response = client.post(
        "/api/brands",
        json={"name": "To Delete"},
        headers=auth_headers,
    )
    brand_id = create_response.json()["data"]["id"]

    response = client.delete(f"/api/brands/{brand_id}", headers=auth_headers)
    assert response.status_code == 200

    # 验证已删除
    get_response = client.get(f"/api/brands/{brand_id}", headers=auth_headers)
    assert get_response.status_code == 404


def test_brand_not_found(client, auth_headers):
    """测试品牌不存在"""
    response = client.get("/api/brands/999", headers=auth_headers)
    assert response.status_code == 404


def test_brand_unauthorized(client):
    """测试未认证访问"""
    response = client.get("/api/brands")
    assert response.status_code == 401
