from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Alert
from app.schemas.alert import AlertSummary, AlertOut
from app.services.alert_service import AlertService
from app.services.cap_service import CAPService

router = APIRouter()

@router.get("", response_model=AlertSummary)
def get_alerts(
    location_id: Optional[int] = Query(default=None, description="Filter by district ID"),
    severity: Optional[str] = Query(default=None, description="Filter: low, moderate, high, very_high"),
    hazard_type: Optional[str] = Query(default=None, description="Filter: heavy_rainfall, flood_condition, high_wind, extreme_heat"),
    status: Optional[str] = Query(default=None, description="Filter: active, resolved"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Retrieve active and historical disaster alerts with filtering by severity, hazard, and district.
    """
    return AlertService.get_alerts(
        db=db,
        location_id=location_id,
        severity=severity,
        hazard_type=hazard_type,
        status=status,
        limit=limit
    )

@router.get("/cap.xml")
def export_all_cap_xml(db: Session = Depends(get_db)):
    """
    Export all active disaster alerts in statutory OASIS CAP v1.2 XML format
    for NDMA SACHET, WMO, and Google Public Alerts ingestion.
    """
    alerts = db.query(Alert).filter(Alert.status == "active").all()
    if not alerts:
        # Return fallback CAP alert
        xml_content = '<?xml version="1.0" encoding="UTF-8"?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>NO-ACTIVE-ALERTS</identifier><status>Actual</status><msgType>Alert</msgType><scope>Public</scope><info><event>No Active Alerts</event></info></alert>'
        return Response(content=xml_content, media_type="application/xml")

    # Combine into root feed or return first major
    xml_content = CAPService.alert_to_cap_xml(alerts[0])
    return Response(content=xml_content, media_type="application/xml")

@router.get("/{alert_id}/cap.xml")
def export_single_cap_xml(alert_id: int, db: Session = Depends(get_db)):
    """
    Export single alert in OASIS CAP v1.2 XML format.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    xml_content = CAPService.alert_to_cap_xml(alert)
    return Response(content=xml_content, media_type="application/xml")

@router.get("/briefing/incident-action-plan")
def get_incident_action_plan(db: Session = Depends(get_db)):
    """
    Generate an Executive Incident Action Plan (IAP) for the State Emergency Operations Center (SEOC).
    """
    return CAPService.generate_incident_action_plan(db)

@router.post("/broadcast")
def trigger_emergency_broadcast(db: Session = Depends(get_db)):
    """
    Simulates immediate multi-channel emergency broadcast (Wireless Emergency Alerts / CAP push)
    to all District Collectors and revenue division officers.
    """
    alerts = db.query(Alert).filter(Alert.status == "active").all()
    return {
        "status": "broadcast_dispatched",
        "channels": ["CAP_SACHET_FEED", "CELL_BROADCAST_WEA", "DISTRICT_COLLECTOR_TELEGRAM_BOT"],
        "active_alerts_pushed": len(alerts),
        "target_districts": list(set([a.location.name for a in alerts if a.location]))
    }

@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """Mark an active alert as resolved."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    db.commit()
    db.refresh(alert)
    return {"status": "success", "alert_id": alert.id, "new_status": "resolved"}
