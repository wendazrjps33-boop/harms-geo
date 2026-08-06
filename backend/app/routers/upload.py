import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.dependencies import get_current_user
from app.models.user import User
from app.middleware.subscription_gate import require_feature
from app.services.storage import get_storage
from app.services.thumbnail import generate_thumbnail

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_SIZE = 10 * 1024 * 1024


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(require_feature("content_generation")),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "不支持的图片格式，仅支持 JPG/PNG/WebP")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "文件大小超过限制（最大 10MB）")

    raw_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    ext = raw_ext if raw_ext in ALLOWED_EXTENSIONS else "jpg"
    today = datetime.now().strftime("%Y/%m/%d")
    filename = f"{uuid.uuid4().hex}.{ext}"
    path = f"uploads/images/{today}/{filename}"

    storage = get_storage()
    url = storage.upload(content, path)

    thumbnail_url = None
    thumb_w, thumb_h = 0, 0
    try:
        thumb_bytes, thumb_w, thumb_h = generate_thumbnail(content)
        thumb_path = path.replace(f".{ext}", f"_thumb.{ext}")
        thumbnail_url = storage.upload(thumb_bytes, thumb_path)
    except Exception:
        logger.warning("Thumbnail generation failed for %s, continuing without thumbnail", filename)

    return {
        "success": True,
        "data": {
            "url": url,
            "thumbnail_url": thumbnail_url,
            "width": thumb_w,
            "height": thumb_h,
            "file_size": len(content),
            "filename": filename,
        },
        "error": None,
    }
