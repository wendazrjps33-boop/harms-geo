"""账单历史 API — 查看订阅账单和下载发票。"""

import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])

# Stripe API Key 在 lifespan 中初始化
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.get("/history", response_model=dict)
def get_billing_history(
    user: User = Depends(get_current_user),
):
    """获取账单历史列表。"""
    if not user.stripe_customer_id:
        return {
            "success": True,
            "data": {"invoices": [], "total": 0},
            "error": None,
        }

    try:
        invoices = stripe.Invoice.list(
            customer=user.stripe_customer_id,
            limit=20,
            expand=["data.payment_intent"],
        )

        result = []
        for inv in invoices.data:
            result.append({
                "id": inv.id,
                "amount_paid": inv.amount_paid / 100,  # 转换为美元
                "currency": inv.currency.upper(),
                "status": inv.status,
                "description": inv.description or f"Subscription {inv.subscription}",
                "invoice_url": inv.hosted_invoice_url,
                "invoice_pdf": inv.invoice_pdf,
                "created": inv.created,
                "period_start": inv.period_start,
                "period_end": inv.period_end,
            })

        return {
            "success": True,
            "data": {"invoices": result, "total": len(result)},
            "error": None,
        }
    except stripe.StripeError as e:
        logger.error("Stripe API error: %s", e)
        raise HTTPException(status_code=502, detail="Failed to fetch billing history")


@router.get("/invoices/{invoice_id}", response_model=dict)
def get_invoice_detail(
    invoice_id: str,
    user: User = Depends(get_current_user),
):
    """获取单个发票详情。"""
    if not user.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No billing history")

    try:
        inv = stripe.Invoice.retrieve(invoice_id)

        # 验证发票属于当前用户
        if inv.customer != user.stripe_customer_id:
            raise HTTPException(status_code=404, detail="Invoice not found")

        return {
            "success": True,
            "data": {
                "id": inv.id,
                "amount_paid": inv.amount_paid / 100,
                "currency": inv.currency.upper(),
                "status": inv.status,
                "description": inv.description,
                "invoice_url": inv.hosted_invoice_url,
                "invoice_pdf": inv.invoice_pdf,
                "created": inv.created,
                "period_start": inv.period_start,
                "period_end": inv.period_end,
                "lines": [
                    {
                        "description": line.description,
                        "amount": line.amount / 100,
                        "quantity": line.quantity,
                    }
                    for line in inv.lines.data
                ],
            },
            "error": None,
        }
    except stripe.StripeError as e:
        logger.error("Stripe API error: %s", e)
        raise HTTPException(status_code=502, detail="Failed to fetch invoice")


@router.get("/invoices/{invoice_id}/download", response_model=dict)
def download_invoice(
    invoice_id: str,
    user: User = Depends(get_current_user),
):
    """获取发票 PDF 下载链接。"""
    if not user.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No billing history")

    try:
        inv = stripe.Invoice.retrieve(invoice_id)

        if inv.customer != user.stripe_customer_id:
            raise HTTPException(status_code=404, detail="Invoice not found")

        if not inv.invoice_pdf:
            raise HTTPException(status_code=404, detail="Invoice PDF not available")

        return {
            "success": True,
            "data": {
                "invoice_id": inv.id,
                "pdf_url": inv.invoice_pdf,
            },
            "error": None,
        }
    except stripe.StripeError as e:
        logger.error("Stripe API error: %s", e)
        raise HTTPException(status_code=502, detail="Failed to generate download link")
