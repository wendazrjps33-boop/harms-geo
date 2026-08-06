from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sqlalchemy import text

from app.database import engine, Base, SessionLocal
from app.routers import auth, brands, reports, analysis, competitor_analysis, subscription, usage, content, crawler, upload, team, billing_history, api_keys, white_label
from app.middleware.csrf import CSRFMiddleware, generate_csrf_token
import app.models  # Import all models to register them with SQLAlchemy


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Could not create all tables: {e}")
        print("Please run create_tables.sql manually to create the new tables.")
    try:
        with SessionLocal() as db:
            db.execute(text("UPDATE generated_contents SET status = 'failed' WHERE status = 'generating'"))
            db.commit()
    except Exception:
        pass
    # Scheduled tasks are handled by Celery beat (see celery_app.py)
    yield


app = FastAPI(title="GeoRank API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(CSRFMiddleware)

app.include_router(auth.router)
app.include_router(brands.router)
app.include_router(reports.router)
app.include_router(analysis.router)
app.include_router(competitor_analysis.router)
app.include_router(subscription.router)
app.include_router(usage.router)
app.include_router(content.router)
app.include_router(crawler.router)
app.include_router(upload.router)
app.include_router(team.router)
app.include_router(billing_history.router)
app.include_router(api_keys.router)
app.include_router(white_label.router)


@app.get("/")
def root():
    return {"message": "GeoRank API"}


@app.get("/api/public/health")
def health():
    return {"status": "ok"}


@app.get("/api/public/csrf-token")
def get_csrf_token():
    token = generate_csrf_token()
    response = JSONResponse({"csrf_token": token})
    response.set_cookie(
        key="csrf_token",
        value=token,
        httponly=True,
        samesite="strict",
        max_age=3600,
    )
    return response
