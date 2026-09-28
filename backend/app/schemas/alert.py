from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class AlertBase(BaseModel):
    hazard_type: str
    severity: str
    description: str
    triggering_value: float
    threshold: float
    status: str = "active"
    is_simulated: bool = True

class AlertCreate(AlertBase):
    location_id: int
    deduplication_key: str

class AlertOut(AlertBase):
    id: int
    location_id: int
    location_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AlertSummary(BaseModel):
    total_active: int
    high_or_critical: int
    simulated_count: int
    live_count: int
    alerts: List[AlertOut]
