from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.models import Alert, Location
from app.schemas.risk import DisasterRiskAssessmentOut
from app.schemas.alert import AlertOut, AlertSummary

class AlertService:
    @staticmethod
    def process_and_persist_alerts(
        db: Session,
        risk_assessment: DisasterRiskAssessmentOut
    ) -> List[Alert]:
        """
        Generates alerts for hazards with severity 'moderate', 'high', or 'very_high'.
        Prevents duplicate alerts using deterministic deduplication_key for the current date.
        """
        now = datetime.now(timezone.utc)
        date_str = now.strftime("%Y-%m-%d")
        created_alerts = []

        for hazard in risk_assessment.hazards:
            if hazard.risk_level in ["moderate", "high", "very_high"]:
                dedup_key = f"loc_{risk_assessment.location_id}_{hazard.hazard_type}_{hazard.risk_level}_{date_str}"
                
                # Check for existing alert with same deduplication key
                existing = db.query(Alert).filter(Alert.deduplication_key == dedup_key).first()
                if not existing:
                    new_alert = Alert(
                        location_id=risk_assessment.location_id,
                        hazard_type=hazard.hazard_type,
                        severity=hazard.risk_level,
                        description=hazard.explanation,
                        triggering_value=hazard.forecast_value,
                        threshold=hazard.trigger_threshold,
                        status="active",
                        is_simulated=hazard.is_simulated,
                        deduplication_key=dedup_key,
                        created_at=now
                    )
                    db.add(new_alert)
                    db.commit()
                    db.refresh(new_alert)
                    created_alerts.append(new_alert)
                else:
                    created_alerts.append(existing)

        return created_alerts

    @staticmethod
    def get_alerts(
        db: Session,
        location_id: Optional[int] = None,
        severity: Optional[str] = None,
        hazard_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> AlertSummary:
        """
        Retrieves filtered alerts from database.
        """
        query = db.query(Alert).join(Location)

        if location_id:
            query = query.filter(Alert.location_id == location_id)
        if severity:
            query = query.filter(Alert.severity == severity.lower())
        if hazard_type:
            query = query.filter(Alert.hazard_type == hazard_type.lower())
        if status:
            query = query.filter(Alert.status == status.lower())

        alerts = query.order_by(desc(Alert.created_at)).limit(limit).all()

        # Map location names
        alert_outs = []
        for a in alerts:
            alert_outs.append(AlertOut(
                id=a.id,
                location_id=a.location_id,
                location_name=a.location.name if a.location else "Unknown",
                hazard_type=a.hazard_type,
                severity=a.severity,
                description=a.description,
                triggering_value=a.triggering_value,
                threshold=a.threshold,
                status=a.status,
                is_simulated=a.is_simulated,
                created_at=a.created_at
            ))

        total_active = db.query(Alert).filter(Alert.status == "active").count()
        high_or_crit = db.query(Alert).filter(
            Alert.status == "active",
            Alert.severity.in_(["high", "very_high"])
        ).count()
        sim_count = db.query(Alert).filter(Alert.is_simulated == True).count()
        live_count = db.query(Alert).filter(Alert.is_simulated == False).count()

        return AlertSummary(
            total_active=total_active,
            high_or_critical=high_or_crit,
            simulated_count=sim_count,
            live_count=live_count,
            alerts=alert_outs
        )

    @staticmethod
    def seed_initial_demo_alerts(db: Session):
        """Seed realistic initial alerts for coastal Tamil Nadu districts."""
        if db.query(Alert).count() == 0:
            cuddalore = db.query(Location).filter(Location.name == "Cuddalore").first()
            nagapattinam = db.query(Location).filter(Location.name == "Nagapattinam").first()
            chennai = db.query(Location).filter(Location.name == "Chennai").first()
            now = datetime.now(timezone.utc)

            alerts_to_add = []
            if cuddalore:
                alerts_to_add.append(Alert(
                    location_id=cuddalore.id,
                    hazard_type="heavy_rainfall",
                    severity="very_high",
                    description="Extremely Heavy Rainfall alert: Projected 24h accumulation is 218.4 mm, exceeding 204.4 mm threshold. Severe localized inundation expected in coastal lowlands.",
                    triggering_value=218.4,
                    threshold=204.4,
                    status="active",
                    is_simulated=True,
                    deduplication_key=f"demo_cuddalore_heavy_rainfall_{now.strftime('%Y%m%d')}",
                    created_at=now
                ))
                alerts_to_add.append(Alert(
                    location_id=cuddalore.id,
                    hazard_type="flood_condition",
                    severity="high",
                    description="High Flood Risk Index (0.84/1.00). Intense rain spells coupled with 1.0m ASL coastal elevation create acute inundation risk.",
                    triggering_value=0.84,
                    threshold=0.75,
                    status="active",
                    is_simulated=True,
                    deduplication_key=f"demo_cuddalore_flood_{now.strftime('%Y%m%d')}",
                    created_at=now
                ))
            if nagapattinam:
                alerts_to_add.append(Alert(
                    location_id=nagapattinam.id,
                    hazard_type="high_wind",
                    severity="high",
                    description="High Wind Warning: Peak wind gusts reaching 68.2 km/h (threshold 62.0 km/h). Fishermen advised not to venture into deep sea.",
                    triggering_value=68.2,
                    threshold=62.0,
                    status="active",
                    is_simulated=True,
                    deduplication_key=f"demo_nagapattinam_wind_{now.strftime('%Y%m%d')}",
                    created_at=now
                ))
            if chennai:
                alerts_to_add.append(Alert(
                    location_id=chennai.id,
                    hazard_type="heavy_rainfall",
                    severity="moderate",
                    description="Heavy Rainfall advisory: Projected 24h accumulation is 84.5 mm (threshold 64.5 mm). Urban waterlogging in low-lying subways possible.",
                    triggering_value=84.5,
                    threshold=64.5,
                    status="active",
                    is_simulated=True,
                    deduplication_key=f"demo_chennai_rain_{now.strftime('%Y%m%d')}",
                    created_at=now
                ))

            if alerts_to_add:
                db.add_all(alerts_to_add)
                db.commit()

    @staticmethod
    def sync_alerts_for_scenario(db: Session, scenario: str) -> List[Alert]:
        """
        Regenerates active alerts across districts based on the selected meteorological scenario.
        Marks previous active simulated alerts as resolved and generates scenario-specific hazard alerts.
        """
        from app.services.risk_engine import DisasterRiskEngine
        from app.services.weather_service import WeatherService

        # Mark all prior active simulated alerts as resolved
        db.query(Alert).filter(Alert.status == "active", Alert.is_simulated == True).update({"status": "resolved"})
        db.commit()

        if scenario == "normal":
            return []

        locations = db.query(Location).all()
        created_alerts = []
        now = datetime.now(timezone.utc)
        date_str = now.strftime("%Y%m%d%H%M")

        for loc in locations:
            sim = WeatherService.generate_simulated_weather_scenario(loc, now=now, scenario=scenario)
            flattened_points = []
            for pt in sim["points"]:
                ecmwf = pt["models"]["ECMWF"]
                flattened_points.append({
                    "rainfall": ecmwf["rainfall"],
                    "temperature": ecmwf["temperature"],
                    "wind_speed": ecmwf["wind_speed"],
                    "pressure": ecmwf["pressure"]
                })

            assessment = DisasterRiskEngine.evaluate_hazards(
                location=loc,
                forecast_points=flattened_points,
                data_status="simulated_demo",
                data_source=f"Scenario Blending Engine ({scenario})"
            )

            for hazard in assessment.hazards:
                if hazard.risk_level in ["moderate", "high", "very_high"]:
                    dedup_key = f"scen_{scenario}_{loc.id}_{hazard.hazard_type}_{date_str}"
                    alert = Alert(
                        location_id=loc.id,
                        hazard_type=hazard.hazard_type,
                        severity=hazard.risk_level,
                        description=hazard.explanation,
                        triggering_value=hazard.forecast_value,
                        threshold=hazard.trigger_threshold,
                        status="active",
                        is_simulated=True,
                        deduplication_key=dedup_key,
                        created_at=now
                    )
                    db.add(alert)
                    created_alerts.append(alert)

        if created_alerts:
            db.commit()
            for a in created_alerts:
                db.refresh(a)

        return created_alerts
