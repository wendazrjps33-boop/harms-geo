import threading
from datetime import datetime, timezone

_tasks: dict[int, dict] = {}
_lock = threading.Lock()


def register_task(content_id: int, status: str = "generating") -> None:
    with _lock:
        _tasks[content_id] = {
            "content_id": content_id,
            "status": status,
            "started_at": datetime.now(timezone.utc),
            "error": None,
        }


def update_task(content_id: int, status: str, error: str | None = None) -> None:
    with _lock:
        if content_id in _tasks:
            _tasks[content_id]["status"] = status
            _tasks[content_id]["error"] = error
            _tasks[content_id]["updated_at"] = datetime.now(timezone.utc)


def get_task(content_id: int) -> dict | None:
    with _lock:
        task = _tasks.get(content_id)
        return dict(task) if task else None


def remove_task(content_id: int) -> None:
    with _lock:
        _tasks.pop(content_id, None)
