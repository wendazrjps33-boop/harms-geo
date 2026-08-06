"""白标 PDF 报告 API — Agency 计划自定义品牌。"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.brand import Brand
from app.models.report import VisibilityReport
from app.services.white_label import (
    save_logo,
    get_logo_path,
    delete_logo,
    generate_white_label_pdf,
    check_agency_access,
    ALLOWED_LOGO_TYPES,
    MAX_LOGO_SIZE,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/white-label", tags=["white-label"])


@router.post("/logo", response_model=dict)
async def upload_logo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """上传自定义 Logo（仅 Agency 计划）。"""
    if not check_agency_access(user.id, db):
        raise HTTPException(status_code=403, detail="White label requires Agency plan")

    # 验证文件类型
    if file.content_type not in ALLOWED_LOGO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PNG, JPG, SVG",
        )

    # 读取文件内容
    content = await file.read()

    # 验证文件大小
    if len(content) > MAX_LOGO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {len(content)} bytes. Max: {MAX_LOGO_SIZE} bytes",
        )

    try:
        result = save_logo(user.id, content, file.filename, file.content_type)
        return {
            "success": True,
            "data": {
                "url": result["url"],
                "filename": result["filename"],
            },
            "error": None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/logo", response_model=dict)
def remove_logo(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除自定义 Logo。"""
    if not check_agency_access(user.id, db):
        raise HTTPException(status_code=403, detail="White label requires Agency plan")

    deleted = delete_logo(user.id)
    return {
        "success": True,
        "data": {"deleted": deleted},
        "error": None,
    }


@router.get("/logo", response_model=dict)
def get_logo(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前 Logo 信息。"""
    if not check_agency_access(user.id, db):
        raise HTTPException(status_code=403, detail="White label requires Agency plan")

    logo_path = get_logo_path(user.id)
    has_logo = logo_path is not None

    return {
        "success": True,
        "data": {
            "has_logo": has_logo,
            "url": f"/uploads/logos/user_{user.id}_logo.png" if has_logo else None,
        },
        "error": None,
    }


@router.get("/report/{brand_id}")
def generate_report(
    brand_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """生成白标 PDF 报告（仅 Agency 计划）。"""
    if not check_agency_access(user.id, db):
        raise HTTPException(status_code=403, detail="White label requires Agency plan")

    # 获取品牌信息
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.user_id == user.id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    # 获取最新可见度报告
    latest_report = (
        db.query(VisibilityReport)
        .filter(VisibilityReport.brand_id == brand_id)
        .order_by(VisibilityReport.id.desc())
        .first()
    )

    # 获取所有引擎的最新报告
    engines = []
    engine_reports = (
        db.query(VisibilityReport)
        .filter(VisibilityReport.brand_id == brand_id)
        .order_by(VisibilityReport.engine, VisibilityReport.id.desc())
        .all()
    )

    # 按引擎分组，取每个引擎的最新报告
    seen_engines = set()
    for report in engine_reports:
        if report.engine not in seen_engines:
            seen_engines.add(report.engine)
            engines.append({
                "name": report.engine,
                "score": float(report.visibility_score) if report.visibility_score else 0,
                "query": report.query,
            })

    # 准备报告数据
    report_data = {
        "brand_name": brand.name,
        "visibility_score": float(latest_report.visibility_score) if latest_report else 0,
        "engines": engines,
        "stats": {
            "Total Reports": len(engine_reports),
            "Engines Monitored": len(engines),
            "Last Check": latest_report.created_at.strftime("%Y-%m-%d %H:%M") if latest_report else "Never",
        },
    }

    try:
        pdf_bytes = generate_white_label_pdf(user.id, report_data, db)

        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=brand_report_{brand.name}_{datetime.now().strftime('%Y%m%d')}.pdf",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
