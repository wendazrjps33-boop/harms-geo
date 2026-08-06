import json
import logging
import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.brand import Brand, BrandQuery
from app.models.content import GeneratedContent, BrandProfile
from app.models.report import VisibilityReport, AnalysisRun, AnalysisResult
from app.services.ai_gateway import generate_text
from app.services.quality_checker import check_quality
from app import task_store

logger = logging.getLogger(__name__)

PROMPT_TEMPLATES = {
    "faq": {
        "system": """你是一位专业的 GEO（Generative Engine Optimization）内容策略师。
根据品牌信息和分析数据，生成 3-5 组 FAQ 问答内容，同时输出人类可读文本和 JSON-LD Schema.org 格式。

输出格式（严格 JSON）：
{
  "title": "FAQ 标题",
  "body": "HTML 格式的问答内容，使用 <h2>/<h3> 标题、<p> 段落、<ul>/<li> 列表、<strong> 加粗、<blockquote> 引用等语义化标签",
  "tags": ["标签1", "标签2"],
  "distribution_guide": {
    "platforms": [
      {"name": "品牌官网", "steps": ["将 JSON-LD 嵌入页面 <head>", "将问答内容放在页面正文"], "best_time": "随时"}
    ]
  },
  "faq_schema": {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": []}
}""",
        "user": """品牌信息：
- 品牌名：{brand_name}
- 官网：{website}
- 描述：{description}
- 核心产品：{core_products}
- 目标受众：{target_audience}
- 行业：{industry}

薄弱关键词（AI 搜索中提及率低）：{weak_keywords}
竞品差距：{competitor_gaps}

自定义指令：{custom_instructions}

请生成 FAQ 内容，确保品牌信息准确引用，不包含虚假宣传。""",
    },
    "community_qa": {
        "system": """你是一位经验丰富的社区内容创作者。
根据品牌信息生成适合 Reddit/Quora 等平台的问答式内容。内容应以自然对话形式呈现，不硬广，提供真实价值。

输出格式（严格 JSON）：
{
  "title": "帖子标题（≤300字符）",
  "body": "HTML 格式的问答内容（300-800字），使用 <p> 段落、<strong> 加粗、<ul>/<li> 列表等语义化标签",
  "tags": ["标签1", "标签2"],
  "distribution_guide": {
    "platforms": [
      {"name": "Reddit", "steps": ["找到相关 subreddit", "发布帖子", "参与讨论"], "best_time": "工作日 9-11 时 EST"},
      {"name": "Quora", "steps": ["搜索相关问题", "撰写回答", "添加品牌引用"], "best_time": "随时"}
    ]
  }
}""",
        "user": """品牌信息：
- 品牌名：{brand_name}
- 官网：{website}
- 描述：{description}
- 核心产品：{core_products}

薄弱关键词：{weak_keywords}
竞品差距：{competitor_gaps}

自定义指令：{custom_instructions}

请生成社区问答内容，以真实用户视角撰写，品牌自然植入。""",
    },
    "article": {
        "system": """你是一位资深行业分析师和内容策略师。
根据品牌信息和行业数据，生成一篇深度行业分析文章（800-1500字），品牌自然植入。

输出格式（严格 JSON）：
{
  "title": "文章标题",
  "body": "HTML 格式的长文，使用 <h2>/<h3> 小标题、<p> 段落、<strong> 加粗、<ul>/<li> 列表、<blockquote> 引用、<table> 数据表格等语义化标签",
  "tags": ["标签1", "标签2", "标签3"],
  "distribution_guide": {
    "platforms": [
      {"name": "Medium", "steps": ["登录 Medium", "新建文章", "粘贴内容", "添加标签"], "best_time": "工作日 9-11 时"},
      {"name": "知乎", "steps": ["创建专栏文章", "粘贴内容", "添加话题"], "best_time": "工作日 20-22 时"},
      {"name": "微信公众号", "steps": ["新建图文", "排版", "发布"], "best_time": "工作日 12-13 时"}
    ]
  }
}""",
        "user": """品牌信息：
- 品牌名：{brand_name}
- 官网：{website}
- 描述：{description}
- 核心产品：{core_products}
- 目标受众：{target_audience}
- 行业：{industry}

薄弱关键词：{weak_keywords}
竞品差距：{competitor_gaps}

自定义指令：{custom_instructions}

请生成深度行业文章，数据引用需标注来源，品牌植入自然不生硬。""",
    },
    "press_release": {
        "system": """你是一位专业的公关撰稿人。
根据品牌信息生成一篇新闻稿（500-1000字），采用倒金字塔结构。

输出格式（严格 JSON）：
{
  "title": "新闻稿标题",
  "body": "HTML 格式的新闻稿，使用 <h2> 小标题、<p> 段落、<strong> 加粗、<ul>/<li> 列表等语义化标签，包含标题、导语、正文、联系方式",
  "tags": ["标签1", "标签2"],
  "distribution_guide": {
    "platforms": [
      {"name": "PR Newswire", "steps": ["注册账户", "提交新闻稿", "选择发布范围"], "best_time": "工作日 10-14 时 EST"},
      {"name": "企业官网", "steps": ["发布到新闻中心", "分享到社交媒体"], "best_time": "随时"}
    ]
  }
}""",
        "user": """品牌信息：
- 品牌名：{brand_name}
- 官网：{website}
- 描述：{description}
- 核心产品：{core_products}
- 行业：{industry}

薄弱关键词：{weak_keywords}
竞品差距：{competitor_gaps}

自定义指令：{custom_instructions}

请生成新闻稿，确保事实准确，不含虚假宣传，符合新闻稿格式规范。""",
    },
}


def gather_input_data(db: Session, brand_id: int) -> dict:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise ValueError(f"Brand {brand_id} not found")

    profile = db.query(BrandProfile).filter(BrandProfile.brand_id == brand_id).first()

    latest_run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.brand_id == brand_id)
        .order_by(AnalysisRun.id.desc())
        .first()
    )

    weak_keywords = []
    competitor_gaps = []

    if latest_run:
        results = (
            db.query(AnalysisResult)
            .filter(AnalysisResult.run_id == latest_run.id, AnalysisResult.mention_rate < 30)
            .all()
        )
        weak_keywords = list(set([r.query for r in results]))

    queries = db.query(BrandQuery).filter(BrandQuery.brand_id == brand_id).all()
    query_texts = [q.query for q in queries]

    return {
        "brand_name": brand.name,
        "website": brand.website,
        "description": brand.description or (profile.brand_description if profile else ""),
        "core_products": profile.core_products if profile else "",
        "target_audience": profile.target_audience if profile else "",
        "industry": profile.industry if profile else "",
        "key_selling_points": profile.key_selling_points if profile else "",
        "weak_keywords": ", ".join(weak_keywords[:5]) if weak_keywords else "暂无",
        "competitor_gaps": json.dumps(competitor_gaps, ensure_ascii=False) if competitor_gaps else "暂无",
        "query_texts": query_texts,
        "analysis_run_id": latest_run.id if latest_run else None,
        "weak_keywords_list": weak_keywords,
    }


def generate_content(
    db: Session,
    user_id: int,
    brand_id: int,
    content_type: str,
    custom_instructions: str | None = None,
    language: str = "zh",
    target_word_count: int = 1000,
    engine: str = "mimo",
    content_id: int | None = None,
) -> GeneratedContent:
    brand_data = gather_input_data(db, brand_id)

    template = PROMPT_TEMPLATES.get(content_type)
    if not template:
        raise ValueError(f"Unknown content type: {content_type}")

    system_prompt = template["system"]
    if language == "en":
        system_prompt += "\n\nIMPORTANT: Generate ALL content in English. The output title, body, tags, and all text must be in English."
    else:
        system_prompt += "\n\n重要：所有内容必须使用中文输出。标题、正文、标签等所有文本均为中文。"

    user_prompt = template["user"].format(
        brand_name=brand_data["brand_name"],
        website=brand_data["website"],
        description=brand_data["description"],
        core_products=brand_data["core_products"],
        target_audience=brand_data["target_audience"],
        industry=brand_data["industry"],
        weak_keywords=brand_data["weak_keywords"],
        competitor_gaps=brand_data["competitor_gaps"],
        custom_instructions=custom_instructions or "无",
    )

    user_prompt += f"\n\n正文要求：不少于 {target_word_count} 字，确保内容充实完整。"

    def _call_llm() -> str:
        return generate_text(system_prompt, user_prompt, engine=engine)

    try:
        result = _call_llm()
    except Exception:
        logger.warning("Engine %s failed, falling back to mimo", engine)
        try:
            result = generate_text(system_prompt, user_prompt, engine="mimo")
        except Exception as e:
            raise ValueError(f"LLM generation failed (all engines): {e}")

    parsed = _parse_llm_output(result, retry_fn=_call_llm)

    body = parsed.get("body", result) or "生成内容为空"
    plain_text = re.sub(r"<[^>]+>", "", body)
    word_count = len(plain_text)

    quality_result = check_quality(
        db=db,
        brand_id=brand_id,
        content_type=content_type,
        title=parsed.get("title", ""),
        body=body,
        target_word_count=target_word_count,
    )
    quality_score = quality_result.score

    if content_id is not None:
        content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
        if not content:
            raise ValueError(f"Content {content_id} not found")
        content.title = parsed.get("title", "")
        content.body = body
        content.tags = parsed.get("tags")
        content.platform_format = "html"
        content.distribution_guide = parsed.get("distribution_guide")
        content.status = "draft"
        content.source_analysis_run_id = brand_data["analysis_run_id"]
        content.source_weak_keywords = brand_data["weak_keywords_list"][:5] if brand_data["weak_keywords_list"] else None
        content.quality_score = quality_score
        content.word_count = word_count
        content.engine = engine
        content.target_word_count = target_word_count
        content.updated_at = datetime.now(timezone.utc)
    else:
        content = GeneratedContent(
            user_id=user_id,
            brand_id=brand_id,
            content_type=content_type,
            title=parsed.get("title", ""),
            body=body,
            tags=parsed.get("tags"),
            platform_format="html",
            distribution_guide=parsed.get("distribution_guide"),
            status="draft",
            source_analysis_run_id=brand_data["analysis_run_id"],
            source_weak_keywords=brand_data["weak_keywords_list"][:5] if brand_data["weak_keywords_list"] else None,
            source_competitor_gaps=None,
            quality_score=quality_score,
            word_count=word_count,
            engine=engine,
            target_word_count=target_word_count,
        )
        db.add(content)

    db.commit()
    db.refresh(content)

    logger.info("Content generated: engine=%s, brand_id=%d, word_count=%d", engine, brand_id, word_count)

    return content


def _parse_llm_output(text: str, retry_fn=None, max_retries: int = 2) -> dict:
    """从 LLM 输出中提取 JSON 对象。支持多种格式：纯 JSON、markdown 代码块包裹、自然语言+JSON。"""
    for attempt in range(max_retries + 1):
        try:
            # 优先尝试从 markdown 代码块中提取
            code_block_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
            if code_block_match:
                return json.loads(code_block_match.group(1).strip())

            # 使用 json.JSONDecoder.raw_decode 从第一个 '{' 开始解析
            # 这比贪婪正则更准确，能正确处理多个 JSON 对象的情况
            start_idx = text.find('{')
            if start_idx != -1:
                decoder = json.JSONDecoder()
                try:
                    obj, _ = decoder.raw_decode(text[start_idx:])
                    return obj
                except json.JSONDecodeError:
                    pass

            # 兜底：尝试直接解析整个文本
            return json.loads(text.strip())
        except (json.JSONDecodeError, AttributeError, ValueError):
            if attempt < max_retries and retry_fn:
                logger.warning("JSON parse failed (attempt %d), retrying LLM call", attempt + 1)
                try:
                    text = retry_fn()
                except Exception:
                    break
            else:
                break

    logger.error("Failed to parse LLM output after %d attempts, using fallback", max_retries + 1)
    return {
        "title": "",
        "body": text or "生成内容为空",
        "tags": [],
        "distribution_guide": None,
    }


def regenerate_section(
    db: Session,
    content_id: int,
    section_text: str | None,
    modification_instructions: str,
) -> GeneratedContent:
    """同步版本的重新生成（保留兼容性，内部调用使用）。"""
    content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
    if not content:
        raise ValueError("Content not found")

    engine = content.engine or "mimo"

    if section_text:
        prompt = f"""请根据以下修改指令重新生成指定段落。

原始段落：
{section_text}

修改指令：{modification_instructions}

品牌：请保持品牌信息准确。"""
    else:
        prompt = f"""请根据以下修改指令重新生成整篇内容。

原始内容：
{content.body[:500]}

修改指令：{modification_instructions}"""

    try:
        result = generate_text("你是一位专业的内容编辑。", prompt, engine=engine)
    except Exception:
        logger.warning("Regenerate engine %s failed, falling back to mimo", engine)
        result = generate_text("你是一位专业的内容编辑。", prompt, engine="mimo")

    if section_text and section_text in content.body:
        content.body = content.body.replace(section_text, result)
    else:
        content.body = result

    plain_text = re.sub(r"<[^>]+>", "", content.body)
    content.word_count = len(plain_text)

    quality_result = check_quality(
        db=db,
        brand_id=content.brand_id,
        content_type=content.content_type,
        title=content.title,
        body=content.body,
        target_word_count=content.target_word_count or 1000,
    )
    content.quality_score = quality_result.score

    content.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(content)
    return content


def run_regeneration(
    content_id: int,
    section_text: str | None,
    modification_instructions: str,
):
    """后台线程执行重新生成任务。"""
    db = SessionLocal()
    try:
        content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
        if not content:
            task_store.update_task(content_id, "failed", error="Content not found")
            return

        content.status = "generating"
        content.updated_at = datetime.now(timezone.utc)
        db.commit()

        regenerate_section(
            db=db,
            content_id=content_id,
            section_text=section_text,
            modification_instructions=modification_instructions,
        )

        content.status = "draft"
        content.updated_at = datetime.now(timezone.utc)
        db.commit()

        task_store.update_task(content_id, "completed")
        logger.info("Content %d regeneration completed", content_id)
    except Exception as e:
        logger.error("Content %d regeneration failed: %s", content_id, e)
        task_store.update_task(content_id, "failed", error=str(e))
        try:
            content = db.query(GeneratedContent).filter(GeneratedContent.id == content_id).first()
            if content:
                content.status = "failed"
                content.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
