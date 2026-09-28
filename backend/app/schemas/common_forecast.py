from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone

def utcnow():
    return datetime.now(timezone.utc)

class CommonForecastRecord(BaseModel):
    """
    Standardized common forecast record conforming to Part 5.3 of specification.
    """
    source_name: str = Field(..., description="Name of external data provider/aggregator")
    model_name: str = Field(..., description="NWP Model identifier: GFS, ECMWF, ICON, IMD_NWP")
    model_version: str = Field(default="operational", description="Model cycle or version")
    location_id: int = Field(..., description="Station ID in database")
    latitude: float
    longitude: float
    variable: str = Field(..., description="Standard variable: rainfall, temperature, wind_speed, humidity, pressure")
    value: float = Field(..., description="Normalized numerical prediction")
    unit: str = Field(..., description="Standard units: mm, °C, km/h, %, hPa")
    run_time: datetime = Field(..., description="Model initialization cycle timestamp")
    valid_time: datetime = Field(..., description="Forecast valid timestamp")
    lead_time: int = Field(..., description="Forecast lead time in hours")
    ingestion_time: datetime = Field(default_factory=utcnow, description="Time ingested into system")
    data_mode: str = Field(default="live", description="live, historical, or simulated_demo")
    quality_status: str = Field(default="valid", description="valid, degraded, or imputed")

    model_config = ConfigDict(from_attributes=True)
