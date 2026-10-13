import json
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import TestSession, Battery, TestResult, SensorReading
from app.reports.pdf_generator import PDFReportGenerator
from app.reports.csv_generator import CSVReportGenerator

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/pdf/{test_id}")
def download_pdf_report(test_id: str, db: Session = Depends(get_db)):
    session = db.query(TestSession).filter(TestSession.test_id == test_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Test session not found")

    res = session.result
    if not res:
        raise HTTPException(status_code=400, detail="Test results have not been calculated for this session")

    # Parse JSON fields
    try:
        anomalies = json.loads(res.anomalies_json) if res.anomalies_json else []
    except Exception:
        anomalies = []
    try:
        triggered_rules = json.loads(res.triggered_rules_json) if res.triggered_rules_json else []
    except Exception:
        triggered_rules = []

    session_data = {
        "test_id": session.test_id,
        "mode": session.mode,
        "duration_sec": session.duration_sec,
        "technician_name": session.technician.full_name if session.technician else "Automated Lab Tech",
        "created_at": session.created_at.strftime("%Y-%m-%d %H:%M")
    }

    battery_data = {
        "battery_id": session.battery.battery_id if session.battery else "N/A",
        "manufacturer": session.battery.manufacturer if session.battery else "Unknown",
        "model": session.battery.model if session.battery else "Unknown",
        "chemistry": session.battery.chemistry if session.battery else "Unknown",
        "nominal_voltage": session.battery.nominal_voltage if session.battery else 48.0,
        "capacity_ah": session.battery.capacity_ah if session.battery else "N/A"
    }

    profile_data = {
        "name": session.profile.name if session.profile else "Standard Screening",
        "voltage_cutoff_v": session.profile.voltage_cutoff_v if session.profile else 36.0,
        "max_sag_percent_limit": session.profile.max_sag_percent_limit if session.profile else 10.0,
        "max_temp_rise_limit_c": session.profile.max_temp_rise_limit_c if session.profile else 8.0,
    }

    result_data = {
        "screening_category": res.screening_category,
        "resting_voltage": res.resting_voltage,
        "loaded_voltage": res.loaded_voltage,
        "voltage_sag_percent": res.voltage_sag_percent,
        "initial_temp_c": res.initial_temp_c,
        "final_temp_c": res.final_temp_c,
        "temp_change_c": res.temp_change_c,
        "internal_resistance_m_ohm": res.internal_resistance_m_ohm,
        "voltage_stability_std": res.voltage_stability_std,
        "anomaly_count": res.anomaly_count,
        "anomalies": anomalies,
        "triggered_rules": triggered_rules,
        "recommendations": res.recommendations,
        "disclaimer": res.disclaimer
    }

    pdf_bytes = PDFReportGenerator.generate_report(
        session_data=session_data,
        battery_data=battery_data,
        result_data=result_data,
        profile_data=profile_data,
        readings_summary={"count": len(session.readings)}
    )

    filename = f"BatteryGuard_Report_{session.test_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/csv/readings/{test_id}")
def download_readings_csv(test_id: str, db: Session = Depends(get_db)):
    session = db.query(TestSession).filter(TestSession.test_id == test_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Test session not found")

    readings = [
        {
            "reading_index": r.reading_index,
            "timestamp_offset_ms": r.timestamp_offset_ms,
            "pack_voltage": r.pack_voltage,
            "current_amps": r.current_amps,
            "temperature_c": r.temperature_c,
            "phase": r.phase
        }
        for r in session.readings
    ]

    csv_data = CSVReportGenerator.generate_readings_csv(readings)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Readings_{test_id}.csv"}
    )

@router.get("/csv/batteries")
def download_batteries_csv(db: Session = Depends(get_db)):
    batteries = db.query(Battery).all()
    b_list = [
        {
            "battery_id": b.battery_id,
            "manufacturer": b.manufacturer,
            "model": b.model,
            "chemistry": b.chemistry,
            "nominal_voltage": b.nominal_voltage,
            "capacity_ah": b.capacity_ah,
            "status": b.status,
            "test_count": len(b.test_sessions)
        }
        for b in batteries
    ]
    csv_data = CSVReportGenerator.generate_batteries_csv(b_list)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=BatteryGuard_Batteries.csv"}
    )
