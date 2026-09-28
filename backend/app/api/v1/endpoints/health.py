import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Check model artifacts
    artifacts = ["rainfall_rf_model.joblib", "temperature_rf_model.joblib", "wind_speed_rf_model.joblib"]
    models_ready = all(os.path.exists(os.path.join(settings.ML_ARTIFACTS_DIR, a)) for a in artifacts)

    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "database": db_status,
        "ai_models_loaded": models_ready,
        "mode": "demo_and_live_fallback",
        "supported_regions": ["Tamil Nadu", "Puducherry"]
    }
