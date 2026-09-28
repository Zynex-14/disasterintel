import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from app.ml.feature_engineering import FeatureEngineering, FEATURE_COLUMNS
from app.ml.evaluator import ModelEvaluator
from app.ml.blender import ForecastBlender

def test_feature_engineering_extraction():
    now = datetime(2026, 9, 28, 12, 0, tzinfo=timezone.utc)
    model_values = {
        "GFS": 25.0,
        "ECMWF": 28.0,
        "ICON": 27.0,
        "IMD_NWP": 26.5
    }
    df = FeatureEngineering.extract_features_from_dict(
        lead_hours=24,
        valid_at_dt=now,
        lat=13.0827,
        lon=80.2707,
        elevation_m=6.0,
        model_values=model_values
    )
    assert isinstance(df, pd.DataFrame)
    assert list(df.columns) == FEATURE_COLUMNS
    assert df["lead_hours"].iloc[0] == 24.0
    assert df["is_coastal"].iloc[0] == 1.0  # lon 80.27 > 79.5 is coastal
    assert df["ensemble_mean"].iloc[0] == float(np.mean([25.0, 28.0, 27.0, 26.5]))

def test_model_evaluator_metrics():
    y_true = np.array([10.0, 20.0, 30.0, 40.0])
    y_pred = np.array([12.0, 19.0, 32.0, 41.0])
    # diff: +2, -1, +2, +1 -> MAE = (2+1+2+1)/4 = 1.5, Bias = (2-1+2+1)/4 = 1.0
    metrics = ModelEvaluator.calculate_metrics(y_true, y_pred, baseline_rmse=3.0)
    assert metrics["mae"] == 1.5
    assert metrics["bias"] == 1.0
    assert metrics["sample_count"] == 4
    assert metrics["skill_score"] > 0.0  # Since rmse < 3.0

def test_blender_non_negative_rainfall():
    blender = ForecastBlender()
    now = datetime(2026, 9, 28, 12, 0, tzinfo=timezone.utc)
    # Even if model inputs are zero or negative noise, blended rainfall must never be negative
    item = blender.blend_forecast(
        variable="rainfall",
        lead_hours=12,
        valid_at_dt=now,
        lat=13.0827,
        lon=80.2707,
        elevation_m=6.0,
        model_values={"GFS": 0.0, "ECMWF": 0.0, "ICON": 0.0, "IMD_NWP": 0.0}
    )
    assert item.blended_value >= 0.0
    assert item.baseline_value >= 0.0

def test_blender_fallback_when_model_missing():
    # Test fallback behavior when pointing to empty directory
    blender = ForecastBlender(artifacts_dir="non_existent_folder_xyz")
    now = datetime(2026, 9, 28, 12, 0, tzinfo=timezone.utc)
    item = blender.blend_forecast(
        variable="temperature",
        lead_hours=6,
        valid_at_dt=now,
        lat=11.0,
        lon=77.0,
        elevation_m=400.0,
        model_values={"GFS": 30.0, "ECMWF": 32.0, "ICON": 31.0, "IMD_NWP": 31.0}
    )
    assert item.method == "equal_weight_baseline"
    assert item.confidence_metadata["is_ai_generated"] is False
    assert item.blended_value == 31.0
