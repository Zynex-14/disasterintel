import sys
import os
import pytest

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import engine, Base, SessionLocal
from app.services.location_service import LocationService
from app.services.alert_service import AlertService
from app.db.models import EvaluationMetric

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Ensure database tables exist and are seeded for test executions.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        LocationService.seed_default_locations(db)
        AlertService.seed_initial_demo_alerts(db)
        
        # Ensure sample evaluation metrics exist if none present
        metric_count = db.query(EvaluationMetric).count()
        if metric_count == 0:
            sample_metric = EvaluationMetric(
                model_name="Random_Forest",
                variable="rainfall",
                evaluation_period="Test Held-Out Set",
                mae=0.45,
                rmse=1.41,
                bias=-0.10,
                sample_count=2880,
                correlation=0.92,
                skill_score=0.085
            )
            db.add(sample_metric)
            db.commit()
    finally:
        db.close()
    yield
