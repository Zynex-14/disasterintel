import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.ingestion.base_adapter import BaseNWPAdapter
from app.services.ingestion.open_meteo_adapter import OpenMeteoAdapter
from app.services.ingestion.imd_adapter import IMDAdapter
from app.schemas.common_forecast import CommonForecastRecord

logger = logging.getLogger(__name__)

class IngestionManager:
    """
    Orchestrates multi-source forecast ingestion with fail-soft isolation.
    """
    def __init__(self):
        self.adapters: List[BaseNWPAdapter] = [
            OpenMeteoAdapter(model_name="ECMWF"),
            OpenMeteoAdapter(model_name="GFS"),
            OpenMeteoAdapter(model_name="ICON"),
            IMDAdapter()
        ]

    async def ingest_all_sources(
        self,
        location_id: int,
        latitude: float,
        longitude: float,
        horizon_hours: int = 72
    ) -> Dict[str, List[CommonForecastRecord]]:
        """
        Runs ingestion across all registered adapters concurrently.
        Failures in any single adapter are logged and skipped without failing others.
        """
        results: Dict[str, List[CommonForecastRecord]] = {}

        tasks = [
            adapter.fetch_forecasts(location_id, latitude, longitude, horizon_hours)
            for adapter in self.adapters
        ]

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for adapter, res in zip(self.adapters, responses):
            if isinstance(res, Exception):
                logger.error(f"Ingestion failed for adapter {adapter.model_name}: {res}")
                results[adapter.model_name] = []
            else:
                results[adapter.model_name] = res

        return results
