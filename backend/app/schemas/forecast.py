from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ModelPrediction(BaseModel):
    source: str
    temperature: float
    rainfall: float
    humidity: float
    wind_speed: float
    pressure: float

    model_config = ConfigDict(from_attributes=True)

class MultiModelComparisonPoint(BaseModel):
    valid_at: datetime
    forecast_lead_hours: int
    models: Dict[str, Dict[str, float]] # e.g. {"GFS": {"temperature": 32.1, "rainfall": 12.0}, ...}
    equal_weight: Dict[str, float]
    ai_blended: Dict[str, float]
    actual_observation: Optional[Dict[str, Optional[float]]] = None
    uncertainty_lower: Optional[Dict[str, float]] = None # 10th percentile
    uncertainty_upper: Optional[Dict[str, float]] = None # 90th percentile
    ensemble_spread: Optional[Dict[str, float]] = None   # inter-model variance

    model_config = ConfigDict(from_attributes=True)

class MultiModelComparisonResponse(BaseModel):
    location_id: int
    location_name: str
    forecast_horizon: str
    available_models: List[str]
    timeline: List[MultiModelComparisonPoint]
    comparison_summary: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

class BlendedForecastItem(BaseModel):
    valid_at: datetime
    forecast_lead_hours: int
    variable: str
    blended_value: float
    baseline_value: float # equal-weight
    individual_model_values: Dict[str, float]
    uncertainty_lower: Optional[float] = 0.0  # e.g. 10th percentile
    uncertainty_upper: Optional[float] = 0.0  # e.g. 90th percentile
    ensemble_spread: Optional[float] = 0.0    # max - min spread
    confidence_score: Optional[float] = 0.90  # 0.0 to 1.0 confidence index
    method: str
    model_version: str
    confidence_metadata: Dict[str, Any]
    data_status: str

    model_config = ConfigDict(from_attributes=True)

class BlendedForecastResponse(BaseModel):
    location_id: int
    location_name: str
    method: str
    model_version: str
    is_ai_generated: bool
    data_status: str
    items: List[BlendedForecastItem]

    model_config = ConfigDict(from_attributes=True)
