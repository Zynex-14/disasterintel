from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.schemas.common_forecast import CommonForecastRecord

class BaseNWPAdapter(ABC):
    """
    Abstract base class for all NWP source adapters.
    Guarantees validation, variable normalization, and unit conversion.
    """
    def __init__(self, source_name: str, model_name: str):
        self.source_name = source_name
        self.model_name = model_name

    @abstractmethod
    async def fetch_forecasts(
        self,
        location_id: int,
        latitude: float,
        longitude: float,
        horizon_hours: int = 72
    ) -> List[CommonForecastRecord]:
        """
        Request or load data, validate, normalize variables and units,
        and return a list of CommonForecastRecord objects.
        """
        pass

    def normalize_units(self, variable: str, raw_value: float, raw_unit: str) -> float:
        """
        Convert raw units into standard units:
        - rainfall: mm
        - temperature: °C (converts Kelvin if needed)
        - wind_speed: km/h (converts m/s or knots if needed)
        - pressure: hPa
        - humidity: %
        """
        if variable == "temperature":
            if raw_unit.lower() in ["k", "kelvin"]:
                return round(raw_value - 273.15, 2)
            elif raw_unit.lower() in ["f", "fahrenheit"]:
                return round((raw_value - 32) * 5.0 / 9.0, 2)
            return round(raw_value, 2)
        elif variable == "wind_speed":
            if raw_unit.lower() in ["m/s", "mps"]:
                return round(raw_value * 3.6, 2)
            elif raw_unit.lower() in ["knots", "kt"]:
                return round(raw_value * 1.852, 2)
            return round(raw_value, 2)
        elif variable == "rainfall":
            return max(0.0, round(raw_value, 2))
        return round(raw_value, 2)
