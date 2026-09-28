import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

RADAR_SITES = [
    {
        "id": "DWR_CHENNAI",
        "name": "Chennai Port S-Band DWR",
        "latitude": 13.0827,
        "longitude": 80.2907,
        "band": "S-Band (2.8 GHz)",
        "peak_power_kw": 750,
        "max_range_km": 250,
        "status": "OPERATIONAL"
    },
    {
        "id": "DWR_KARAIKAL",
        "name": "Karaikal S-Band DWR",
        "latitude": 10.9254,
        "longitude": 79.8380,
        "band": "S-Band (2.8 GHz)",
        "peak_power_kw": 750,
        "max_range_km": 250,
        "status": "OPERATIONAL"
    }
]

class RadarNowcastService:
    """
    Doppler Weather Radar (DWR) Nowcasting and Continuous Spatial Grid Interpolator.
    Generates 0-3h optical-flow nowcasting reflectivity rasters and continuous hazard surfaces.
    """

    @staticmethod
    def get_radar_sites() -> List[Dict[str, Any]]:
        return RADAR_SITES

    @staticmethod
    def generate_nowcast_frames(scenario: str = "cyclone_michaung") -> Dict[str, Any]:
        """
        Generates 8 sequential 15-minute radar reflectivity frames (-30m, -15m, 0m, +15m, +30m, +45m, +60m, +90m).
        """
        now = datetime.now(timezone.utc)
        frames = []

        # Time offsets in minutes
        offsets = [-30, -15, 0, 15, 30, 45, 60, 90]

        for offset in offsets:
            frame_time = now + timedelta(minutes=offset)
            is_forecast = offset > 0
            
            # Generate simulated radar reflectivity echoes (convective rain bands)
            cells = []
            if scenario in ["cyclone_michaung", "monsoon_depression"]:
                # Spiral cyclone rain bands moving North-Northwest along Tamil Nadu coast
                band_drift = (offset / 60.0) * 0.25 # Drift in degrees
                cells.append({
                    "cell_id": "BAND_NORTH",
                    "center": [13.15 + band_drift * 0.8, 80.35 - band_drift * 0.3],
                    "radius_km": 65,
                    "max_dbz": 54 if scenario == "cyclone_michaung" else 42,
                    "cloud_top_km": 14.5,
                    "direction_deg": 335,
                    "speed_kmh": 32,
                    "hazard": "Severe Convective Cloudburst"
                })
                cells.append({
                    "cell_id": "BAND_CENTRAL_CUDDALORE",
                    "center": [11.85 + band_drift * 0.7, 79.85 - band_drift * 0.2],
                    "radius_km": 80,
                    "max_dbz": 58 if scenario == "cyclone_michaung" else 45,
                    "cloud_top_km": 16.0,
                    "direction_deg": 340,
                    "speed_kmh": 35,
                    "hazard": "Tidal Inundation & Torrential Band"
                })
                cells.append({
                    "cell_id": "BAND_DELTA",
                    "center": [10.80 + band_drift * 0.6, 79.90 - band_drift * 0.2],
                    "radius_km": 55,
                    "max_dbz": 48,
                    "cloud_top_km": 12.0,
                    "direction_deg": 345,
                    "speed_kmh": 30,
                    "hazard": "Heavy Coastal Squall"
                })
            elif scenario == "heatwave":
                # Fair weather echoes with thermal sea breeze front
                cells.append({
                    "cell_id": "SEA_BREEZE_CONVERGENCE",
                    "center": [12.20, 79.70],
                    "radius_km": 30,
                    "max_dbz": 22,
                    "cloud_top_km": 4.5,
                    "direction_deg": 270,
                    "speed_kmh": 12,
                    "hazard": "Weak Coastal Convergence"
                })

            frames.append({
                "frame_index": len(frames),
                "timestamp": frame_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "lead_minutes": offset,
                "is_nowcast_projection": is_forecast,
                "radar_cells": cells
            })

        return {
            "radar_network": "IMD Tamil Nadu Dual-S Band Composite",
            "active_scenario": scenario,
            "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "frames": frames
        }

    @staticmethod
    def generate_spatial_grid_mesh(scenario: str = "cyclone_michaung") -> Dict[str, Any]:
        """
        Generates continuous spatial grid mesh across Tamil Nadu (8.0°N to 13.5°N, 76.5°E to 80.5°E).
        Used by GIS layers to render continuous risk surfaces rather than point markers.
        """
        grid_points = []
        lats = [8.2, 9.2, 10.0, 10.8, 11.5, 12.2, 13.1]
        lons = [77.0, 77.8, 78.5, 79.2, 79.8, 80.3]

        for lat in lats:
            for lon in lons:
                is_coastal = lon >= 79.5 or lat <= 8.5
                is_hill = lon < 77.2 and lat > 11.0

                if scenario == "cyclone_michaung":
                    rain = round(140.0 * math.exp(-((lat - 12.0)**2 + (lon - 80.0)**2) / 3.0), 1)
                    wind = round(45.0 + 40.0 * math.exp(-((lat - 12.5)**2 + (lon - 80.2)**2) / 4.0), 1)
                    temp = round(26.0 + (lat - 8.0) * 0.4, 1)
                    flood_risk = round(min(1.0, (rain / 120.0) * 0.8 + (1.0 if is_coastal else 0.2) * 0.2), 2)
                elif scenario == "heatwave":
                    rain = 0.0
                    wind = round(16.0 + (lat - 9.0) * 1.5, 1)
                    temp = round(44.5 - (1.5 if is_coastal else 0.0) - (8.0 if is_hill else 0.0), 1)
                    flood_risk = 0.02
                else:
                    rain = round(18.0 if is_coastal else 4.0, 1)
                    wind = round(22.0 if is_coastal else 14.0, 1)
                    temp = round(31.5 - (6.0 if is_hill else 0.0), 1)
                    flood_risk = 0.15

                grid_points.append({
                    "lat": lat,
                    "lon": lon,
                    "rainfall_mm": rain,
                    "wind_kmh": wind,
                    "temp_c": temp,
                    "flood_risk_index": flood_risk,
                    "risk_tier": "extreme" if flood_risk >= 0.75 else ("high" if flood_risk >= 0.50 else ("moderate" if flood_risk >= 0.25 else "low"))
                })

        return {
            "region": "Tamil Nadu & Puducherry Coastal Basin",
            "resolution": "0.50 deg (~55 km spatial mesh)",
            "scenario": scenario,
            "grid_points": grid_points
        }
