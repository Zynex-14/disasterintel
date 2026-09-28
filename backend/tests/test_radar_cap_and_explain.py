import pytest
from types import SimpleNamespace
from fastapi.testclient import TestClient
from app.main import app
from app.services.cap_service import CAPService
from app.services.radar_service import RadarNowcastService
from app.ml.explainability import BlendingExplainabilityEngine
from app.ml.evaluator import ModelEvaluator
import numpy as np

client = TestClient(app)

def test_oasis_cap_xml_generation():
    """Verify that alert_to_cap_xml outputs valid OASIS CAP v1.2 XML with required tags."""
    alert_obj = SimpleNamespace(
        id=999,
        location_id=1,
        hazard_type="heavy_rainfall",
        severity="very_high",
        description="Exceeding 200mm in 24 hours.",
        is_simulated=False,
        created_at=None,
        location=SimpleNamespace(name="Chennai", latitude=13.0827, longitude=80.2707, state="Tamil Nadu")
    )

    xml_str = CAPService.alert_to_cap_xml(alert_obj)
    assert 'xmlns="urn:oasis:names:tc:emergency:cap:1.2"' in xml_str
    assert "DISASTERINTEL-999" in xml_str
    assert "<sender>seoc.disasterintel@tn.gov.in</sender>" in xml_str
    assert "<status>Actual</status>" in xml_str
    assert "<msgType>Alert</msgType>" in xml_str
    assert "<scope>Public</scope>" in xml_str
    assert "<severity>Extreme</severity>" in xml_str
    assert "<value>RED</value>" in xml_str
    assert "Chennai, Tamil Nadu, India" in xml_str

def test_cap_xml_endpoints():
    """Verify the CAP XML endpoints return valid application/xml."""
    # Global CAP feed
    resp = client.get("/api/v1/alerts/cap.xml")
    assert resp.status_code == 200
    assert "application/xml" in resp.headers.get("content-type", "")
    assert "urn:oasis:names:tc:emergency:cap:1.2" in resp.text

    # Specific alert CAP
    resp_single = client.get("/api/v1/alerts/1/cap.xml")
    assert resp_single.status_code == 200
    assert "application/xml" in resp_single.headers.get("content-type", "")

def test_state_incident_action_plan():
    """Verify State Incident Action Plan briefing generation for SEOC."""
    resp = client.get("/api/v1/alerts/briefing/incident-action-plan")
    assert resp.status_code == 200
    data = resp.json()
    assert "iap_id" in data
    assert "incident_commander" in data
    assert "tactical_action_directives" in data
    assert len(data["tactical_action_directives"]) > 0

def test_emergency_broadcast_trigger():
    """Verify emergency cell broadcast trigger endpoint."""
    resp = client.post("/api/v1/alerts/broadcast")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "broadcast_dispatched"
    assert "channels" in data
    assert "CAP_SACHET_FEED" in data["channels"]

def test_radar_sites_endpoint():
    """Verify dual S-band radar metadata."""
    resp = client.get("/api/v1/weather/radar/sites")
    assert resp.status_code == 200
    data = resp.json()
    sites = data.get("sites", [])
    assert len(sites) >= 2
    site_ids = [s["id"] for s in sites]
    assert "DWR_CHENNAI" in site_ids
    assert "DWR_KARAIKAL" in site_ids
    assert sites[0]["max_range_km"] == 250

def test_radar_nowcast_endpoint():
    """Verify 0-3h optical flow radar reflectivity frames."""
    resp = client.get("/api/v1/weather/radar/nowcast?scenario=cyclone_michaung")
    assert resp.status_code == 200
    data = resp.json()
    assert "frames" in data
    assert len(data["frames"]) == 8  # -30, -15, 0, 15, 30, 45, 60, 90
    first_frame = data["frames"][0]
    assert first_frame["lead_minutes"] == -30
    assert first_frame["is_nowcast_projection"] is False
    live_frame = data["frames"][2]
    assert live_frame["lead_minutes"] == 0
    nowcast_frame = data["frames"][3]
    assert nowcast_frame["lead_minutes"] == 15
    assert nowcast_frame["is_nowcast_projection"] is True
    assert len(nowcast_frame["radar_cells"]) > 0

def test_spatial_grid_mesh():
    """Verify continuous 0.5 deg spatial grid mesh generation."""
    resp = client.get("/api/v1/weather/spatial-mesh?scenario=cyclone_michaung")
    assert resp.status_code == 200
    data = resp.json()
    assert "grid_points" in data
    assert len(data["grid_points"]) == 42  # 7 lats x 6 lons
    pt = data["grid_points"][0]
    assert "rainfall_mm" in pt
    assert "flood_risk_index" in pt
    assert "risk_tier" in pt

def test_prediction_explainability():
    """Verify SHAP-style factor attribution endpoint."""
    resp = client.get("/api/v1/forecast/explain?location_id=1&variable=rainfall&lead_hours=24")
    assert resp.status_code == 200
    data = resp.json()
    assert "attributions" in data
    assert len(data["attributions"]) >= 6
    assert "explainability_summary" in data
    features = [a["feature"] for a in data["attributions"]]
    assert any("ECMWF" in f for f in features)
    assert any("GFS" in f for f in features)
    assert any("Ensemble Arithmetic Mean" in f for f in features)

def test_wmo_evaluator_metrics():
    """Verify WMO advanced metrics (CSI, FAR, Brier, CRPS) calculation."""
    y_true = np.array([0, 12, 45, 65, 80, 5, 2])
    y_pred = np.array([0, 10, 42, 70, 75, 8, 1])

    metrics = ModelEvaluator.calculate_metrics(y_true, y_pred, baseline_rmse=12.0)
    assert "critical_success_index" in metrics
    assert "false_alarm_ratio" in metrics
    assert "brier_score" in metrics
    assert "crps" in metrics
    assert 0.0 <= metrics["critical_success_index"] <= 1.0
    assert 0.0 <= metrics["false_alarm_ratio"] <= 1.0
    assert metrics["brier_score"] >= 0.0
    assert metrics["crps"] >= 0.0
