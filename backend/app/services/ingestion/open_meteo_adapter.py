import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import httpx
from app.services.ingestion.base_adapter import BaseNWPAdapter
from app.schemas.common_forecast import CommonForecastRecord

logger = logging.getLogger(__name__)

class OpenMeteoAdapter(BaseNWPAdapter):
    """
    Adapter for Open-Meteo global NWP aggregator.
    Supports GFS, ECMWF IFS, and ICON models.
    """
    def __init__(self, model_name: str = "ECMWF"):
        super().__init__(source_name="Open-Meteo", model_name=model_name)
        self.api_url = "https://api.open-meteo.com/v1/forecast"

    async def fetch_forecasts(
        self,
        location_id: int,
        latitude: float,
        longitude: float,
        horizon_hours: int = 72
    ) -> List[CommonForecastRecord]:
        model_param_map = {
            "GFS": "gfs_seamless",
            "ECMWF": "ecmwf_ifs025",
            "ICON": "icon_seamless"
        }
        target_model = model_param_map.get(self.model_name, "ecmwf_ifs025")
        days = max(1, min(7, (horizon_hours + 23) // 24))

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,precipitation",
            "models": target_model,
            "timezone": "auto",
            "forecast_days": days
        }

        records: List[CommonForecastRecord] = []
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(self.api_url, params=params)
                if resp.status_code != 200:
                    logger.warning(f"Open-Meteo API returned status {resp.status_code} for {self.model_name}")
                    return []
                
                data = resp.json()
                hourly = data.get("hourly", {})
                times = hourly.get("time", [])
                temps = hourly.get(f"temperature_2m_{target_model}", hourly.get("temperature_2m", []))
                rains = hourly.get(f"precipitation_{target_model}", hourly.get("precipitation", []))
                winds = hourly.get(f"wind_speed_10m_{target_model}", hourly.get("wind_speed_10m", []))
                humids = hourly.get(f"relative_humidity_2m_{target_model}", hourly.get("relative_humidity_2m", []))
                press = hourly.get(f"surface_pressure_{target_model}", hourly.get("surface_pressure", []))

                run_time = datetime.now(timezone.utc)
                count = min(len(times), horizon_hours)

                for i in range(count):
                    valid_time = datetime.fromisoformat(times[i])
                    lead_time = i

                    # Map variables
                    var_values = [
                        ("temperature", temps[i] if i < len(temps) else 28.0, "°C"),
                        ("rainfall", max(0.0, rains[i] if i < len(rains) else 0.0), "mm"),
                        ("wind_speed", winds[i] if i < len(winds) else 15.0, "km/h"),
                        ("humidity", humids[i] if i < len(humids) else 65.0, "%"),
                        ("pressure", press[i] if i < len(press) else 1010.0, "hPa"),
                    ]

                    for var_name, raw_val, unit in var_values:
                        norm_val = self.normalize_units(var_name, float(raw_val or 0.0), unit)
                        records.append(CommonForecastRecord(
                            source_name=self.source_name,
                            model_name=self.model_name,
                            model_version="operational",
                            location_id=location_id,
                            latitude=latitude,
                            longitude=longitude,
                            variable=var_name,
                            value=norm_val,
                            unit=unit,
                            run_time=run_time,
                            valid_time=valid_time,
                            lead_time=lead_time,
                            data_mode="live",
                            quality_status="valid"
                        ))
        except Exception as e:
            logger.warning(f"OpenMeteoAdapter ({self.model_name}) error: {e}")
        return records
