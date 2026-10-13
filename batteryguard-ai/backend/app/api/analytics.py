from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.models import Battery, TestSession, TestResult, Alert, Device
from app.schemas.schemas import DashboardStatsResponse

router = APIRouter(prefix="/analytics", tags=["Analytics & Insights"])

@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_batteries = db.query(Battery).count()
    total_tests = db.query(TestSession).filter(TestSession.status == "completed").count()

    good_count = db.query(TestResult).filter(TestResult.screening_category == "GOOD").count()
    review_count = db.query(TestResult).filter(TestResult.screening_category == "REVIEW").count()
    degraded_count = db.query(TestResult).filter(TestResult.screening_category == "DEGRADED").count()
    critical_count = db.query(TestResult).filter(TestResult.screening_category == "CRITICAL").count()

    critical_alerts = db.query(Alert).filter(Alert.severity == "CRITICAL", Alert.acknowledged == False).count()
    connected_devices = db.query(Device).filter(Device.status.in_(["connected", "simulation"])).count()

    # Recent completed tests (limit 6)
    recent_sessions = (
        db.query(TestSession)
        .order_by(TestSession.start_time.desc())
        .limit(6)
        .all()
    )

    recent_activity = []
    for s in recent_sessions:
        recent_activity.append({
            "id": s.id,
            "test_id": s.test_id,
            "battery_id": s.battery_id,
            "battery_code": s.battery.battery_id if s.battery else "N/A",
            "technician_name": s.technician.full_name if s.technician else "Automated Lab Tech",
            "profile_name": s.profile.name if s.profile else "Standard Screening",
            "mode": s.mode,
            "scenario": s.scenario,
            "status": s.status,
            "start_time": s.start_time,
            "duration_sec": s.duration_sec,
            "screening_category": s.result.screening_category if s.result else "PENDING",
            "voltage": s.result.loaded_voltage if s.result else (s.battery.nominal_voltage if s.battery else 48.0),
            "temperature": s.result.final_temp_c if s.result else 25.0,
            "anomaly_count": s.result.anomaly_count if s.result else 0
        })

    # Recent alerts
    recent_alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .limit(5)
        .all()
    )
    alerts_list = [
        {
            "id": a.id,
            "severity": a.severity,
            "category": a.category,
            "message": a.message,
            "battery_code": a.battery.battery_id if a.battery else "System",
            "acknowledged": a.acknowledged,
            "created_at": a.created_at
        }
        for a in recent_alerts
    ]

    return {
        "total_batteries": total_batteries,
        "total_completed_tests": total_tests,
        "good_screening_count": good_count,
        "review_screening_count": review_count,
        "degraded_screening_count": degraded_count,
        "critical_screening_count": critical_count,
        "critical_alerts_count": critical_alerts,
        "connected_devices_count": connected_devices,
        "screening_distribution": [
            {"name": "GOOD", "value": good_count, "color": "#10B981"},
            {"name": "REVIEW", "value": review_count, "color": "#F59E0B"},
            {"name": "DEGRADED", "value": degraded_count, "color": "#F97316"},
            {"name": "CRITICAL", "value": critical_count, "color": "#EF4444"},
        ],
        "recent_activity": recent_activity,
        "recent_alerts": alerts_list
    }

@router.get("/trends")
def get_historical_trends(db: Session = Depends(get_db)):
    """Fetch test results chronologically to plot historical health and sag metrics."""
    results = (
        db.query(TestResult, TestSession)
        .join(TestSession, TestResult.test_session_id == TestSession.id)
        .order_by(TestSession.start_time.asc())
        .limit(50)
        .all()
    )

    trend_points = []
    for res, session in results:
        trend_points.append({
            "test_id": session.test_id,
            "battery_code": session.battery.battery_id if session.battery else "N/A",
            "date": session.start_time.strftime("%b %d, %H:%M"),
            "resting_voltage": res.resting_voltage,
            "loaded_voltage": res.loaded_voltage,
            "voltage_sag_percent": res.voltage_sag_percent,
            "initial_temp_c": res.initial_temp_c,
            "final_temp_c": res.final_temp_c,
            "temp_change_c": res.temp_change_c,
            "internal_resistance_m_ohm": res.internal_resistance_m_ohm,
            "category": res.screening_category,
            "anomalies": res.anomaly_count
        })

    return {"trends": trend_points}

@router.get("/compare")
def compare_sessions(session_a_id: int, session_b_id: int, db: Session = Depends(get_db)):
    """Compare two test sessions side by side."""
    s_a = db.query(TestSession).filter(TestSession.id == session_a_id).first()
    s_b = db.query(TestSession).filter(TestSession.id == session_b_id).first()

    if not s_a or not s_b:
        return {"error": "One or both test sessions not found"}

    def format_session(s):
        r = s.result
        return {
            "test_id": s.test_id,
            "battery_code": s.battery.battery_id if s.battery else "N/A",
            "chemistry": s.battery.chemistry if s.battery else "N/A",
            "profile": s.profile.name if s.profile else "Standard",
            "mode": s.mode,
            "duration": s.duration_sec,
            "screening_category": r.screening_category if r else "N/A",
            "resting_voltage": r.resting_voltage if r else 0,
            "loaded_voltage": r.loaded_voltage if r else 0,
            "voltage_sag_percent": r.voltage_sag_percent if r else 0,
            "temp_change_c": r.temp_change_c if r else 0,
            "internal_resistance_m_ohm": r.internal_resistance_m_ohm if r else 0,
            "voltage_stability_std": r.voltage_stability_std if r else 0,
            "anomaly_count": r.anomaly_count if r else 0
        }

    return {
        "session_a": format_session(s_a),
        "session_b": format_session(s_b)
    }
