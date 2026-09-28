from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Location
from app.schemas.weather import ForecastSeriesOut, ForecastPoint
from app.schemas.forecast import (
    MultiModelComparisonResponse,
    MultiModelComparisonPoint,
    BlendedForecastResponse
)
from app.services.location_service import LocationService
from app.services.weather_service import WeatherService
from app.ml.blender import ForecastBlender

router = APIRouter()
blender = ForecastBlender()

@router.get("", response_model=ForecastSeriesOut)
def get_forecast_series(
    location_id: int = Query(default=1, description="Location ID"),
    horizon: str = Query(default="72h", description="Forecast horizon: 24h, 72h, or 7d"),
    db: Session = Depends(get_db)
):
    """
    Get multi-hour forecast timeline for a location.
    """
    loc = LocationService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    sim = WeatherService.generate_simulated_weather_scenario(loc)
    hours_map = {"24h": 24, "72h": 72, "7d": 72} # 72 points available
    max_h = hours_map.get(horizon, 72)

    pts: List[ForecastPoint] = []
    for pt in sim["points"][:max_h]:
        ecmwf = pt["models"]["ECMWF"]
        pts.append(ForecastPoint(
            valid_at=pt["valid_at"],
            forecast_lead_hours=pt["forecast_lead_hours"],
            source="ECMWF High-Res NWP (Simulated)",
            temperature=ecmwf["temperature"],
            rainfall=ecmwf["rainfall"],
            humidity=ecmwf["humidity"],
            wind_speed=ecmwf["wind_speed"],
            pressure=ecmwf["pressure"],
            precipitation_prob=min(100.0, ecmwf["rainfall"] * 8.0),
            data_status="simulated_demo"
        ))

    return ForecastSeriesOut(
        location_id=loc.id,
        location_name=loc.name,
        state=loc.state,
        source="Multi-Model NWP Service",
        data_status="simulated_demo",
        forecast_horizon=horizon,
        generated_at=datetime.now(timezone.utc),
        points=pts
    )

@router.get("/models")
def get_model_forecasts(
    location_id: int = Query(default=1, description="Location ID"),
    db: Session = Depends(get_db)
):
    """
    Returns forecasts from individual Numerical Weather Prediction models (GFS, ECMWF, ICON, IMD_NWP).
    """
    loc = LocationService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    sim = WeatherService.generate_simulated_weather_scenario(loc)
    return {
        "location_id": loc.id,
        "location_name": loc.name,
        "models": ["GFS", "ECMWF", "ICON", "IMD_NWP"],
        "metadata": {
            "GFS": {"agency": "NOAA / NCEP", "resolution": "13 km", "type": "Global NWP"},
            "ECMWF": {"agency": "ECMWF IFS", "resolution": "9 km", "type": "Global High-Res NWP"},
            "ICON": {"agency": "Deutscher Wetterdienst (DWD)", "resolution": "13 km", "type": "Non-hydrostatic NWP"},
            "IMD_NWP": {"agency": "NCMRWF / IMD", "resolution": "4 km", "type": "Regional High-Res Unified Model"}
        },
        "points": sim["points"][:24],
        "data_status": "simulated_demo"
    }

@router.get("/blended", response_model=BlendedForecastResponse)
def get_blended_forecast(
    location_id: int = Query(default=1, description="Location ID"),
    variable: str = Query(default="rainfall", description="Variable: rainfall, temperature, wind_speed"),
    method: str = Query(default="random_forest", description="Method: random_forest, linear_regression, equal_weight"),
    db: Session = Depends(get_db)
):
    """
    Returns AI blended forecasts alongside baseline ensemble predictions.
    """
    loc = LocationService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    sim = WeatherService.generate_simulated_weather_scenario(loc)
    
    return blender.blend_multi_hour_series(
        variable=variable,
        location=loc,
        sim_data=sim,
        preferred_method=method
    )

from app.ml.explainability import BlendingExplainabilityEngine

@router.get("/explain")
def get_prediction_explainability(
    location_id: int = Query(default=1, description="Location ID"),
    variable: str = Query(default="rainfall", description="Variable: rainfall, temperature, wind_speed"),
    lead_hours: int = Query(default=24, ge=0, le=72),
    db: Session = Depends(get_db)
):
    """
    Returns SHAP-style transparent feature attribution and bias correction breakdown
    explaining why the AI model arrived at its specific blended prediction.
    """
    loc = LocationService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    sim = WeatherService.generate_simulated_weather_scenario(loc)
    pt = sim["points"][min(lead_hours, len(sim["points"]) - 1)]
    models_dict = {m: vals[variable] for m, vals in pt["models"].items()}

    blended_item = blender.blend_forecast(
        variable=variable,
        lead_hours=lead_hours,
        valid_at_dt=pt["valid_at"],
        lat=loc.latitude,
        lon=loc.longitude,
        elevation_m=loc.elevation_m or 10.0,
        model_values=models_dict
    )

    is_coastal = loc.longitude > 79.5 or loc.latitude < 8.5
    return BlendingExplainabilityEngine.explain_prediction(
        variable=variable,
        blended_value=blended_item.blended_value,
        baseline_value=blended_item.baseline_value,
        model_values=models_dict,
        lead_hours=lead_hours,
        elevation_m=loc.elevation_m or 10.0,
        is_coastal=is_coastal
    )

@router.get("/compare", response_model=MultiModelComparisonResponse)
def get_multi_model_comparison(
    location_id: int = Query(default=1, description="Location ID"),
    horizon: str = Query(default="48h", description="Forecast horizon: 24h, 48h, 72h"),
    db: Session = Depends(get_db)
):
    """
    Returns synchronized timeline comparing individual models, Equal-Weight baseline,
    AI Blended, and Actual observations (for historical lead times).
    """
    loc = LocationService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    sim = WeatherService.generate_simulated_weather_scenario(loc)
    max_h = 48 if horizon == "48h" else (24 if horizon == "24h" else 72)
    
    timeline: List[MultiModelComparisonPoint] = []
    for pt in sim["points"][:max_h]:
        v_dt = pt["valid_at"]
        lead = pt["forecast_lead_hours"]
        models = pt["models"]
        
        # Calculate equal weight
        eq_rain = sum(m["rainfall"] for m in models.values()) / len(models)
        eq_temp = sum(m["temperature"] for m in models.values()) / len(models)
        eq_wind = sum(m["wind_speed"] for m in models.values()) / len(models)
        eq_dict = {"rainfall": round(eq_rain, 1), "temperature": round(eq_temp, 1), "wind_speed": round(eq_wind, 1)}

        # AI Blended item for rainfall
        ai_rain_item = blender.blend_forecast(
            variable="rainfall",
            lead_hours=lead,
            valid_at_dt=v_dt,
            lat=loc.latitude,
            lon=loc.longitude,
            elevation_m=loc.elevation_m or 10.0,
            model_values={m: data["rainfall"] for m, data in models.items()}
        )
        ai_temp_item = blender.blend_forecast(
            variable="temperature",
            lead_hours=lead,
            valid_at_dt=v_dt,
            lat=loc.latitude,
            lon=loc.longitude,
            elevation_m=loc.elevation_m or 10.0,
            model_values={m: data["temperature"] for m, data in models.items()}
        )
        ai_wind_item = blender.blend_forecast(
            variable="wind_speed",
            lead_hours=lead,
            valid_at_dt=v_dt,
            lat=loc.latitude,
            lon=loc.longitude,
            elevation_m=loc.elevation_m or 10.0,
            model_values={m: data["wind_speed"] for m, data in models.items()}
        )

        ai_dict = {
            "rainfall": ai_rain_item.blended_value,
            "temperature": ai_temp_item.blended_value,
            "wind_speed": ai_wind_item.blended_value
        }

        unc_lower = {
            "rainfall": ai_rain_item.uncertainty_lower or 0.0,
            "temperature": ai_temp_item.uncertainty_lower or 0.0,
            "wind_speed": ai_wind_item.uncertainty_lower or 0.0
        }
        unc_upper = {
            "rainfall": ai_rain_item.uncertainty_upper or 0.0,
            "temperature": ai_temp_item.uncertainty_upper or 0.0,
            "wind_speed": ai_wind_item.uncertainty_upper or 0.0
        }
        ens_spread = {
            "rainfall": ai_rain_item.ensemble_spread or 0.0,
            "temperature": ai_temp_item.ensemble_spread or 0.0,
            "wind_speed": ai_wind_item.ensemble_spread or 0.0
        }

        timeline.append(MultiModelComparisonPoint(
            valid_at=v_dt,
            forecast_lead_hours=lead,
            models=models,
            equal_weight=eq_dict,
            ai_blended=ai_dict,
            actual_observation=pt.get("observation"),
            uncertainty_lower=unc_lower,
            uncertainty_upper=unc_upper,
            ensemble_spread=ens_spread
        ))

    summary = {
        "total_timesteps": len(timeline),
        "models_evaluated": ["GFS", "ECMWF", "ICON", "IMD_NWP"],
        "blending_engine": "RandomForestRegressor + BiasCorrection (v1.2.0)",
        "ground_truth_available_hours": 24,
        "demonstration_scenario": "Northeast Monsoon Coastal Depression Passage"
    }

    return MultiModelComparisonResponse(
        location_id=loc.id,
        location_name=loc.name,
        forecast_horizon=horizon,
        available_models=["GFS", "ECMWF", "ICON", "IMD_NWP"],
        timeline=timeline,
        comparison_summary=summary
    )
