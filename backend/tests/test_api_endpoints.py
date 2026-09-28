import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "healthy"

def test_health_endpoint_direct():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"

def test_data_status_endpoint():
    response = client.get("/api/data-status")
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
    assert "live_data" in data["sources"]
    assert "historical_data" in data["sources"]
    assert "simulated_demo_data" in data["sources"]

def test_system_info_endpoint():
    response = client.get("/api/system/info")
    assert response.status_code == 200
    data = response.json()
    assert data["application_name"] == "DisasterIntel"
    assert data["application_version"] == "v1.0.0"
    assert data["backend_status"] == "Online"
    assert data["database_status"] == "Online"
    assert data["ml_model_status"] in ["Trained", "Baseline Mode"]

def test_locations_endpoint():
    response = client.get("/api/v1/locations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 12
    # Ensure Chennai and Cuddalore exist
    names = [loc["name"] for loc in data]
    assert "Chennai" in names
    assert "Cuddalore" in names

def test_current_weather_endpoint():
    response = client.get("/api/v1/weather/current?location_id=1")
    assert response.status_code == 200
    data = response.json()
    assert "temperature" in data
    assert "rainfall" in data
    assert "humidity" in data
    assert "wind_speed" in data
    assert "pressure" in data
    assert data["data_status"] in ["live", "simulated_demo"]

def test_forecast_blended_endpoint():
    response = client.get("/api/v1/forecast/blended?location_id=1&variable=rainfall&method=random_forest")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) > 0
    first_item = data["items"][0]
    assert "blended_value" in first_item
    assert "baseline_value" in first_item
    assert first_item["blended_value"] >= 0.0  # Rainfall non-negative constraint

def test_forecast_compare_endpoint():
    response = client.get("/api/v1/forecast/compare?location_id=1&horizon=48h")
    assert response.status_code == 200
    data = response.json()
    assert "timeline" in data
    assert len(data["timeline"]) == 48
    first_pt = data["timeline"][0]
    assert "GFS" in first_pt["models"]
    assert "ECMWF" in first_pt["models"]
    assert "equal_weight" in first_pt
    assert "ai_blended" in first_pt
    assert "uncertainty_lower" in first_pt
    assert "uncertainty_upper" in first_pt
    assert "ensemble_spread" in first_pt

def test_risk_endpoint():
    response = client.get("/api/v1/risk?location_id=1")
    assert response.status_code == 200
    data = response.json()
    assert "overall_risk_level" in data
    assert len(data["hazards"]) == 4

def test_alerts_endpoint():
    response = client.get("/api/v1/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "total_active" in data
    assert "alerts" in data

def test_metrics_endpoint():
    response = client.get("/api/v1/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert len(data["metrics"]) > 0
    assert "best_model_per_variable" in data

def test_admin_scenario_endpoints():
    # 1. Get current scenario
    res = client.get("/api/v1/admin/scenario")
    assert res.status_code == 200
    data = res.json()
    assert "active_scenario" in data
    assert len(data["scenarios"]) >= 4

    # 2. Switch to heatwave
    res2 = client.post("/api/v1/admin/scenario", json={"scenario": "heatwave"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "success"
    assert data2["active_scenario"] == "heatwave"

    # 3. Switch back to cyclone_michaung
    res3 = client.post("/api/v1/admin/scenario", json={"scenario": "cyclone_michaung"})
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["active_scenario"] == "cyclone_michaung"
    assert data3["alerts_generated"] > 0
