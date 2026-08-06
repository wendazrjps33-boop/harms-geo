import secrets
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

CSRF_HEADER = "X-CSRF-Token"
CSRF_COOKIE = "csrf_token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in SAFE_METHODS:
            response = await call_next(request)
            return response

        if request.url.path.startswith("/api/subscription/webhook"):
            return await call_next(request)

        if request.url.path.startswith("/api/public"):
            return await call_next(request)

        csrf_token = request.headers.get(CSRF_HEADER)
        if not csrf_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing",
            )

        cookie_token = request.cookies.get(CSRF_COOKIE)
        if not cookie_token or csrf_token != cookie_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token invalid",
            )

        response = await call_next(request)
        return response


def generate_csrf_token() -> str:
    return secrets.token_hex(32)
