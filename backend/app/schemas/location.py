from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class LocationBase(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Chennai"})
    state: str = Field(default="Tamil Nadu", json_schema_extra={"example": "Tamil Nadu"})
    latitude: float = Field(..., json_schema_extra={"example": 13.0827})
    longitude: float = Field(..., json_schema_extra={"example": 80.2707})
    elevation_m: Optional[float] = Field(default=10.0, json_schema_extra={"example": 6.7})

class LocationCreate(LocationBase):
    pass

class LocationOut(LocationBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
