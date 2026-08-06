from io import BytesIO

from PIL import Image


def generate_thumbnail(file_bytes: bytes, width: int = 300) -> tuple[bytes, int, int]:
    img = Image.open(BytesIO(file_bytes))
    orig_width, orig_height = img.size
    ratio = width / orig_width
    height = int(orig_height * ratio)
    img = img.resize((width, height), Image.Resampling.LANCZOS)
    buf = BytesIO()
    fmt = img.format or "JPEG"
    img.save(buf, format=fmt, quality=85)
    return buf.getvalue(), width, height
