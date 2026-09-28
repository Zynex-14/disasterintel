import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import Base
from app.db.models import Location, Alert
from app.services.risk_engine import DisasterRiskEngine
from app.services.alert_service import AlertService

# In-memory SQLite for test isolation
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    loc = Location(id=1, name="Test City", state="Tamil Nadu", latitude=13.0, longitude=80.2, elevation_m=5.0)
    db.add(loc)
    db.commit()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

def test_risk_engine_heavy_rainfall():
    loc = Location(id=1, name="Cuddalore", state="Tamil Nadu", latitude=11.7, longitude=79.7, elevation_m=2.0)
    
    # 24 hours of 10 mm/h = 240 mm (Extremely Heavy Rainfall)
    points = [{"rainfall": 10.0, "temperature": 27.0, "wind_speed": 40.0, "pressure": 1005.0} for _ in range(72)]
    
    assessment = DisasterRiskEngine.evaluate_hazards(loc, points)
    rf_hazard = next(h for h in assessment.hazards if h.hazard_type == "heavy_rainfall")
    
    assert rf_hazard.risk_level == "very_high"
    assert rf_hazard.forecast_value >= 204.4
    assert rf_hazard.severity_color == "#EF4444"

def test_alert_service_deduplication(db_session):
    loc = db_session.query(Location).first()
    # High wind scenario (75 km/h)
    points = [{"rainfall": 0.0, "temperature": 32.0, "wind_speed": 75.0, "pressure": 1000.0} for _ in range(72)]
    
    assessment = DisasterRiskEngine.evaluate_hazards(loc, points)
    
    # First alert run
    alerts_run_1 = AlertService.process_and_persist_alerts(db_session, assessment)
    assert len(alerts_run_1) >= 1
    initial_count = db_session.query(Alert).count()

    # Second alert run with same assessment on same day must not duplicate
    alerts_run_2 = AlertService.process_and_persist_alerts(db_session, assessment)
    post_count = db_session.query(Alert).count()
    
    assert initial_count == post_count, "Alert deduplication failed: duplicate alert was created!"
