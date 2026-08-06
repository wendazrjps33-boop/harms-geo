from abc import ABC, abstractmethod
from pathlib import Path
import logging

from app.config import settings

logger = logging.getLogger(__name__)

_storage_instance: "StorageBackend | None" = None


class StorageBackend(ABC):
    @abstractmethod
    def upload(self, file_bytes: bytes, path: str) -> str:
        ...


class LocalStorage(StorageBackend):
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)

    def upload(self, file_bytes: bytes, path: str) -> str:
        full_path = (self.base_dir / path).resolve()
        if not str(full_path).startswith(str(self.base_dir.resolve())):
            raise ValueError(f"Invalid path: {path}")
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(file_bytes)
        return f"/{path}"


class OSSStorage(StorageBackend):
    def __init__(self, endpoint: str, bucket: str, access_key: str, secret_key: str):
        import oss2

        auth = oss2.Auth(access_key, secret_key)
        self.bucket = oss2.Bucket(auth, endpoint, bucket)
        self.endpoint = endpoint
        self.bucket_name = bucket

    def upload(self, file_bytes: bytes, path: str) -> str:
        self.bucket.put_object(path, file_bytes)
        host = self.bucket.endpoint.split("//")[1]
        return f"https://{self.bucket_name}.{host}/{path}"


def get_storage() -> StorageBackend:
    global _storage_instance
    if _storage_instance is not None:
        return _storage_instance

    if settings.STORAGE_BACKEND == "oss" and settings.OSS_ENDPOINT:
        try:
            storage = OSSStorage(
                settings.OSS_ENDPOINT,
                settings.OSS_BUCKET,
                settings.OSS_ACCESS_KEY,
                settings.OSS_SECRET_KEY,
            )
            storage.bucket.get_bucket_info()
            _storage_instance = storage
            return storage
        except Exception:
            logger.warning("OSS configuration error, falling back to local storage")

    _storage_instance = LocalStorage(settings.UPLOAD_DIR)
    return _storage_instance
