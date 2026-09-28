import os
import json
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib

from app.core.config import settings
from app.ml.feature_engineering import FeatureEngineering, FEATURE_COLUMNS
from app.schemas.forecast import BlendedForecastItem, BlendedForecastResponse

logger = logging.getLogger(__name__)

class ForecastBlender:
    def __init__(self, artifacts_dir: Optional[str] = None):
        self.artifacts_dir = artifacts_dir or settings.ML_ARTIFACTS_DIR
        self._loaded_models: Dict[str, Any] = {}
        self._loaded_metadata: Dict[str, Any] = {}

    def _get_model(self, variable: str, method: str = "random_forest"):
        key = f"{variable}_{method}"
        if key in self._loaded_models:
            return self._loaded_models[key]

        filename = f"{variable}_rf_model.joblib" if method == "random_forest" else f"{variable}_lr_model.joblib"
        filepath = os.path.join(self.artifacts_dir, filename)

        if os.path.exists(filepath):
            try:
                model = joblib.load(filepath)
                self._loaded_models[key] = model
                
                # Also load metadata if available
                meta_path = os.path.join(self.artifacts_dir, f"{variable}_metadata.json")
                if os.path.exists(meta_path):
                    with open(meta_path, "r") as f:
                        self._loaded_metadata[variable] = json.load(f)
                return model
            except Exception as e:
                logger.warning(f"Error loading model from {filepath}: {e}")
        return None

    def blend_forecast(
        self,
        variable: str,
        lead_hours: int,
        valid_at_dt,
        lat: float,
        lon: float,
        elevation_m: float,
        model_values: Dict[str, float],
        preferred_method: str = "random_forest",
        data_status: str = "simulated_demo"
    ) -> BlendedForecastItem:
        """
        Blends multi-model forecasts for a single timestamp.
        Falls back to Equal-Weight average if model is not available.
        Calculates physical uncertainty intervals and ensemble spread.
        """
        vals = [float(v) for v in model_values.values() if v is not None]
        baseline_val = float(np.mean(vals)) if vals else 0.0
        if variable == "rainfall":
            baseline_val = max(0.0, baseline_val)

        spread = float(np.max(vals) - np.min(vals)) if vals else 0.0
        std = float(np.std(vals)) if vals else 0.0

        # Attempt to load ML model
        model = self._get_model(variable, preferred_method)
        
        if model is not None:
            # Extract features
            X = FeatureEngineering.extract_features_from_dict(
                lead_hours=lead_hours,
                valid_at_dt=valid_at_dt,
                lat=lat,
                lon=lon,
                elevation_m=elevation_m,
                model_values=model_values
            )
            raw_pred = float(model.predict(X)[0])
            
            # Physics constraint: non-negative rainfall
            if variable == "rainfall":
                blended_val = round(max(0.0, raw_pred), 2)
            else:
                blended_val = round(raw_pred, 2)

            meta = self._loaded_metadata.get(variable, {})
            model_version = meta.get("version", "v1.2.3")
            confidence_meta = {
                "method_used": preferred_method,
                "is_ai_generated": True,
                "ensemble_spread": round(spread, 2),
                "top_features": list(meta.get("feature_importance", {}).keys())[:4],
                "model_rmse": meta.get("metrics", {}).get("Random_Forest", {}).get("rmse", 0.0)
            }
            method_str = f"ai_{preferred_method}"
        else:
            # Fallback to documented Equal-Weight baseline
            blended_val = round(baseline_val, 2)
            model_version = "baseline-ensemble-1.0"
            confidence_meta = {
                "method_used": "equal_weight",
                "is_ai_generated": False,
                "ensemble_spread": round(spread, 2),
                "fallback_reason": "ML model artifact not loaded"
            }
            method_str = "equal_weight_baseline"

        # Calculate uncertainty intervals (80% confidence interval: +/- 1.28 std)
        if variable == "rainfall":
            unc_lower = round(max(0.0, blended_val - 1.28 * std), 2)
            unc_upper = round(blended_val + 1.28 * std, 2)
        else:
            unc_lower = round(blended_val - 1.28 * std, 2)
            unc_upper = round(blended_val + 1.28 * std, 2)

        conf_score = round(max(0.60, min(0.98, 1.0 - (std / (abs(blended_val) + 5.0)))), 2)

        return BlendedForecastItem(
            valid_at=valid_at_dt,
            forecast_lead_hours=lead_hours,
            variable=variable,
            blended_value=blended_val,
            baseline_value=round(baseline_val, 2),
            individual_model_values=model_values,
            uncertainty_lower=unc_lower,
            uncertainty_upper=unc_upper,
            ensemble_spread=round(spread, 2),
            confidence_score=conf_score,
            method=method_str,
            model_version=model_version,
            confidence_metadata=confidence_meta,
            data_status=data_status
        )

    def blend_timeline(self, location_id: int, location_name: str, variable: str, forecast_points: list, lat: float, lon: float, elevation_m: float = 10.0, preferred_method: str = "random_forest", data_status: str = "simulated_demo") -> BlendedForecastResponse:
        """Alias helper for timeline blending."""
        class MockLoc:
            def __init__(self, id, name, latitude, longitude, elevation_m):
                self.id = id
                self.name = name
                self.latitude = latitude
                self.longitude = longitude
                self.elevation_m = elevation_m

        loc = MockLoc(location_id, location_name, lat, lon, elevation_m)
        sim_data = {"data_status": data_status, "points": forecast_points}
        return self.blend_multi_hour_series(variable=variable, location=loc, sim_data=sim_data, preferred_method=preferred_method)

    def blend_multi_hour_series(
        self,
        variable: str,
        location,
        sim_data: Dict[str, Any],
        preferred_method: str = "random_forest"
    ) -> BlendedForecastResponse:
        """
        Blends complete time series for a location.
        """
        items: List[BlendedForecastItem] = []
        data_status = sim_data.get("data_status", "simulated_demo")

        for pt in sim_data.get("points", []):
            models_dict = pt.get("models", {})
            model_var_vals = {
                model_name: vals.get(variable, 0.0)
                for model_name, vals in models_dict.items()
            }

            blended_item = self.blend_forecast(
                variable=variable,
                lead_hours=pt.get("forecast_lead_hours", 0),
                valid_at_dt=pt.get("valid_at"),
                lat=location.latitude,
                lon=location.longitude,
                elevation_m=location.elevation_m or 10.0,
                model_values=model_var_vals,
                preferred_method=preferred_method,
                data_status=data_status
            )
            items.append(blended_item)

        is_ai = any(i.method.startswith("ai_") for i in items)
        model_version = items[0].model_version if items else "v1.2.3"

        return BlendedForecastResponse(
            location_id=location.id,
            location_name=location.name,
            method=preferred_method,
            model_version=model_version,
            is_ai_generated=is_ai,
            data_status=data_status,
            items=items
        )
