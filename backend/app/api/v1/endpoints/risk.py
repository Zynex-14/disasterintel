from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.risk import DisasterRiskAssessmentOut
from app.services.location_service import LocationService
from app.services.weather_service import WeatherService
from app.services.risk_engine import DisasterRiskEngine
from app.services.alert_service import AlertService

router = APIRouter()

@router.get("", response_model=DisasterRiskAssessmentOut)
def get_risk_assessment(
    location_id: int = Query(default=1, description="Location ID"),
    db: Session = Depends(get_db)
):
    """
    Evaluates multi-hazard disaster risks (Heavy rainfall, Flood conditions, High wind, Extreme temperature)
    for the specified location and automatically records new alerts if critical thresholds are breached.
    """
    loc = LocationService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    sim = WeatherService.generate_simulated_weather_scenario(loc)
    
    # Flatten ecmwf points for risk evaluation
    flattened_points = []
    for pt in sim["points"]:
        ecmwf = pt["models"]["ECMWF"]
        flattened_points.append({
            "rainfall": ecmwf["rainfall"],
            "temperature": ecmwf["temperature"],
            "wind_speed": ecmwf["wind_speed"],
            "pressure": ecmwf["pressure"]
        })

    assessment = DisasterRiskEngine.evaluate_hazards(
        location=loc,
        forecast_points=flattened_points,
        data_status="simulated_demo",
        data_source="Hybrid AI-NWP Multi-Model Blended Engine"
    )

    # Automatically process alerts
    AlertService.process_and_persist_alerts(db, assessment)

    return assessment
