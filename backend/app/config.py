import warnings

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 安全警告：所有敏感配置必须通过环境变量或 .env 文件注入
    # 禁止在此处硬编码真实凭证

    DATABASE_URL: str = ""  # 必须通过环境变量设置
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: str = ""  # 必须通过环境变量设置
    SECRET_KEY: str = ""  # 必须通过环境变量设置，用于 JWT 签名
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # AI 引擎 API Keys（必须通过环境变量设置）
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    QIANWEN_API_KEY: str = ""
    MIMO_API_KEY: str = ""
    MIMO_BASE_URL: str = "https://token-plan-cn.xiaomimimo.com/v1"
    MIMO_MODEL: str = "mimo-v2.5-pro"

    # Stripe 支付配置（必须通过环境变量设置）
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    # 对象存储配置
    STORAGE_BACKEND: str = "local"  # local 或 oss
    OSS_ENDPOINT: str = ""
    OSS_BUCKET: str = ""
    OSS_ACCESS_KEY: str = ""
    OSS_SECRET_KEY: str = ""
    UPLOAD_DIR: str = "uploads/images"

    # 邮件配置（可选）
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@georank.com"
    SMTP_USE_TLS: bool = True

    # SERP API 配置（可选，用于搜索引擎收录检测）
    SERP_API_KEY: str = ""
    SERP_API_PROVIDER: str = "serpapi"  # serpapi | valueserp

    # 前端 URL（用于支付跳转等）
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# 启动时检查必要配置
_missing_vars = []
if not settings.DATABASE_URL:
    _missing_vars.append("DATABASE_URL")
if not settings.SECRET_KEY:
    _missing_vars.append("SECRET_KEY")

if _missing_vars:
    warnings.warn(
        f"Missing required environment variables: {', '.join(_missing_vars)}. "
        "Please set them in .env file or environment.",
        stacklevel=2,
    )
