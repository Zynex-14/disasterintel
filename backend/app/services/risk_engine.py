from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.core.config import settings
from app.schemas.risk import HazardRisk, DisasterRiskAssessmentOut
from app.db.models import Location

SEVERITY_COLORS = {
    "low": "#10B981",       # Emerald Green
    "moderate": "#F59E0B",  # Amber/Yellow
    "high": "#F97316",      # Orange
    "very_high": "#EF4444"  # Crimson Red
}

class DisasterRiskEngine:
    @staticmethod
    def evaluate_hazards(
        location: Location,
        forecast_points: List[Dict[str, Any]],
        data_status: str = "simulated_demo",
        data_source: str = "Hybrid AI-NWP Blended System"
    ) -> DisasterRiskAssessmentOut:
        """
        Evaluates disaster risk across 4 hazards based on multi-model forecast data:
        1. Heavy Rainfall (using 24h accumulated peak)
        2. Potential Flood Conditions (multi-factor: 24h & 72h accumulation, elevation proxy)
        3. High Wind (peak gust/speed)
        4. Extreme Temperature (Heatwave / Cold wave)
        """
        now = datetime.now(timezone.utc)
        thresholds = settings.RISK_THRESHOLDS
        
        # Calculate key aggregates over next 24-72 hours
        rain_24h = sum(pt["rainfall"] for pt in forecast_points[:24]) if forecast_points else 0.0
        rain_72h = sum(pt["rainfall"] for pt in forecast_points[:72]) if forecast_points else 0.0
        max_hourly_rain = max((pt["rainfall"] for pt in forecast_points[:24]), default=0.0)
        max_wind = max((pt["wind_speed"] for pt in forecast_points[:72]), default=0.0)
        max_temp = max((pt["temperature"] for pt in forecast_points[:72]), default=30.0)
        min_temp = min((pt["temperature"] for pt in forecast_points[:72]), default=25.0)

        hazards: List[HazardRisk] = []
        is_simulated = (data_status == "simulated_demo")

        # ----------------------------------------------------
        # 1. HEAVY RAINFALL EVALUATION (Aligned with IMD standards)
        # ----------------------------------------------------
        rf_thresh = thresholds["rainfall_24h"]
        if rain_24h >= rf_thresh["very_high"]: # >= 204.4 mm
            rf_level = "very_high"
            rf_exp = f"Extremely Heavy Rainfall alert: Projected 24h accumulation is {rain_24h:.1f} mm, exceeding the critical {rf_thresh['very_high']} mm threshold. Severe localized inundation expected."
        elif rain_24h >= rf_thresh["high"]: # >= 115.5 mm
            rf_level = "high"
            rf_exp = f"Very Heavy Rainfall alert: Projected 24h accumulation is {rain_24h:.1f} mm (threshold {rf_thresh['high']} mm). Waterlogging in low-lying areas and travel disruption probable."
        elif rain_24h >= rf_thresh["moderate"]: # >= 64.5 mm
            rf_level = "moderate"
            rf_exp = f"Heavy Rainfall advisory: Projected 24h accumulation is {rain_24h:.1f} mm (threshold {rf_thresh['moderate']} mm). Moderate waterlogging possible in vulnerable pockets."
        elif rain_24h >= rf_thresh["low"]:
            rf_level = "low"
            rf_exp = f"Light to Moderate spells expected ({rain_24h:.1f} mm in 24h). Within manageable urban drainage capacity."
        else:
            rf_level = "low"
            rf_exp = f"Normal precipitation levels forecast ({rain_24h:.1f} mm in 24h). No heavy rain warnings active."

        hazards.append(HazardRisk(
            hazard_type="heavy_rainfall",
            hazard_title="Heavy Rainfall Risk",
            risk_level=rf_level,
            severity_color=SEVERITY_COLORS[rf_level],
            forecast_value=round(rain_24h, 1),
            trigger_threshold=rf_thresh.get(rf_level, rf_thresh["moderate"]),
            unit="mm/24h",
            forecast_period="Next 24 Hours",
            explanation=rf_exp,
            contributing_factors=[
                f"Peak single-hour intensity: {max_hourly_rain:.1f} mm/h",
                f"72h cumulative precipitation: {rain_72h:.1f} mm",
                "High atmospheric moisture convergence"
            ],
            is_simulated=is_simulated,
            data_source=data_source,
            timestamp=now
        ))

        # ----------------------------------------------------
        # 2. POTENTIAL FLOOD CONDITIONS
        # Multi-factor composite index incorporating rainfall accumulation and topography
        # ----------------------------------------------------
        # Elevation factor: low-lying coastal (< 15m) or delta regions have higher vulnerability
        elevation_penalty = 0.25 if location.elevation_m < 15.0 else 0.05
        # Rain factor normalized to [0, 1]
        rain_index = min(1.0, (rain_24h / 150.0) * 0.6 + (rain_72h / 250.0) * 0.4)
        flood_composite_score = min(1.0, rain_index + elevation_penalty)
        flood_thresh = thresholds["flood_index"]

        if flood_composite_score >= flood_thresh["very_high"]:
            fl_level = "very_high"
            fl_exp = (
                f"Severe Flood Risk Index ({flood_composite_score:.2f}/1.00). Extreme cumulative precipitation ({rain_72h:.1f} mm in 72h) "
                f"coupled with low elevation ({location.elevation_m}m) indicates critical probability of river overflow and severe urban inundation."
            )
        elif flood_composite_score >= flood_thresh["high"]:
            fl_level = "high"
            fl_exp = (
                f"High Flood Risk Index ({flood_composite_score:.2f}/1.00). Intense rain spells ({rain_24h:.1f} mm in 24h) "
                "likely to exceed local storm drainage capacity and saturate surface soil."
            )
        elif flood_composite_score >= flood_thresh["moderate"]:
            fl_level = "moderate"
            fl_exp = (
                f"Moderate Flood Watch ({flood_composite_score:.2f}/1.00). Elevated runoff potential in drainage basins and underpasses."
            )
        else:
            fl_level = "low"
            fl_exp = f"Low Flood Risk Index ({flood_composite_score:.2f}/1.00). Runoff within normal drainage parameters."

        hazards.append(HazardRisk(
            hazard_type="flood_condition",
            hazard_title="Potential Flood Conditions",
            risk_level=fl_level,
            severity_color=SEVERITY_COLORS[fl_level],
            forecast_value=round(flood_composite_score, 2),
            trigger_threshold=flood_thresh.get(fl_level, flood_thresh["moderate"]),
            unit="Composite Index (0-1)",
            forecast_period="Next 72 Hours",
            explanation=fl_exp,
            contributing_factors=[
                f"72h precipitation accumulation: {rain_72h:.1f} mm",
                f"Terrain elevation: {location.elevation_m} m ASL",
                "Soil moisture saturation proxy elevated",
                "Future: River gauge telemetry integration enabled"
            ],
            is_simulated=is_simulated,
            data_source=data_source,
            timestamp=now
        ))

        # ----------------------------------------------------
        # 3. HIGH WIND EVALUATION
        # ----------------------------------------------------
        w_thresh = thresholds["wind_speed_kmh"]
        if max_wind >= w_thresh["very_high"]:
            w_level = "very_high"
            w_exp = f"Severe Gale / Cyclonic Wind Warning: Peak sustained wind speed {max_wind:.1f} km/h (threshold {w_thresh['very_high']} km/h). Structural hazard and uprooted trees expected."
        elif max_wind >= w_thresh["high"]:
            w_level = "high"
            w_exp = f"High Wind Alert: Peak wind gusts reaching {max_wind:.1f} km/h (threshold {w_thresh['high']} km/h). Coastal marine operations advised to suspend."
        elif max_wind >= w_thresh["moderate"]:
            w_level = "moderate"
            w_exp = f"Squally Wind Advisory: Gusty winds up to {max_wind:.1f} km/h (threshold {w_thresh['moderate']} km/h). Caution for small boats and temporary structures."
        else:
            w_level = "low"
            w_exp = f"Moderate/Breeze conditions ({max_wind:.1f} km/h). Normal atmospheric circulation."

        hazards.append(HazardRisk(
            hazard_type="high_wind",
            hazard_title="High Wind Risk",
            risk_level=w_level,
            severity_color=SEVERITY_COLORS[w_level],
            forecast_value=round(max_wind, 1),
            trigger_threshold=w_thresh.get(w_level, w_thresh["moderate"]),
            unit="km/h",
            forecast_period="Next 72 Hours",
            explanation=w_exp,
            contributing_factors=[
                f"Peak sustained wind: {max_wind:.1f} km/h",
                "Atmospheric pressure gradient tightening",
                "Coastal maritime buffer advisory"
            ],
            is_simulated=is_simulated,
            data_source=data_source,
            timestamp=now
        ))

        # ----------------------------------------------------
        # 4. EXTREME TEMPERATURE EVALUATION
        # ----------------------------------------------------
        t_thresh = thresholds["temperature_celsius"]
        if max_temp >= t_thresh["heat_very_high"]:
            t_level = "very_high"
            t_exp = f"Severe Heatwave Alert: Maximum temperature reaching {max_temp:.1f}°C (threshold {t_thresh['heat_very_high']}°C). High risk of heat stroke; avoid outdoor exposure."
        elif max_temp >= t_thresh["heat_high"]:
            t_level = "high"
            t_exp = f"Heatwave Warning: Temperature reaching {max_temp:.1f}°C (threshold {t_thresh['heat_high']}°C). Elevated dehydration risk."
        elif max_temp >= t_thresh["heat_moderate"]:
            t_level = "moderate"
            t_exp = f"Warm conditions ({max_temp:.1f}°C). Discomfort advisory during midday hours."
        elif min_temp <= t_thresh["cold_high"]:
            t_level = "high"
            t_exp = f"Cold Wave Warning: Minimum temperature dropping to {min_temp:.1f}°C in elevated terrain."
        else:
            t_level = "low"
            t_exp = f"Normal thermal range (Min: {min_temp:.1f}°C, Max: {max_temp:.1f}°C)."

        hazards.append(HazardRisk(
            hazard_type="extreme_heat",
            hazard_title="Extreme Temperature Risk",
            risk_level=t_level,
            severity_color=SEVERITY_COLORS[t_level],
            forecast_value=round(max_temp, 1),
            trigger_threshold=t_thresh["heat_high"] if max_temp >= 35.0 else t_thresh["cold_high"],
            unit="°C",
            forecast_period="Next 72 Hours",
            explanation=t_exp,
            contributing_factors=[
                f"Peak forecasted temperature: {max_temp:.1f}°C",
                f"Minimum forecasted temperature: {min_temp:.1f}°C",
                "Solar radiation and surface thermal index"
            ],
            is_simulated=is_simulated,
            data_source=data_source,
            timestamp=now
        ))

        # Overall risk level is highest level among hazards
        severity_rank = {"low": 1, "moderate": 2, "high": 3, "very_high": 4}
        max_severity = max(hazards, key=lambda h: severity_rank[h.risk_level]).risk_level

        return DisasterRiskAssessmentOut(
            location_id=location.id,
            location_name=location.name,
            state=location.state,
            overall_risk_level=max_severity,
            assessment_timestamp=now,
            hazards=hazards
        )
