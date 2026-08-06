"""白标 PDF 报告服务 — Agency 计划自定义品牌。"""

import io
import logging
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User
from app.models.subscription import UserSubscription

logger = logging.getLogger(__name__)

# Logo 存储路径
LOGO_DIR = os.path.join(settings.UPLOAD_DIR, "logos")
os.makedirs(LOGO_DIR, exist_ok=True)

# 允许的 Logo 格式
ALLOWED_LOGO_TYPES = {"image/png", "image/jpeg", "image/svg+xml"}
MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB


def save_logo(user_id: int, file_content: bytes, filename: str, content_type: str) -> dict:
    """保存用户 Logo 文件。"""
    # 验证文件类型
    if content_type not in ALLOWED_LOGO_TYPES:
        raise ValueError(f"Unsupported file type: {content_type}. Allowed: PNG, JPG, SVG")

    # 验证文件大小
    if len(file_content) > MAX_LOGO_SIZE:
        raise ValueError(f"File too large: {len(file_content)} bytes. Max: {MAX_LOGO_SIZE} bytes")

    # 生成文件名
    ext = filename.split(".")[-1] if "." in filename else "png"
    logo_filename = f"user_{user_id}_logo.{ext}"
    logo_path = os.path.join(LOGO_DIR, logo_filename)

    # 保存文件
    with open(logo_path, "wb") as f:
        f.write(file_content)

    logger.info("Logo saved for user %d: %s", user_id, logo_path)

    return {
        "path": logo_path,
        "filename": logo_filename,
        "url": f"/uploads/logos/{logo_filename}",
    }


def get_logo_path(user_id: int) -> str | None:
    """获取用户 Logo 路径。"""
    for ext in ["png", "jpg", "jpeg", "svg"]:
        path = os.path.join(LOGO_DIR, f"user_{user_id}_logo.{ext}")
        if os.path.exists(path):
            return path
    return None


def delete_logo(user_id: int) -> bool:
    """删除用户 Logo。"""
    logo_path = get_logo_path(user_id)
    if logo_path and os.path.exists(logo_path):
        os.remove(logo_path)
        logger.info("Logo deleted for user %d", user_id)
        return True
    return False


def generate_white_label_pdf(
    user_id: int,
    report_data: dict,
    db: Session,
) -> bytes:
    """生成白标 PDF 报告。"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
        from reportlab.lib.utils import ImageReader
        from reportlab.lib.colors import HexColor
    except ImportError:
        logger.error("reportlab not installed. Install with: pip install reportlab")
        raise ValueError("PDF generation not available")

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # 检查用户是否有自定义 Logo
    logo_path = get_logo_path(user_id)
    is_white_label = logo_path is not None

    # 页眉
    _draw_header(c, width, height, logo_path, is_white_label)

    # 内容
    _draw_content(c, width, height, report_data, is_white_label)

    # 页脚
    _draw_footer(c, width, height, is_white_label)

    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def _draw_header(c, width, height, logo_path, is_white_label):
    """绘制页眉。"""
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor

    # 背景色
    c.setFillColor(HexColor("#4c6ef5"))
    c.rect(0, height - 30 * mm, width, 30 * mm, fill=True, stroke=False)

    # Logo
    if logo_path and os.path.exists(logo_path):
        try:
            from reportlab.lib.utils import ImageReader
            logo = ImageReader(logo_path)
            # 在页眉中央绘制 Logo
            c.drawImage(logo, 20 * mm, height - 25 * mm, width=40 * mm, height=20 * mm, preserveAspectRatio=True)
        except Exception as e:
            logger.warning("Failed to draw logo: %s", e)
            _draw_default_brand(c, width, height, is_white_label)
    else:
        _draw_default_brand(c, width, height, is_white_label)

    # 报告标题
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(width - 20 * mm, height - 18 * mm, "Brand Visibility Report")


def _draw_default_brand(c, width, height, is_white_label):
    """绘制默认品牌（GeoRank 或自定义）。"""
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor

    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 20)

    if is_white_label:
        # 白标模式不显示 GeoRank
        c.drawString(20 * mm, height - 20 * mm, "Brand Report")
    else:
        c.drawString(20 * mm, height - 20 * mm, "GeoRank")


def _draw_content(c, width, height, report_data, is_white_label):
    """绘制报告内容。"""
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor

    y = height - 45 * mm

    # 品牌信息
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20 * mm, y, report_data.get("brand_name", "Brand"))
    y -= 10 * mm

    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    y -= 15 * mm

    # 可见度分数
    c.setFont("Helvetica-Bold", 12)
    c.drawString(20 * mm, y, "Visibility Score")
    y -= 8 * mm

    score = report_data.get("visibility_score", 0)
    c.setFont("Helvetica", 24)
    c.setFillColor(HexColor("#4c6ef5" if score >= 70 else "#fab005" if score >= 50 else "#fa5252"))
    c.drawString(25 * mm, y, f"{score:.1f}")
    y -= 15 * mm

    # 引擎详情
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(20 * mm, y, "Engine Details")
    y -= 10 * mm

    engines = report_data.get("engines", [])
    for engine in engines:
        if y < 50 * mm:
            c.showPage()
            y = height - 20 * mm

        c.setFont("Helvetica", 10)
        c.setFillColor(HexColor("#666666"))
        c.drawString(25 * mm, y, f"{engine.get('name', 'Unknown')}: {engine.get('score', 0):.1f}")
        y -= 6 * mm

    # 内容统计
    y -= 10 * mm
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(HexColor("#333333"))
    c.drawString(20 * mm, y, "Content Statistics")
    y -= 10 * mm

    stats = report_data.get("stats", {})
    for key, value in stats.items():
        if y < 50 * mm:
            c.showPage()
            y = height - 20 * mm

        c.setFont("Helvetica", 10)
        c.setFillColor(HexColor("#666666"))
        c.drawString(25 * mm, y, f"{key}: {value}")
        y -= 6 * mm


def _draw_footer(c, width, height, is_white_label):
    """绘制页脚。"""
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor

    # 分隔线
    c.setStrokeColor(HexColor("#e9ecef"))
    c.line(20 * mm, 25 * mm, width - 20 * mm, 25 * mm)

    # 页脚文字
    c.setFillColor(HexColor("#adb5bd"))
    c.setFont("Helvetica", 8)

    if is_white_label:
        c.drawString(20 * mm, 18 * mm, "Confidential Report")
    else:
        c.drawString(20 * mm, 18 * mm, "Generated by GeoRank - AI Visibility Monitor")

    c.drawRightString(width - 20 * mm, 18 * mm, f"Page {c.getPageNumber()}")


def check_agency_access(user_id: int, db: Session) -> bool:
    """检查用户是否有 Agency 计划访问权限。"""
    sub = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.plan_code == "agency",
            UserSubscription.status.in_(["active", "trialing"]),
        )
        .first()
    )
    return sub is not None
