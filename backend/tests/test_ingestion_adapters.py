import pytest
from app.services.ingestion.base_adapter import BaseNWPAdapter
from app.services.ingestion.imd_adapter import IMDAdapter
from app.services.ingestion.open_meteo_adapter import OpenMeteoAdapter
from app.services.ingestion.ingestion_manager import IngestionManager
from app.schemas.common_forecast import CommonForecastRecord

class DummyAdapter(BaseNWPAdapter):
    async def fetch_forecasts(self, location_id, latitude, longitude, horizon_hours=72):
        return []

def test_unit_normalization():
    adapter = DummyAdapter("Test", "TestModel")
    
    # Temperature conversions
    assert adapter.normalize_units("temperature", 300.15, "Kelvin") == 27.0
    assert adapter.normalize_units("temperature", 86.0, "Fahrenheit") == 30.0
    assert adapter.normalize_units("temperature", 32.4, "°C") == 32.4

    # Wind speed conversions
    assert adapter.normalize_units("wind_speed", 10.0, "m/s") == 36.0
    assert adapter.normalize_units("wind_speed", 20.0, "knots") == 37.04

    # Non-negative rainfall constraint
    assert adapter.normalize_units("rainfall", -5.0, "mm") == 0.0
    assert adapter.normalize_units("rainfall", 12.5, "mm") == 12.5

@pytest.mark.asyncio
async def test_imd_adapter_generation():
    adapter = IMDAdapter()
    records = await adapter.fetch_forecasts(
        location_id=1,
        latitude=13.0827,
        longitude=80.2707,
        horizon_hours=24
    )
    assert len(records) == 24 * 5  # 24 hours * 5 variables
    first = records[0]
    assert isinstance(first, CommonForecastRecord)
    assert first.model_name == "IMD_NWP"
    assert first.data_mode == "live"
    assert first.value >= 0.0 if first.variable == "rainfall" else True

@pytest.mark.asyncio
async def test_ingestion_manager_isolation():
    manager = IngestionManager()
    results = await manager.ingest_all_sources(
        location_id=1,
        latitude=13.0827,
        longitude=80.2707,
        horizon_hours=6
    )
    # Ensure all models are represented without crashing
    assert "IMD_NWP" in results
    assert len(results["IMD_NWP"]) > 0
