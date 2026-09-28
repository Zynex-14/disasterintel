from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import engine, Base, SessionLocal
from app.services.location_service import LocationService
from app.services.alert_service import AlertService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created
    Base.metadata.create_all(bind=engine)
    # Seed default locations and demo alerts if empty
    db = SessionLocal()
    try:
        LocationService.seed_default_locations(db)
        AlertService.seed_initial_demo_alerts(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "DisasterIntel: Hybrid AI-NWP Multi-Model Forecast Blending System for Disaster Early Warning. "
        "Integrates GFS, ECMWF, ICON, and IMD NWP models using Machine Learning blenders "
        "(Random Forest Regressor, Linear Regression) with physical constraints, "
        "explainable disaster risk assessment, and active alerting."
    ),
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers at both /api/v1 and /api
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "application": "DisasterIntel",
        "theme": "Disaster Management & Meteorological AI",
        "api_docs": f"{settings.API_V1_STR}/docs",
        "version": "1.0.0",
        "status": "operational",
        "supported_region": "Tamil Nadu & Puducherry"
    }
