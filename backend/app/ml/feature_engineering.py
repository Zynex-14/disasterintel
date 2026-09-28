import math
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple

# Exact feature names used for training and prediction
FEATURE_COLUMNS = [
    "lead_hours",
    "latitude",
    "longitude",
    "elevation_m",
    "is_coastal",
    "month_sin",
    "month_cos",
    "hour_sin",
    "hour_cos",
    "gfs_val",
    "ecmwf_val",
    "icon_val",
    "imd_val",
    "ensemble_mean",
    "ensemble_std",
    "spread_max_min",
    "diff_ecmwf_gfs",
    "diff_icon_imd"
]

class FeatureEngineering:
    @staticmethod
    def extract_features_from_dict(
        lead_hours: int,
        valid_at_dt,
        lat: float,
        lon: float,
        elevation_m: float,
        model_values: Dict[str, float]
    ) -> pd.DataFrame:
        """
        Transforms a single forecast slice or dictionary into a validated feature DataFrame.
        """
        # Time cyclical features
        month = valid_at_dt.month
        hour = valid_at_dt.hour
        month_sin = math.sin(2 * math.pi * month / 12.0)
        month_cos = math.cos(2 * math.pi * month / 12.0)
        hour_sin = math.sin(2 * math.pi * hour / 24.0)
        hour_cos = math.cos(2 * math.pi * hour / 24.0)

        # Geographic features
        is_coastal = 1.0 if (lon > 79.5 or lat < 8.5) else 0.0

        # Model predictions (with missing value fallback to available values)
        gfs = model_values.get("GFS", 0.0)
        ecmwf = model_values.get("ECMWF", gfs)
        icon = model_values.get("ICON", ecmwf)
        imd = model_values.get("IMD_NWP", (gfs + ecmwf) / 2.0)

        vals = [gfs, ecmwf, icon, imd]
        ensemble_mean = float(np.mean(vals))
        ensemble_std = float(np.std(vals))
        spread_max_min = float(max(vals) - min(vals))
        diff_ecmwf_gfs = float(ecmwf - gfs)
        diff_icon_imd = float(icon - imd)

        row = {
            "lead_hours": float(lead_hours),
            "latitude": float(lat),
            "longitude": float(lon),
            "elevation_m": float(elevation_m),
            "is_coastal": is_coastal,
            "month_sin": month_sin,
            "month_cos": month_cos,
            "hour_sin": hour_sin,
            "hour_cos": hour_cos,
            "gfs_val": float(gfs),
            "ecmwf_val": float(ecmwf),
            "icon_val": float(icon),
            "imd_val": float(imd),
            "ensemble_mean": ensemble_mean,
            "ensemble_std": ensemble_std,
            "spread_max_min": spread_max_min,
            "diff_ecmwf_gfs": diff_ecmwf_gfs,
            "diff_icon_imd": diff_icon_imd
        }

        return pd.DataFrame([row])[FEATURE_COLUMNS]

    @staticmethod
    def prepare_dataset_features(df: pd.DataFrame, target_col: str = "actual_val") -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepares features X and target y from raw matched dataset DataFrame.
        """
        # Ensure all required columns exist
        for col in FEATURE_COLUMNS:
            if col not in df.columns:
                raise ValueError(f"Missing required feature column: {col}")
        
        X = df[FEATURE_COLUMNS].copy()
        # Impute any residual NaNs with column median
        X = X.fillna(X.median())
        y = df[target_col].copy()
        return X, y
