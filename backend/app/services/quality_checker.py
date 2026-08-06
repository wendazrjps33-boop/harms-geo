import re
import logging
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.content import GeneratedContent, BrandProfile

logger = logging.getLogger(__name__)

PLATFORM_WORD_LIMITS = {
    "faq": {"min": 300, "max": 5000},
    "community_qa": {"min": 300, "max": 2000},
    "article": {"min": 800, "max": 5000},
    "press_release": {"min": 500, "max": 3000},
}


@dataclass
class QualityIssue:
    category: str
    severity: str
    message: str
    suggestion: str = ""


@dataclass
class QualityResult:
    score: int
    issues: list[QualityIssue] = field(default_factory=list)
    passed: bool = True


def check_quality(
    db: Session,
    brand_id: int,
    content_type: str,
    title: str,
    body: str,
    target_word_count: int = 1000,
) -> QualityResult:
    plain_text = re.sub(r"<[^>]+>", "", body)
    word_count = len(plain_text)
    issues: list[QualityIssue] = []
    score = 100

    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    brand_name = brand.name if brand else ""

    _check_factual_accuracy(db, brand_id, title, plain_text, issues)
    _check_duplicate_content(db, brand_id, title, issues)
    _check_platform_compliance(content_type, word_count, target_word_count, issues)
    _check_content_structure(body, content_type, issues)
    _check_brand_mention(brand_name, plain_text, issues)

    for issue in issues:
        if issue.severity == "error":
            score -= 25
        elif issue.severity == "warning":
            score -= 10
        else:
            score -= 5

    score = max(0, min(100, score))
    passed = score >= 50

    return QualityResult(score=score, issues=issues, passed=passed)


def _check_factual_accuracy(
    db: Session,
    brand_id: int,
    title: str,
    plain_text: str,
    issues: list[QualityIssue],
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        return

    profile = db.query(BrandProfile).filter(BrandProfile.brand_id == brand_id).first()

    if brand.name and brand.name.lower() not in plain_text.lower() and brand.name.lower() not in title.lower():
        issues.append(QualityIssue(
            category="factual_accuracy",
            severity="warning",
            message=f"品牌名「{brand.name}」未在内容中提及",
            suggestion="建议在正文中自然提及品牌名",
        ))

    if brand.website:
        if "http" in plain_text and brand.website not in plain_text:
            issues.append(QualityIssue(
                category="factual_accuracy",
                severity="info",
                message="内容中包含 URL 但非品牌官网",
                suggestion="确认引用的 URL 准确无误",
            ))

    if profile and profile.core_products:
        products = [p.strip() for p in profile.core_products.split(",") if p.strip()]
        mentioned = sum(1 for p in products if p.lower() in plain_text.lower())
        if products and mentioned == 0:
            issues.append(QualityIssue(
                category="factual_accuracy",
                severity="warning",
                message="核心产品未在内容中提及",
                suggestion=f"建议提及产品：{', '.join(products[:3])}",
            ))


def _check_duplicate_content(
    db: Session,
    brand_id: int,
    title: str,
    issues: list[QualityIssue],
):
    if not title or len(title) < 5:
        return

    existing = (
        db.query(GeneratedContent)
        .filter(
            GeneratedContent.brand_id == brand_id,
            GeneratedContent.status.in_(["draft", "ready", "published"]),
        )
        .order_by(GeneratedContent.id.desc())
        .limit(20)
        .all()
    )

    title_lower = title.lower().strip()
    for content in existing:
        if content.title and content.title.lower().strip() == title_lower:
            issues.append(QualityIssue(
                category="duplicate",
                severity="error",
                message=f"标题与已有内容重复：「{content.title}」",
                suggestion="请修改标题或删除重复内容",
            ))
            return

    for content in existing:
        if content.body and content.title:
            existing_plain = re.sub(r"<[^>]+>", "", content.body)
            if len(existing_plain) > 100:
                overlap = _calculate_overlap(title_lower, content.title.lower())
                if overlap > 0.8:
                    issues.append(QualityIssue(
                        category="duplicate",
                        severity="warning",
                        message=f"标题与「{content.title}」高度相似",
                        suggestion="建议调整标题以区分不同内容",
                    ))
                    return


def _calculate_overlap(text_a: str, text_b: str) -> float:
    if not text_a or not text_b:
        return 0.0
    chars_a = set(text_a)
    chars_b = set(text_b)
    if not chars_a or not chars_b:
        return 0.0
    intersection = chars_a & chars_b
    union = chars_a | chars_b
    return len(intersection) / len(union) if union else 0.0


def _check_platform_compliance(
    content_type: str,
    word_count: int,
    target_word_count: int,
    issues: list[QualityIssue],
):
    limits = PLATFORM_WORD_LIMITS.get(content_type)
    if not limits:
        return

    if word_count < limits["min"]:
        issues.append(QualityIssue(
            category="platform_compliance",
            severity="error",
            message=f"字数不足：{word_count} 字，{content_type} 最低要求 {limits['min']} 字",
            suggestion=f"建议补充至 {limits['min']} 字以上",
        ))
    elif word_count > limits["max"]:
        issues.append(QualityIssue(
            category="platform_compliance",
            severity="warning",
            message=f"字数超标：{word_count} 字，{content_type} 建议不超过 {limits['max']} 字",
            suggestion="过长内容可能影响平台发布效果",
        ))
    elif word_count < target_word_count * 0.8:
        issues.append(QualityIssue(
            category="platform_compliance",
            severity="warning",
            message=f"未达目标字数：{word_count}/{target_word_count}（{round(word_count/target_word_count*100)}%）",
            suggestion=f"目标 {target_word_count} 字，当前差距 {target_word_count - word_count} 字",
        ))


def _check_content_structure(body: str, content_type: str, issues: list[QualityIssue]):
    if not body or not body.startswith("<"):
        issues.append(QualityIssue(
            category="structure",
            severity="warning",
            message="内容非 HTML 格式",
            suggestion="建议使用 HTML 语义化标签",
        ))
        return

    has_headings = bool(re.search(r"<h[23][^>]*>", body))
    has_paragraphs = bool(re.search(r"<p[^>]*>", body))
    has_lists = bool(re.search(r"<(ul|ol)[^>]*>", body))

    if content_type in ("article", "press_release") and not has_headings:
        issues.append(QualityIssue(
            category="structure",
            severity="info",
            message="缺少小标题（H2/H3）",
            suggestion="长文建议使用小标题分段",
        ))

    if not has_paragraphs and not has_lists:
        issues.append(QualityIssue(
            category="structure",
            severity="info",
            message="缺少段落或列表结构",
            suggestion="建议使用 <p> 或 <ul>/<li> 组织内容",
        ))

    if content_type == "faq":
        has_qa_pattern = bool(re.search(r"(Q[：:？?]|问[：:])", body)) or bool(re.search(r"<(h[23]|strong)[^>]*>[^<]*(\?|？|哪|如何|什么|为什么)", body))
        if not has_qa_pattern:
            issues.append(QualityIssue(
                category="structure",
                severity="info",
                message="FAQ 内容缺少问答格式标识",
                suggestion="建议使用 Q:/问: 标记问题，或使用 <h3> 标题作为问题",
            ))

    if content_type == "press_release":
        has_contact = bool(re.search(r"(联系|contact|电话|邮箱|@)", body, re.IGNORECASE))
        if not has_contact:
            issues.append(QualityIssue(
                category="structure",
                severity="info",
                message="新闻稿缺少联系方式",
                suggestion="建议在末尾添加媒体联系方式",
            ))


def _check_brand_mention(brand_name: str, plain_text: str, issues: list[QualityIssue]):
    if not plain_text or not brand_name:
        return

    sentences = re.split(r"[。！？\.\!\?]", plain_text)
    total_sentences = len([s for s in sentences if s.strip()])

    brand_mentions = plain_text.lower().count(brand_name.lower())
    if total_sentences > 5 and brand_mentions == 0:
        issues.append(QualityIssue(
            category="brand_mention",
            severity="info",
            message=f"正文中未提及品牌名「{brand_name}」",
            suggestion="建议在内容中自然植入品牌信息",
        ))


def get_quality_summary(result: QualityResult) -> str:
    if not result.issues:
        return "内容质量良好，未发现问题"

    error_count = sum(1 for i in result.issues if i.severity == "error")
    warning_count = sum(1 for i in result.issues if i.severity == "warning")
    info_count = sum(1 for i in result.issues if i.severity == "info")

    parts = []
    if error_count:
        parts.append(f"{error_count} 个错误")
    if warning_count:
        parts.append(f"{warning_count} 个警告")
    if info_count:
        parts.append(f"{info_count} 个建议")

    return f"质量评分 {result.score}/100，发现 {', '.join(parts)}"
