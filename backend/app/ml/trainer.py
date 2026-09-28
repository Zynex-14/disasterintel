import os
import json
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import EvaluationMetric
from app.ml.feature_engineering import FEATURE_COLUMNS, FeatureEngineering
from app.ml.evaluator import ModelEvaluator

logger = logging.getLogger(__name__)

class ForecastBlendingTrainer:
    def __init__(self, artifacts_dir: str = None):
        self.artifacts_dir = artifacts_dir or settings.ML_ARTIFACTS_DIR
        os.makedirs(self.artifacts_dir, exist_ok=True)
        self.model_version = "v1.2.0"

    def train_and_evaluate_variable(
        self,
        variable: str,
        df: pd.DataFrame,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Chronologically splits data (70% train, 15% val, 15% test), trains blenders,
        and saves artifacts and evaluation metrics.
        """
        logger.info(f"Starting training pipeline for {variable} with {len(df)} samples...")
        
        # 1. Chronological Train / Val / Test Split
        df_sorted = df.sort_values("valid_at").reset_index(drop=True)
        n = len(df_sorted)
        train_idx = int(0.70 * n)
        val_idx = int(0.85 * n)

        df_train = df_sorted.iloc[:train_idx].copy()
        df_val = df_sorted.iloc[train_idx:val_idx].copy()
        df_test = df_sorted.iloc[val_idx:].copy()

        X_train, y_train = FeatureEngineering.prepare_dataset_features(df_train)
        X_val, y_val = FeatureEngineering.prepare_dataset_features(df_val)
        X_test, y_test = FeatureEngineering.prepare_dataset_features(df_test)

        # Baseline: Equal-Weight Ensemble on Test set
        eq_pred_test = X_test["ensemble_mean"].to_numpy()
        if variable == "rainfall":
            eq_pred_test = np.clip(eq_pred_test, 0.0, None)
        base_metrics = ModelEvaluator.calculate_metrics(y_test, eq_pred_test)
        baseline_rmse = base_metrics["rmse"]

        # Individual NWP Models on Test set
        gfs_metrics = ModelEvaluator.calculate_metrics(y_test, X_test["gfs_val"].to_numpy(), baseline_rmse)
        ecmwf_metrics = ModelEvaluator.calculate_metrics(y_test, X_test["ecmwf_val"].to_numpy(), baseline_rmse)
        icon_metrics = ModelEvaluator.calculate_metrics(y_test, X_test["icon_val"].to_numpy(), baseline_rmse)
        imd_metrics = ModelEvaluator.calculate_metrics(y_test, X_test["imd_val"].to_numpy(), baseline_rmse)

        # 2. Linear Regression Blender
        lr_model = Ridge(alpha=1.0)
        lr_model.fit(X_train, y_train)
        lr_pred_test = lr_model.predict(X_test)
        if variable == "rainfall":
            lr_pred_test = np.clip(lr_pred_test, 0.0, None)
        lr_metrics = ModelEvaluator.calculate_metrics(y_test, lr_pred_test, baseline_rmse)

        # 3. Random Forest Regressor Blender
        rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=9,
            min_samples_split=4,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1
        )
        rf_model.fit(X_train, y_train)
        rf_pred_test = rf_model.predict(X_test)
        if variable == "rainfall":
            rf_pred_test = np.clip(rf_pred_test, 0.0, None)
        rf_metrics = ModelEvaluator.calculate_metrics(y_test, rf_pred_test, baseline_rmse)

        # Feature importance
        feature_importance = dict(zip(FEATURE_COLUMNS, [round(float(v), 4) for v in rf_model.feature_importances_]))
        sorted_importance = dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True))

        # Save model artifacts using joblib
        rf_artifact_path = os.path.join(self.artifacts_dir, f"{variable}_rf_model.joblib")
        lr_artifact_path = os.path.join(self.artifacts_dir, f"{variable}_lr_model.joblib")
        joblib.dump(rf_model, rf_artifact_path)
        joblib.dump(lr_model, lr_artifact_path)

        # Metadata
        metadata = {
            "variable": variable,
            "version": self.model_version,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "train_samples": len(df_train),
            "test_samples": len(df_test),
            "feature_columns": FEATURE_COLUMNS,
            "feature_importance": sorted_importance,
            "metrics": {
                "GFS": gfs_metrics,
                "ECMWF": ecmwf_metrics,
                "ICON": icon_metrics,
                "IMD_NWP": imd_metrics,
                "Equal_Weight": base_metrics,
                "Linear_Regression": lr_metrics,
                "Random_Forest": rf_metrics
            }
        }
        meta_path = os.path.join(self.artifacts_dir, f"{variable}_metadata.json")
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)

        # Store in database if session provided
        if db:
            eval_period = f"Test split: {df_test['valid_at'].min().strftime('%Y-%m-%d')} to {df_test['valid_at'].max().strftime('%Y-%m-%d')}"
            models_to_record = [
                ("GFS", gfs_metrics),
                ("ECMWF", ecmwf_metrics),
                ("ICON", icon_metrics),
                ("IMD_NWP", imd_metrics),
                ("Equal_Weight", base_metrics),
                ("Linear_Regression", lr_metrics),
                ("AI_Random_Forest", rf_metrics)
            ]
            for m_name, m_val in models_to_record:
                # Remove existing metric record for this model & variable to keep updated
                db.query(EvaluationMetric).filter(
                    EvaluationMetric.model_name == m_name,
                    EvaluationMetric.variable == variable
                ).delete()

                db.add(EvaluationMetric(
                    model_name=m_name,
                    variable=variable,
                    evaluation_period=eval_period,
                    mae=m_val["mae"],
                    rmse=m_val["rmse"],
                    bias=m_val["bias"],
                    sample_count=m_val["sample_count"],
                    correlation=m_val["correlation"],
                    skill_score=m_val["skill_score"]
                ))
            db.commit()

        logger.info(f"Completed {variable}: Baseline RMSE={baseline_rmse:.3f}, RF RMSE={rf_metrics['rmse']:.3f} (Skill: {rf_metrics['skill_score']:+.3f})")
        return metadata

    def train_all(self, datasets: Dict[str, pd.DataFrame], db: Session = None) -> Dict[str, Any]:
        results = {}
        for var, df in datasets.items():
            results[var] = self.train_and_evaluate_variable(var, df, db)
        return results
