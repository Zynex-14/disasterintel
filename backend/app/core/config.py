from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Dict, Any
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "DisasterIntel — Hybrid AI-NWP Multi-Model Forecast Blending System"
    API_V1_STR: str = "/api/v1"
    DEMO_MODE: bool = False  # Set to True to force simulated demo mode, or auto-falls back if network fails
    DATABASE_URL: str = "sqlite:///./disasterintel.db"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]
    
    # ML Model Artifacts directory
    ML_ARTIFACTS_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "artifacts"
    )
    
    # Thresholds for Disaster Risk Assessment (Configurable IMD/WMO aligned)
    RISK_THRESHOLDS: Dict[str, Dict[str, float]] = {
        "rainfall_24h": {
            "low": 15.6,        # Light-Moderate boundary
            "moderate": 64.5,   # IMD Heavy Rainfall threshold
            "high": 115.5,      # IMD Very Heavy Rainfall
            "very_high": 204.4  # IMD Extremely Heavy Rainfall
        },
        "wind_speed_kmh": {
            "low": 30.0,
            "moderate": 45.0,   # Strong breeze / gusty
            "high": 62.0,       # Gale force / Cyclonic storm warning
            "very_high": 89.0   # Severe Cyclonic Storm
        },
        "temperature_celsius": {
            "heat_moderate": 38.0,
            "heat_high": 41.0,      # Heatwave criteria (coastal >37 / plains >40)
            "heat_very_high": 44.0, # Severe Heatwave
            "cold_moderate": 14.0,
            "cold_high": 10.0,
            "cold_very_high": 6.0
        },
        "flood_index": {
            "low": 0.25,
            "moderate": 0.50,
            "high": 0.75,
            "very_high": 0.90
        }
    }

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="allow")

settings = Settings()
