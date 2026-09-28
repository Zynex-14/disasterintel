import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.db.models import Alert, Location

class CAPService:
    """
    OASIS Common Alerting Protocol (CAP v1.2) Generator.
    Statutory XML standard utilized by NDMA SACHET, WMO Alert Hub, and Google Public Alerts.
    """
    
    @staticmethod
    def alert_to_cap_xml(alert: Alert, location: Optional[Location] = None) -> str:
        """
        Converts a single internal Alert into an OASIS CAP v1.2 compliant XML string.
        """
        loc_name = location.name if location else (alert.location.name if alert.location else "Tamil Nadu")
        loc_lat = location.latitude if location else (alert.location.latitude if alert.location else 11.5)
        loc_lon = location.longitude if location else (alert.location.longitude if alert.location else 79.5)
        state_name = location.state if location else "Tamil Nadu"

        # Severity mapping to CAP standards
        cap_severity_map = {
            "very_high": "Extreme",
            "high": "Severe",
            "moderate": "Moderate",
            "low": "Minor"
        }
        cap_severity = cap_severity_map.get(alert.severity.lower(), "Severe")

        # Color code mapping
        color_code_map = {
            "very_high": "RED",
            "high": "ORANGE",
            "moderate": "YELLOW",
            "low": "GREEN"
        }
        color_code = color_code_map.get(alert.severity.lower(), "YELLOW")

        # Urgency & Certainty
        urgency = "Immediate" if alert.severity in ["very_high", "high"] else "Expected"
        certainty = "Observed" if not alert.is_simulated else "Likely"

        sent_iso = (alert.created_at or datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%S+05:30")
        identifier = f"DISASTERINTEL-{alert.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        root = ET.Element("alert", xmlns="urn:oasis:names:tc:emergency:cap:1.2")
        ET.SubElement(root, "identifier").text = identifier
        ET.SubElement(root, "sender").text = "seoc.disasterintel@tn.gov.in"
        ET.SubElement(root, "sent").text = sent_iso
        ET.SubElement(root, "status").text = "Actual" if not alert.is_simulated else "Exercise"
        ET.SubElement(root, "msgType").text = "Alert"
        ET.SubElement(root, "scope").text = "Public"
        ET.SubElement(root, "code").text = "IMD_SACHET_V1"

        info = ET.SubElement(root, "info")
        ET.SubElement(info, "category").text = "Met"
        ET.SubElement(info, "event").text = f"{alert.hazard_type.replace('_', ' ').title()} Warning"
        ET.SubElement(info, "urgency").text = urgency
        ET.SubElement(info, "severity").text = cap_severity
        ET.SubElement(info, "certainty").text = certainty

        # Event Codes
        event_code = ET.SubElement(info, "eventCode")
        ET.SubElement(event_code, "valueName").text = "IMD_COLOR_CODE"
        ET.SubElement(event_code, "value").text = color_code

        ET.SubElement(info, "headline").text = f"{color_code} Alert: {alert.hazard_type.replace('_', ' ').title()} in {loc_name}"
        ET.SubElement(info, "description").text = alert.description
        
        # Statutory Action Instructions
        if alert.hazard_type == "heavy_rainfall":
            instruction = "Evacuate identified flood-prone habitations. Activate district shelter centers. Fishermen suspended from sailing. Call 1077 for emergency rescue."
        elif alert.hazard_type == "extreme_heat":
            instruction = "Avoid direct sun exposure between 11:00 AM and 04:00 PM. Maintain adequate hydration. Establish district ORS distribution kiosks."
        elif alert.hazard_type == "high_wind":
            instruction = "Secure loose hoarding structures and tin roofs. Avoid sheltering under large trees or electrical transmission towers."
        else:
            instruction = "Adhere strictly to official State Disaster Management Authority guidelines. Monitor local revenue department advisories."
        ET.SubElement(info, "instruction").text = instruction

        area = ET.SubElement(info, "area")
        ET.SubElement(area, "areaDesc").text = f"{loc_name}, {state_name}, India"
        ET.SubElement(area, "circle").text = f"{loc_lat:.4f},{loc_lon:.4f},35.0"

        return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")

    @staticmethod
    def generate_incident_action_plan(db: Session) -> Dict[str, Any]:
        """
        Generates comprehensive Incident Action Plan (IAP) for State Emergency Operations Center.
        """
        alerts = db.query(Alert).filter(Alert.status == "active").all()
        now = datetime.now(timezone.utc)
        
        critical_districts = []
        action_items = []

        for a in alerts:
            loc_name = a.location.name if a.location else "Unknown"
            if a.severity in ["very_high", "high"] and loc_name not in critical_districts:
                critical_districts.append(loc_name)

        if "Cuddalore" in critical_districts or "Nagapattinam" in critical_districts or "Chennai" in critical_districts:
            action_items.extend([
                {"dept": "Revenue & Disaster Management", "action": "Stage NDRF 04th Battalion & SDRF teams in coastal staging areas."},
                {"dept": "Public Works & Water Resources", "action": "Inspect sluice gates across Chembarambakkam, Veeranam, and Poondi reservoirs."},
                {"dept": "Greater Chennai Corporation / Municipalities", "action": "Deploy high-capacity diesel dewatering pumps at 42 critical subway crossings."},
                {"dept": "Fisheries Department", "action": "Issue total sea-venturing moratorium across Coromandel coastline."},
                {"dept": "Health Department", "action": "Pre-position antivenom, ORS kits, and mobile emergency trauma ambulances."}
            ])
        else:
            action_items.extend([
                {"dept": "Public Health", "action": "Issue community heat advisory and monitor vulnerable populations."},
                {"dept": "District Revenue", "action": "Maintain active watch on regional weather telemetry and fire prevention units."}
            ])

        return {
            "iap_id": f"IAP-TN-{now.strftime('%Y%m%d%H%M')}",
            "generated_at": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "operational_period": f"{now.strftime('%d %b %Y 06:00')} to {(now).strftime('%d %b %Y 18:00')} IST",
            "incident_name": "Tamil Nadu Synoptic Multi-Hazard Response",
            "incident_commander": "State Relief Commissioner & Additional Chief Secretary",
            "total_active_alerts": len(alerts),
            "priority_districts": critical_districts,
            "tactical_action_directives": action_items,
            "statutory_reference": "National Disaster Management Act, 2005 (Sections 22, 24 & 30)"
        }
