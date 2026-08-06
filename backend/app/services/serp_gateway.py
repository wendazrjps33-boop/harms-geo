"""
SERP API 网关

替代直接爬取 Google 搜索结果，使用合规的 SERP API 服务。
"""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# SERP API 配置（通过环境变量设置）
SERP_API_KEY = getattr(settings, "SERP_API_KEY", "")
SERP_API_PROVIDER = getattr(settings, "SERP_API_PROVIDER", "serpapi")  # serpapi | valueserp


def check_url_indexed(url: str) -> dict:
    """
    检查 URL 是否被搜索引擎收录

    Args:
        url: 要检查的 URL

    Returns:
        dict: {
            "is_indexed": bool,
            "method": str,
            "error": Optional[str]
        }
    """
    if not SERP_API_KEY:
        logger.warning("SERP_API_KEY not configured, using fallback method")
        return _check_url_accessible(url)

    if SERP_API_PROVIDER == "serpapi":
        return _check_with_serpapi(url)
    elif SERP_API_PROVIDER == "valueserp":
        return _check_with_valueserp(url)
    else:
        logger.warning("Unknown SERP API provider: %s", SERP_API_PROVIDER)
        return _check_url_accessible(url)


def _check_with_serpapi(url: str) -> dict:
    """
    使用 SerpAPI 检查 URL 收录状态

    https://serpapi.com/
    """
    try:
        domain = url.split("//")[-1].split("/")[0]
        query = f"site:{domain}"

        response = httpx.get(
            "https://serpapi.com/search",
            params={
                "q": query,
                "api_key": SERP_API_KEY,
                "engine": "google",
                "num": 10,
            },
            timeout=30,
        )

        if response.status_code != 200:
            logger.error("SerpAPI error: %d %s", response.status_code, response.text[:200])
            return {"is_indexed": False, "method": "serpapi", "error": f"API error: {response.status_code}"}

        data = response.json()
        organic_results = data.get("organic_results", [])

        # 检查 URL 是否在搜索结果中
        for result in organic_results:
            result_url = result.get("link", "")
            if url in result_url or result_url in url:
                return {"is_indexed": True, "method": "serpapi"}

        return {"is_indexed": False, "method": "serpapi"}

    except Exception as e:
        logger.error("SerpAPI check failed: %s", e)
        return {"is_indexed": False, "method": "serpapi", "error": str(e)}


def _check_with_valueserp(url: str) -> dict:
    """
    使用 ValueSERP 检查 URL 收录状态

    https://www.valueserp.com/
    """
    try:
        domain = url.split("//")[-1].split("/")[0]
        query = f"site:{domain}"

        response = httpx.get(
            "https://api.valueserp.com/search",
            params={
                "q": query,
                "api_key": SERP_API_KEY,
                "num": 10,
            },
            timeout=30,
        )

        if response.status_code != 200:
            logger.error("ValueSERP error: %d %s", response.status_code, response.text[:200])
            return {"is_indexed": False, "method": "valueserp", "error": f"API error: {response.status_code}"}

        data = response.json()
        organic_results = data.get("organic_results", [])

        # 检查 URL 是否在搜索结果中
        for result in organic_results:
            result_url = result.get("link", "")
            if url in result_url or result_url in url:
                return {"is_indexed": True, "method": "valueserp"}

        return {"is_indexed": False, "method": "valueserp"}

    except Exception as e:
        logger.error("ValueSERP check failed: %s", e)
        return {"is_indexed": False, "method": "valueserp", "error": str(e)}


def _check_url_accessible(url: str) -> dict:
    """
    降级方案：检查 URL 是否可访问

    注意：这不等于搜索引擎收录，仅作为降级方案。
    """
    try:
        with httpx.Client(timeout=15, follow_redirects=True) as client:
            response = client.head(url, headers={"User-Agent": "GeoRank/1.0"})
            is_accessible = response.status_code == 200
            return {"is_indexed": is_accessible, "method": "url_alive"}
    except httpx.TimeoutException:
        return {"is_indexed": False, "method": "url_alive", "error": "timeout"}
    except Exception as e:
        return {"is_indexed": False, "method": "url_alive", "error": str(e)}
