import re
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.content import BrandProfile


def check_robots_txt(url: str) -> tuple[bool, str]:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

    rp = RobotFileParser()
    rp.set_url(robots_url)
    try:
        rp.read()
        can_fetch = rp.can_fetch("*", url)
        if not can_fetch:
            return False, f"robots.txt disallows crawling: {robots_url}"
        return True, ""
    except Exception:
        return True, ""


def crawl_website(url: str) -> dict:
    headers = {
        "User-Agent": "GeoRank-Bot/1.0 (+https://georank.ai/bot)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    try:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise ValueError(f"HTTP error {e.response.status_code}: {e.response.reason_phrase}")
    except httpx.RequestError as e:
        raise ValueError(f"Request failed: {str(e)}")

    html = response.text
    soup = BeautifulSoup(html, "html.parser")

    title = ""
    if soup.title:
        title = soup.title.string.strip() if soup.title.string else ""

    meta_desc = ""
    meta_desc_tag = soup.find("meta", attrs={"name": "description"})
    if meta_desc_tag and meta_desc_tag.get("content"):
        meta_desc = meta_desc_tag["content"].strip()

    meta_keywords = ""
    meta_kw_tag = soup.find("meta", attrs={"name": "keywords"})
    if meta_kw_tag and meta_kw_tag.get("content"):
        meta_keywords = meta_kw_tag["content"].strip()

    og_data = {}
    for og_tag in soup.find_all("meta", attrs={"property": re.compile(r"^og:")}):
        prop = og_tag.get("property", "")
        content = og_tag.get("content", "")
        if prop and content:
            og_data[prop] = content

    h1_tags = [h1.get_text(strip=True) for h1 in soup.find_all("h1")[:3]]
    h2_tags = [h2.get_text(strip=True) for h2 in soup.find_all("h2")[:5]]

    body_text = soup.get_text(separator=" ", strip=True)
    body_text = re.sub(r"\s+", " ", body_text)
    body_text = body_text[:5000]

    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith(("http://", "https://")):
            links.append(href)
        elif href.startswith("/"):
            links.append(urljoin(url, href))
    links = list(set(links))[:50]

    images = []
    for img in soup.find_all("img", src=True):
        src = img["src"]
        alt = img.get("alt", "")
        if src.startswith(("http://", "https://")):
            images.append({"src": src, "alt": alt})
        elif src.startswith("/"):
            images.append({"src": urljoin(url, src), "alt": alt})
    images = images[:20]

    structured_data = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            import json
            data = json.loads(script.string)
            structured_data.append(data)
        except Exception:
            pass

    return {
        "url": url,
        "title": title,
        "meta_description": meta_desc,
        "meta_keywords": meta_keywords,
        "og_data": og_data,
        "h1_tags": h1_tags,
        "h2_tags": h2_tags,
        "body_text": body_text,
        "links": links,
        "images": images,
        "structured_data": structured_data,
        "status_code": response.status_code,
        "content_type": response.headers.get("content-type", ""),
    }


def extract_brand_info(crawl_result: dict) -> dict:
    brand_info = {
        "name": "",
        "description": "",
        "website": crawl_result["url"],
    }

    if crawl_result["title"]:
        brand_info["name"] = crawl_result["title"]

    if crawl_result["meta_description"]:
        brand_info["description"] = crawl_result["meta_description"]

    if crawl_result["og_data"]:
        if "og:site_name" in crawl_result["og_data"]:
            brand_info["name"] = crawl_result["og_data"]["og:site_name"]
        if "og:description" in crawl_result["og_data"] and not brand_info["description"]:
            brand_info["description"] = crawl_result["og_data"]["og:description"]

    for sd in crawl_result["structured_data"]:
        if isinstance(sd, dict):
            if sd.get("@type") == "Organization":
                if sd.get("name"):
                    brand_info["name"] = sd["name"]
                if sd.get("description"):
                    brand_info["description"] = sd["description"]
            elif sd.get("@type") == "WebSite":
                if sd.get("name"):
                    brand_info["name"] = sd["name"]

    return brand_info


def analyze_website(db: Session, user_id: int, brand_id: int, url: str) -> dict:
    can_crawl, robots_msg = check_robots_txt(url)
    if not can_crawl:
        raise ValueError(robots_msg)

    crawl_result = crawl_website(url)

    brand_info = extract_brand_info(crawl_result)

    profile = db.query(BrandProfile).filter(BrandProfile.brand_id == brand_id).first()
    if not profile:
        profile = BrandProfile(brand_id=brand_id)
        db.add(profile)

    if brand_info["description"] and not profile.brand_description:
        profile.brand_description = brand_info["description"][:500]

    db.commit()

    return {
        "brand_info": brand_info,
        "crawl_summary": {
            "title": crawl_result["title"],
            "meta_description": crawl_result["meta_description"],
            "h1_count": len(crawl_result["h1_tags"]),
            "h2_count": len(crawl_result["h2_tags"]),
            "link_count": len(crawl_result["links"]),
            "image_count": len(crawl_result["images"]),
            "has_structured_data": len(crawl_result["structured_data"]) > 0,
            "status_code": crawl_result["status_code"],
        },
        "structured_data": crawl_result["structured_data"],
    }
