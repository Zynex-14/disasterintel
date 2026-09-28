import os
import math
import random
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.ml.feature_engineering import FEATURE_COLUMNS

STATIONS = [
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707, "elev": 6.0, "coastal": 1.0},
    {"name": "Coimbatore", "lat": 11.0168, "lon": 76.9558, "elev": 411.0, "coastal": 0.0},
    {"name": "Madurai", "lat": 9.9252, "lon": 78.1198, "elev": 136.0, "coastal": 0.0},
    {"name": "Tiruchirappalli", "lat": 10.7905, "lon": 78.7047, "elev": 88.0, "coastal": 0.0},
    {"name": "Salem", "lat": 11.6643, "lon": 78.1460, "elev": 278.0, "coastal": 0.0},
    {"name": "Cuddalore", "lat": 11.7480, "lon": 79.7714, "elev": 1.0, "coastal": 1.0},
    {"name": "Nagapattinam", "lat": 10.7656, "lon": 79.8424, "elev": 9.0, "coastal": 1.0},
    {"name": "Kanyakumari", "lat": 8.0883, "lon": 77.5385, "elev": 30.0, "coastal": 1.0},
    {"name": "Vellore", "lat": 12.9165, "lon": 79.1325, "elev": 216.0, "coastal": 0.0},
    {"name": "Thanjavur", "lat": 10.7870, "lon": 79.1378, "elev": 57.0, "coastal": 0.0},
    {"name": "Nilgiris (Ooty)", "lat": 11.4102, "lon": 76.6950, "elev": 2240.0, "coastal": 0.0},
    {"name": "Puducherry", "lat": 11.9416, "lon": 79.8083, "elev": 3.0, "coastal": 1.0}
]

def generate_historical_matched_dataset(
    n_days: int = 120,
    output_path: Optional[str] = None
) -> Dict[str, pd.DataFrame]:
    """
    Generates chronological matched multi-model forecasts and ground-truth observations
    for rainfall, temperature, and wind speed.
    """
    np.random.seed(42)
    random.seed(42)

    start_date = datetime(2025, 8, 1, 0, 0, tzinfo=timezone.utc)
    records_rain = []
    records_temp = []
    records_wind = []

    for day in range(n_days):
        current_date = start_date + timedelta(days=day)
        month = current_date.month
        month_sin = math.sin(2 * math.pi * month / 12.0)
        month_cos = math.cos(2 * math.pi * month / 12.0)

        # Seasonal regime: Oct-Dec is Northeast Monsoon (Heavy rainfall in coastal TN)
        is_ne_monsoon = 1.0 if month in [10, 11, 12] else 0.0

        for station in STATIONS:
            lat = station["lat"]
            lon = station["lon"]
            elev = station["elev"]
            coastal = station["coastal"]

            # Evaluate at 00:00, 06:00, 12:00, 18:00 UTC with varying lead times (6h, 12h, 24h, 48h)
            for hour in [0, 6, 12, 18]:
                valid_at = current_date + timedelta(hours=hour)
                hour_sin = math.sin(2 * math.pi * hour / 24.0)
                hour_cos = math.cos(2 * math.pi * hour / 24.0)

                for lead in [6, 12, 24, 48]:
                    # 1. GROUND TRUTH (ACTUAL OBSERVATION)
                    # Temperature
                    diurnal_temp = math.sin(2 * math.pi * (hour / 24.0 - 0.25))
                    lapse_rate = (elev / 1000.0) * 6.5
                    true_temp = 31.0 - lapse_rate + 4.5 * diurnal_temp - 2.5 * is_ne_monsoon + np.random.normal(0, 0.8)

                    # Rainfall
                    base_rain_prob = 0.55 if (is_ne_monsoon and coastal) else (0.25 if is_ne_monsoon else 0.15)
                    if np.random.rand() < base_rain_prob:
                        gamma_scale = 18.0 if (is_ne_monsoon and coastal) else 6.0
                        true_rain = float(np.random.gamma(shape=1.5, scale=gamma_scale))
                    else:
                        true_rain = 0.0

                    # Wind Speed
                    base_wind = 18.0 + (12.0 if coastal else 0.0) + (10.0 if elev > 500 else 0.0)
                    true_wind = float(max(2.0, base_wind + np.random.normal(0, 3.5)))

                    # 2. MODEL FORECASTS WITH KNOWN SYSTEMATIC BIASES & LEAD-TIME DEGRADATION
                    lead_noise_factor = 1.0 + (lead / 48.0) * 0.4

                    # --- RAINFALL FORECASTS ---
                    # GFS underestimates convective coastal rains by ~20%
                    gfs_rain = max(0.0, true_rain * (0.80 - 0.05 * coastal) + np.random.normal(0, 1.8 * lead_noise_factor))
                    # ECMWF has lower bias, slight wet bias on light rain
                    ecmwf_rain = max(0.0, true_rain * 0.98 + (0.8 if true_rain == 0 else 0.0) + np.random.normal(0, 1.2 * lead_noise_factor))
                    # ICON overpredicts orographic/hills rain
                    icon_rain = max(0.0, true_rain * (1.18 if elev > 200 else 1.05) + np.random.normal(0, 2.0 * lead_noise_factor))
                    # IMD NWP localized tuning
                    imd_rain = max(0.0, true_rain * 0.95 + 0.4 + np.random.normal(0, 1.5 * lead_noise_factor))

                    rain_models = [gfs_rain, ecmwf_rain, icon_rain, imd_rain]
                    records_rain.append({
                        "valid_at": valid_at,
                        "lead_hours": float(lead),
                        "latitude": lat,
                        "longitude": lon,
                        "elevation_m": elev,
                        "is_coastal": coastal,
                        "month_sin": month_sin,
                        "month_cos": month_cos,
                        "hour_sin": hour_sin,
                        "hour_cos": hour_cos,
                        "gfs_val": round(gfs_rain, 2),
                        "ecmwf_val": round(ecmwf_rain, 2),
                        "icon_val": round(icon_rain, 2),
                        "imd_val": round(imd_rain, 2),
                        "ensemble_mean": round(float(np.mean(rain_models)), 2),
                        "ensemble_std": round(float(np.std(rain_models)), 2),
                        "spread_max_min": round(float(max(rain_models) - min(rain_models)), 2),
                        "diff_ecmwf_gfs": round(float(ecmwf_rain - gfs_rain), 2),
                        "diff_icon_imd": round(float(icon_rain - imd_rain), 2),
                        "actual_val": round(true_rain, 2)
                    })

                    # --- TEMPERATURE FORECASTS ---
                    gfs_temp = true_temp + 1.2 + np.random.normal(0, 0.7 * lead_noise_factor)
                    ecmwf_temp = true_temp - 0.4 + np.random.normal(0, 0.5 * lead_noise_factor)
                    icon_temp = true_temp + 0.5 + np.random.normal(0, 0.6 * lead_noise_factor)
                    imd_temp = true_temp - 0.2 + np.random.normal(0, 0.5 * lead_noise_factor)

                    temp_models = [gfs_temp, ecmwf_temp, icon_temp, imd_temp]
                    records_temp.append({
                        "valid_at": valid_at,
                        "lead_hours": float(lead),
                        "latitude": lat,
                        "longitude": lon,
                        "elevation_m": elev,
                        "is_coastal": coastal,
                        "month_sin": month_sin,
                        "month_cos": month_cos,
                        "hour_sin": hour_sin,
                        "hour_cos": hour_cos,
                        "gfs_val": round(gfs_temp, 2),
                        "ecmwf_val": round(ecmwf_temp, 2),
                        "icon_val": round(icon_temp, 2),
                        "imd_val": round(imd_temp, 2),
                        "ensemble_mean": round(float(np.mean(temp_models)), 2),
                        "ensemble_std": round(float(np.std(temp_models)), 2),
                        "spread_max_min": round(float(max(temp_models) - min(temp_models)), 2),
                        "diff_ecmwf_gfs": round(float(ecmwf_temp - gfs_temp), 2),
                        "diff_icon_imd": round(float(icon_temp - imd_temp), 2),
                        "actual_val": round(true_temp, 2)
                    })

                    # --- WIND SPEED FORECASTS ---
                    gfs_wind = max(1.0, true_wind * 1.15 + np.random.normal(0, 1.8 * lead_noise_factor))
                    ecmwf_wind = max(1.0, true_wind * 0.96 + np.random.normal(0, 1.3 * lead_noise_factor))
                    icon_wind = max(1.0, true_wind * 1.08 + np.random.normal(0, 1.6 * lead_noise_factor))
                    imd_wind = max(1.0, true_wind * 1.02 + np.random.normal(0, 1.4 * lead_noise_factor))

                    wind_models = [gfs_wind, ecmwf_wind, icon_wind, imd_wind]
                    records_wind.append({
                        "valid_at": valid_at,
                        "lead_hours": float(lead),
                        "latitude": lat,
                        "longitude": lon,
                        "elevation_m": elev,
                        "is_coastal": coastal,
                        "month_sin": month_sin,
                        "month_cos": month_cos,
                        "hour_sin": hour_sin,
                        "hour_cos": hour_cos,
                        "gfs_val": round(gfs_wind, 2),
                        "ecmwf_val": round(ecmwf_wind, 2),
                        "icon_val": round(icon_wind, 2),
                        "imd_val": round(imd_wind, 2),
                        "ensemble_mean": round(float(np.mean(wind_models)), 2),
                        "ensemble_std": round(float(np.std(wind_models)), 2),
                        "spread_max_min": round(float(max(wind_models) - min(wind_models)), 2),
                        "diff_ecmwf_gfs": round(float(ecmwf_wind - gfs_wind), 2),
                        "diff_icon_imd": round(float(icon_wind - imd_wind), 2),
                        "actual_val": round(true_wind, 2)
                    })

    df_rain = pd.DataFrame(records_rain).sort_values("valid_at").reset_index(drop=True)
    df_temp = pd.DataFrame(records_temp).sort_values("valid_at").reset_index(drop=True)
    df_wind = pd.DataFrame(records_wind).sort_values("valid_at").reset_index(drop=True)

    if output_path:
        os.makedirs(output_path, exist_ok=True)
        df_rain.to_csv(os.path.join(output_path, "matched_rainfall.csv"), index=False)
        df_temp.to_csv(os.path.join(output_path, "matched_temperature.csv"), index=False)
        df_wind.to_csv(os.path.join(output_path, "matched_wind_speed.csv"), index=False)

    return {
        "rainfall": df_rain,
        "temperature": df_temp,
        "wind_speed": df_wind
    }
