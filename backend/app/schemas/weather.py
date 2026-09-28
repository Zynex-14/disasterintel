from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CurrentWeatherOut(BaseModel):
    location_id: int
    location_name: str
    state: str
    latitude: float
    longitude: float
    timestamp: datetime
    temperature: float = Field(..., description="Temperature in Celsius")
    rainfall: float = Field(..., description="Rainfall in mm (last hour or accumulated)")
    humidity: float = Field(..., description="Relative humidity in percentage")
    wind_speed: float = Field(..., description="Wind speed in km/h")
    wind_direction: Optional[float] = Field(default=None, description="Wind direction in degrees")
    pressure: float = Field(..., description="Atmospheric pressure in hPa")
    condition: str = Field(default="Clear", description="Weather condition summary")
    data_status: str = Field(..., description="live, historical, simulated_demo")
    source: str = Field(..., description="Data provider or model source")
    last_updated: datetime

class ForecastPoint(BaseModel):
    valid_at: datetime
    forecast_lead_hours: int
    source: str
    temperature: float
    rainfall: float
    humidity: float
    wind_speed: float
    pressure: float
    wind_direction: Optional[float] = 0.0
    precipitation_prob: Optional[float] = 0.0
    data_status: str

class ForecastSeriesOut(BaseModel):
    location_id: int
    location_name: str
    state: str
    source: str
    data_status: str
    forecast_horizon: str  # e.g., "24h", "72h", "7d"
    generated_at: datetime
    points: List[ForecastPoint]
