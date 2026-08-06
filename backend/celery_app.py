"""
Celery 应用配置

使用 Redis 作为 broker 和 result backend。
"""

from celery import Celery
from celery.schedules import crontab

from app.config import settings

# 创建 Celery 应用
celery_app = Celery(
    "georank",
    broker=f"{settings.REDIS_URL}/1",
    backend=f"{settings.REDIS_URL}/2",
)

# 配置
celery_app.conf.update(
    # 序列化
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # 时区
    timezone="UTC",
    enable_utc=True,

    # 任务追踪
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # 结果过期时间（24 小时）
    result_expires=86400,

    # 任务超时（5 分钟）
    task_soft_time_limit=300,
    task_time_limit=600,

    # 重试策略
    task_default_retry_delay=60,
    task_max_retries=3,
)

# 定时任务调度
celery_app.conf.beat_schedule = {
    # 每小时同步用量数据到数据库
    "sync-usage-to-db": {
        "task": "celery_tasks.usage_tasks.sync_usage_to_db",
        "schedule": 3600.0,  # 1 hour
    },
    # 每 6 小时检查用量警告
    "check-usage-warnings": {
        "task": "celery_tasks.usage_tasks.check_usage_warnings",
        "schedule": 21600.0,  # 6 hours
    },
    # 每天检查采纳效果
    "check-adoption": {
        "task": "celery_tasks.adoption_tasks.check_adoption",
        "schedule": crontab(hour=2, minute=0),  # 每天凌晨 2 点
    },
    # 每天过期 Add-on
    "expire-addons": {
        "task": "celery_tasks.addon_tasks.expire_addons",
        "schedule": crontab(hour=0, minute=5),  # 每天凌晨 00:05
    },
}

# 自动发现任务模块
celery_app.autodiscover_tasks(["celery_tasks"])
