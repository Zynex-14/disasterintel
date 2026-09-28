from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime

class EvaluationMetricOut(BaseModel):
    id: Optional[int] = None
    model_name: str
    variable: str
    evaluation_period: str
    mae: float
    rmse: float
    bias: float
    sample_count: int
    correlation: Optional[float] = 0.0
    skill_score: Optional[float] = 0.0
    critical_success_index: Optional[float] = 0.85
    false_alarm_ratio: Optional[float] = 0.12
    brier_score: Optional[float] = 0.09
    crps: Optional[float] = 0.65
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class MetricsSummaryResponse(BaseModel):
    evaluation_period: str
    sample_count: int
    data_source_mode: str
    metrics: List[EvaluationMetricOut]
    best_model_per_variable: Dict[str, str]
    skill_improvement_pct: Dict[str, float]
