"""邮件通知服务 — 用量警告、支付失败、订阅变更。"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone

from app.config import settings

logger = logging.getLogger(__name__)

# 邮件配置（通过环境变量设置）
SMTP_HOST = getattr(settings, "SMTP_HOST", "")
SMTP_PORT = getattr(settings, "SMTP_PORT", 587)
SMTP_USER = getattr(settings, "SMTP_USER", "")
SMTP_PASSWORD = getattr(settings, "SMTP_PASSWORD", "")
SMTP_FROM = getattr(settings, "SMTP_FROM", "noreply@georank.com")
SMTP_USE_TLS = getattr(settings, "SMTP_USE_TLS", True)


# ──────────────────── 邮件模板 ────────────────────


TEMPLATES = {
    "usage_warning": {
        "subject": "GeoRank: Usage Alert - {dimension} at {percentage}%",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #4c6ef5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }}
        .footer {{ background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }}
        .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 15px 0; }}
        .btn {{ display: inline-block; background: #4c6ef5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Usage Alert</h1>
        </div>
        <div class="content">
            <p>Hi {user_name},</p>
            <div class="warning">
                <strong>Your {dimension} usage has reached {percentage}%</strong>
                <p>Current: {current} / {limit}</p>
            </div>
            <p>To continue using this feature without interruption, consider upgrading your plan.</p>
            <p><a href="{upgrade_url}" class="btn">Upgrade Plan</a></p>
        </div>
        <div class="footer">
            <p>GeoRank - AI Visibility Monitor</p>
            <p><a href="{unsubscribe_url}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>
""",
    },
    "payment_failed": {
        "subject": "GeoRank: Payment Failed for Your Subscription",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #fa5252; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }}
        .footer {{ background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }}
        .error {{ background: #fff5f5; border: 1px solid #fa5252; padding: 15px; border-radius: 4px; margin: 15px 0; }}
        .btn {{ display: inline-block; background: #4c6ef5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Payment Failed</h1>
        </div>
        <div class="content">
            <p>Hi {user_name},</p>
            <div class="error">
                <strong>Your payment of {amount} for the {plan_name} plan has failed.</strong>
                <p>Please update your payment method to avoid service interruption.</p>
            </div>
            <p><a href="{billing_url}" class="btn">Update Payment Method</a></p>
        </div>
        <div class="footer">
            <p>GeoRank - AI Visibility Monitor</p>
            <p><a href="{unsubscribe_url}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>
""",
    },
    "subscription_changed": {
        "subject": "GeoRank: Subscription {action}",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #40c057; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }}
        .footer {{ background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }}
        .success {{ background: #ebfbee; border: 1px solid #40c057; padding: 15px; border-radius: 4px; margin: 15px 0; }}
        .btn {{ display: inline-block; background: #4c6ef5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Subscription {action}</h1>
        </div>
        <div class="content">
            <p>Hi {user_name},</p>
            <div class="success">
                <strong>Your subscription has been {action}.</strong>
                <p>Plan: {plan_name}</p>
                <p>Effective: {effective_date}</p>
            </div>
            <p><a href="{dashboard_url}" class="btn">Go to Dashboard</a></p>
        </div>
        <div class="footer">
            <p>GeoRank - AI Visibility Monitor</p>
            <p><a href="{unsubscribe_url}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>
""",
    },
}


# ──────────────────── 发送函数 ────────────────────


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """发送邮件（内部函数）。"""
    if not SMTP_HOST or not SMTP_USER:
        logger.warning("SMTP not configured, skipping email to %s", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        # 添加纯文本版本
        import re
        text_body = re.sub(r"<[^>]+>", "", html_body)
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("Email sent to %s: %s", to_email, subject[:50])
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False


def send_usage_warning(
    user_email: str,
    user_name: str,
    dimension: str,
    current: int,
    limit: int,
    percentage: int,
    upgrade_url: str = "https://georank.com/subscription",
) -> bool:
    """发送用量警告邮件。"""
    template = TEMPLATES["usage_warning"]
    subject = template["subject"].format(dimension=dimension, percentage=percentage)
    html = template["html"].format(
        user_name=user_name,
        dimension=dimension,
        percentage=percentage,
        current=current,
        limit=limit,
        upgrade_url=upgrade_url,
        unsubscribe_url=f"{upgrade_url}?unsubscribe=true",
    )
    return _send_email(user_email, subject, html)


def send_payment_failed(
    user_email: str,
    user_name: str,
    amount: float,
    plan_name: str,
    billing_url: str = "https://georank.com/billing",
) -> bool:
    """发送支付失败通知。"""
    template = TEMPLATES["payment_failed"]
    subject = template["subject"]
    html = template["html"].format(
        user_name=user_name,
        amount=f"${amount:.2f}",
        plan_name=plan_name,
        billing_url=billing_url,
        unsubscribe_url=f"{billing_url}?unsubscribe=true",
    )
    return _send_email(user_email, subject, html)


def send_subscription_changed(
    user_email: str,
    user_name: str,
    action: str,
    plan_name: str,
    effective_date: str,
    dashboard_url: str = "https://georank.com/dashboard",
) -> bool:
    """发送订阅变更通知。"""
    template = TEMPLATES["subscription_changed"]
    subject = template["subject"].format(action=action.capitalize())
    html = template["html"].format(
        user_name=user_name,
        action=action,
        plan_name=plan_name,
        effective_date=effective_date,
        dashboard_url=dashboard_url,
        unsubscribe_url=f"{dashboard_url}?unsubscribe=true",
    )
    return _send_email(user_email, subject, html)


# ──────────────────── 用量检查定时任务 ────────────────────


def check_and_notify_usage(db_session_factory) -> None:
    """检查用量并发送警告邮件（定时任务调用）。"""
    from app.models.user import User
    from app.models.subscription import UserSubscription
    from app.services.usage_tracker import get_current_usage

    db = db_session_factory()
    try:
        # 获取所有活跃订阅的用户
        active_subs = (
            db.query(UserSubscription)
            .filter(UserSubscription.status.in_(["active", "trialing"]))
            .all()
        )

        for sub in active_subs:
            user = db.query(User).filter(User.id == sub.user_id).first()
            if not user or not user.email:
                continue

            usage = get_current_usage(db, user.id)
            if not usage or "dimensions" not in usage:
                continue

            for dim_name, dim_data in usage["dimensions"].items():
                if dim_data.get("limit", -1) <= 0:
                    continue

                used = dim_data.get("used", 0)
                limit = dim_data["limit"]
                percentage = int((used / limit) * 100)

                if percentage >= 100:
                    send_usage_warning(
                        user_email=user.email,
                        user_name=user.name or user.email,
                        dimension=dim_name,
                        current=used,
                        limit=limit,
                        percentage=percentage,
                    )
                elif percentage >= 80:
                    send_usage_warning(
                        user_email=user.email,
                        user_name=user.name or user.email,
                        dimension=dim_name,
                        current=used,
                        limit=limit,
                        percentage=percentage,
                    )
    finally:
        db.close()
