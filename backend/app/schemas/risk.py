from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class HazardRisk(BaseModel):
    hazard_type: str        # heavy_rainfall, flood_condition, high_wind, extreme_heat
    hazard_title: str       # e.g., "Heavy Rainfall Risk"
    risk_level: str         # low, moderate, high, very_high
    severity_color: str     # green (#10B981), yellow (#F59E0B), orange (#F97316), red (#EF4444)
    forecast_value: float
    trigger_threshold: float
    unit: str
    forecast_period: str
    explanation: str
    contributing_factors: List[str]
    is_simulated: bool
    data_source: str
    timestamp: datetime

class DisasterRiskAssessmentOut(BaseModel):
    location_id: int
    location_name: str
    state: str
    overall_risk_level: str
    assessment_timestamp: datetime
    hazards: List[HazardRisk]
    future_flood_factors_note: str = (
        "Note: Flood index combines 24h & 72h blended precipitation and soil saturation proxy. "
        "Configured for future integration with CWC river gauges and drainage networks. "
        "Prototype risk indicators are experimental research aids, not official government warnings."
    )
