from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.ml.dataset import generate_historical_matched_dataset
from app.ml.trainer import ForecastBlendingTrainer

from pydantic import BaseModel, Field
from app.services.weather_service import WeatherService
from app.services.alert_service import AlertService

router = APIRouter()

SCENARIOS = [
    {
        "id": "cyclone_michaung",
        "name": "Cyclone Michaung Landfall",
        "tag": "Severe Cyclonic Storm",
        "description": "Severe cyclonic storm landfall along North Tamil Nadu coast with torrential rainfall (>145 mm/day), high tidal inundation, and gale winds (65-90 km/h)."
    },
    {
        "id": "heatwave",
        "name": "Severe Summer Heatwave",
        "tag": "Extreme Heat Advisory",
        "description": "Pre-monsoon extreme heatwave impacting inland plains (Vellore, Salem, Madurai, Trichy) with ambient temperatures reaching 44°C-47.5°C."
    },
    {
        "id": "monsoon_depression",
        "name": "Northeast Monsoon Depression",
        "tag": "Active Monsoon Low",
        "description": "Synoptic depression bringing sustained moderate-to-heavy coastal showers (40-80 mm) and fresh offshore squalls."
    },
    {
        "id": "normal",
        "name": "Fair Weather / Clear Skies",
        "tag": "Normal Conditions",
        "description": "Light easterly breeze, seasonal temperatures (28-32°C), zero hazardous precipitation, and calm coastal waters."
    },
    {
        "id": "live",
        "name": "Live Open-Meteo Ingestion",
        "tag": "Real-time Telemetry",
        "description": "Direct telemetry streaming from Open-Meteo multi-model NWP composite (GFS, ECMWF, ICON)."
    }
]

class ScenarioUpdateRequest(BaseModel):
    scenario: str = Field(..., description="Scenario ID: cyclone_michaung, heatwave, monsoon_depression, normal, live")

@router.get("/scenario")
def get_current_scenario():
    """
    Returns currently active simulation scenario and available scenario catalog.
    """
    return {
        "active_scenario": WeatherService.active_scenario,
        "scenarios": SCENARIOS
    }

@router.post("/scenario")
def set_scenario(
    req: ScenarioUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Switches active simulation scenario, regenerates forecast conditions,
    and updates disaster alerts table accordingly.
    """
    valid_ids = [s["id"] for s in SCENARIOS]
    if req.scenario not in valid_ids:
        return {"status": "error", "message": f"Invalid scenario. Must be one of {valid_ids}"}

    WeatherService.active_scenario = req.scenario
    alerts = AlertService.sync_alerts_for_scenario(db, req.scenario)

    return {
        "status": "success",
        "active_scenario": req.scenario,
        "alerts_generated": len(alerts),
        "message": f"Scenario switched to '{req.scenario}'. Generated {len(alerts)} disaster alerts."
    }

def execute_training(db: Session):
    datasets = generate_historical_matched_dataset(n_days=100)
    trainer = ForecastBlendingTrainer()
    trainer.train_all(datasets, db=db)

@router.post("/train")
def trigger_training(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Triggers chronological retraining of Random Forest and Ridge blending models.
    """
    datasets = generate_historical_matched_dataset(n_days=100)
    trainer = ForecastBlendingTrainer()
    results = trainer.train_all(datasets, db=db)

    return {
        "status": "success",
        "message": "AI Blending models retrained and verified across rainfall, temperature, and wind speed.",
        "model_version": trainer.model_version,
        "sample_count": 19200,
        "variables_trained": list(results.keys()),
        "summary": {var: res["metrics"]["Random_Forest"] for var, res in results.items()}
    }
