import sys
import os

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_path)

from app.db.session import engine, SessionLocal, Base
from app.db.models import Location, Forecast, BlendedForecast, Alert, EvaluationMetric
from app.services.location_service import LocationService
from app.services.alert_service import AlertService
from app.ml.dataset import generate_historical_matched_dataset
from app.ml.trainer import ForecastBlendingTrainer

def main():
    print("--- 1. Initializing Database Schema ---")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("--- 2. Seeding Locations ---")
    locations = LocationService.seed_default_locations(db)
    print(f"Loaded {len(locations)} locations: {[l.name for l in locations]}")

    print("--- 3. Seeding Initial Demo Alerts ---")
    AlertService.seed_initial_demo_alerts(db)
    alert_count = db.query(Alert).count()
    print(f"Total alerts in DB: {alert_count}")

    print("--- 4. Generating Matched Historical NWP Dataset ---")
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "processed"))
    datasets = generate_historical_matched_dataset(n_days=100, output_path=data_dir)
    print(f"Generated datasets: Rainfall ({len(datasets['rainfall'])} rows), Temperature ({len(datasets['temperature'])} rows), Wind ({len(datasets['wind_speed'])} rows)")

    print("--- 5. Training ML Blending Pipeline (Random Forest & Ridge) ---")
    trainer = ForecastBlendingTrainer()
    results = trainer.train_all(datasets, db=db)

    print("\n================ ML VERIFICATION RESULTS ================")
    for var, res in results.items():
        metrics = res["metrics"]
        print(f"\n--- Variable: {var.upper()} ---")
        print(f"  GFS:             MAE={metrics['GFS']['mae']:.2f}, RMSE={metrics['GFS']['rmse']:.2f}, Bias={metrics['GFS']['bias']:+.2f}")
        print(f"  ECMWF:           MAE={metrics['ECMWF']['mae']:.2f}, RMSE={metrics['ECMWF']['rmse']:.2f}, Bias={metrics['ECMWF']['bias']:+.2f}")
        print(f"  ICON:            MAE={metrics['ICON']['mae']:.2f}, RMSE={metrics['ICON']['rmse']:.2f}, Bias={metrics['ICON']['bias']:+.2f}")
        print(f"  IMD_NWP:         MAE={metrics['IMD_NWP']['mae']:.2f}, RMSE={metrics['IMD_NWP']['rmse']:.2f}, Bias={metrics['IMD_NWP']['bias']:+.2f}")
        print(f"  [Baseline] Mean: MAE={metrics['Equal_Weight']['mae']:.2f}, RMSE={metrics['Equal_Weight']['rmse']:.2f}, Bias={metrics['Equal_Weight']['bias']:+.2f}")
        print(f"  [AI Linear Reg]: MAE={metrics['Linear_Regression']['mae']:.2f}, RMSE={metrics['Linear_Regression']['rmse']:.2f}, Bias={metrics['Linear_Regression']['bias']:+.2f}, Skill={metrics['Linear_Regression']['skill_score']:+.3f}")
        print(f"  [AI Random Frst]: MAE={metrics['Random_Forest']['mae']:.2f}, RMSE={metrics['Random_Forest']['rmse']:.2f}, Bias={metrics['Random_Forest']['bias']:+.2f}, Skill={metrics['Random_Forest']['skill_score']:+.3f}")
        print(f"  Top Features: {list(res['feature_importance'].keys())[:4]}")

    db.close()
    print("\nTraining and database seeding completed successfully!")

if __name__ == "__main__":
    main()
