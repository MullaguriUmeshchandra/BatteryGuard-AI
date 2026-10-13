import json
import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import (
    TestSession, TestProfile, Battery, SensorReading, TestResult, Alert, AuditEvent, User
)
from app.schemas.schemas import (
    TestProfileResponse, TestSessionResponse, TestSessionDetailResponse,
    TestSaveRequest, SensorReadingResponse
)
from app.services.auth import get_current_user
from app.diagnostics.engine import DiagnosticEngine
from app.simulation.engine import SimulationEngine
from app.ml.anomaly_detector import ExperimentalMLDetector

router = APIRouter(prefix="/tests", tags=["Diagnostic Testing"])

@router.get("/profiles", response_model=List[TestProfileResponse])
def get_test_profiles(db: Session = Depends(get_db)):
    return db.query(TestProfile).filter(TestProfile.is_active == True).all()

@router.post("/simulate")
def run_simulation(
    battery_id: int,
    profile_id: int,
    scenario: str = "normal",
    duration_sec: float = 30.0,
    db: Session = Depends(get_db)
):
    battery = db.query(Battery).filter(Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")

    profile = db.query(TestProfile).filter(TestProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Test Profile not found")

    # Generate telemetry stream
    readings = SimulationEngine.generate_full_session(
        nominal_voltage=battery.nominal_voltage,
        load_current=profile.load_current_amps,
        scenario=scenario,
        duration_sec=duration_sec,
        sample_rate_hz=profile.sample_rate_hz
    )

    # Perform diagnostic analysis
    analysis = DiagnosticEngine.evaluate_telemetry(readings, profile, battery.nominal_voltage)

    # Optional experimental ML evaluation
    ml_eval = ExperimentalMLDetector.evaluate(
        voltage_sag_percent=analysis["voltage_sag_percent"],
        temp_change_c=analysis["temp_change_c"],
        internal_resistance_m_ohm=analysis["internal_resistance_m_ohm"],
        voltage_stability_std=analysis["voltage_stability_std"]
    )
    analysis["ml_anomaly_score"] = ml_eval.get("ml_anomaly_score")
    analysis["ml_is_anomaly"] = ml_eval.get("ml_is_anomaly")

    return {
        "scenario": scenario,
        "battery_id": battery.battery_id,
        "profile_name": profile.name,
        "duration_sec": duration_sec,
        "reading_count": len(readings),
        "readings": readings,
        "analysis": analysis
    }

@router.get("/simulate/tick")
def get_simulation_tick(
    index: int = 0,
    nominal_voltage: float = 48.0,
    load_current: float = 20.0,
    scenario: str = "normal",
    phase: str = "sustained_load",
    prev_temp: float = 25.0
):
    reading = SimulationEngine.generate_single_reading(
        index=index,
        nominal_voltage=nominal_voltage,
        load_current=load_current,
        scenario=scenario,
        phase=phase,
        prev_temp=prev_temp
    )
    return reading

@router.post("/save", response_model=TestSessionDetailResponse)
def save_test_session(
    data: TestSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    battery = db.query(Battery).filter(Battery.id == data.battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")

    profile = db.query(TestProfile).filter(TestProfile.id == data.profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Test Profile not found")

    # Generate unique test code
    count = db.query(TestSession).count() + 1
    test_id = f"TST-{datetime.datetime.utcnow().strftime('%Y%m')}-{count:04d}"

    session = TestSession(
        test_id=test_id,
        battery_id=battery.id,
        technician_id=current_user.id,
        profile_id=profile.id,
        mode=data.mode,
        scenario=data.scenario or "normal",
        status="completed",
        start_time=datetime.datetime.utcnow() - datetime.timedelta(seconds=data.duration_sec),
        end_time=datetime.datetime.utcnow(),
        duration_sec=data.duration_sec,
        notes=data.notes
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Save sensor readings
    reading_dicts = []
    for r in data.readings:
        r_dict = r.dict()
        reading_dicts.append(r_dict)
        db_reading = SensorReading(
            test_session_id=session.id,
            timestamp_offset_ms=r.timestamp_offset_ms,
            pack_voltage=r.pack_voltage,
            current_amps=r.current_amps,
            temperature_c=r.temperature_c,
            phase=r.phase,
            reading_index=r.reading_index
        )
        db.add(db_reading)
    db.commit()

    # Calculate diagnostics
    diag = DiagnosticEngine.evaluate_telemetry(reading_dicts, profile, battery.nominal_voltage)
    
    # ML detection
    ml_eval = ExperimentalMLDetector.evaluate(
        voltage_sag_percent=diag["voltage_sag_percent"],
        temp_change_c=diag["temp_change_c"],
        internal_resistance_m_ohm=diag["internal_resistance_m_ohm"],
        voltage_stability_std=diag["voltage_stability_std"]
    )

    test_result = TestResult(
        test_session_id=session.id,
        screening_category=diag["screening_category"],
        resting_voltage=diag["resting_voltage"],
        loaded_voltage=diag["loaded_voltage"],
        voltage_sag_percent=diag["voltage_sag_percent"],
        initial_temp_c=diag["initial_temp_c"],
        final_temp_c=diag["final_temp_c"],
        temp_change_c=diag["temp_change_c"],
        internal_resistance_m_ohm=diag["internal_resistance_m_ohm"],
        voltage_stability_std=diag["voltage_stability_std"],
        anomaly_count=diag["anomaly_count"],
        anomalies_json=json.dumps(diag["anomalies"]),
        triggered_rules_json=json.dumps(diag["triggered_rules"]),
        recommendations=diag["recommendations"],
        disclaimer=diag["disclaimer"],
        ml_anomaly_score=ml_eval.get("ml_anomaly_score"),
        ml_is_anomaly=ml_eval.get("ml_is_anomaly", False)
    )
    db.add(test_result)

    # Update battery status based on screening outcome
    if diag["screening_category"] == "CRITICAL":
        battery.status = "Quarantined"
        alert = Alert(
            test_session_id=session.id,
            battery_id=battery.id,
            severity="CRITICAL",
            category="Critical Screening Limit",
            message=f"Battery {battery.battery_id} triggered CRITICAL safety threshold during {test_id}. Immediate inspection needed."
        )
        db.add(alert)
    elif diag["screening_category"] in ("DEGRADED", "REVIEW"):
        battery.status = "Needs Review"
        alert = Alert(
            test_session_id=session.id,
            battery_id=battery.id,
            severity="WARNING" if diag["screening_category"] == "DEGRADED" else "INFO",
            category=f"{diag['screening_category']} Result",
            message=f"Battery {battery.battery_id} screening completed with status {diag['screening_category']} in test {test_id}."
        )
        db.add(alert)
    else:
        battery.status = "Active"

    db.commit()
    db.refresh(session)

    return get_test_session_detail(session.id, db)

@router.get("", response_model=List[TestSessionResponse])
def get_test_sessions(
    search: Optional[str] = None,
    category: Optional[str] = None,
    mode: Optional[str] = None,
    battery_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(TestSession).order_by(TestSession.start_time.desc())

    if battery_id:
        query = query.filter(TestSession.battery_id == battery_id)

    if mode and mode != "All":
        query = query.filter(TestSession.mode == mode)

    sessions = query.offset(offset).limit(limit).all()

    results = []
    for s in sessions:
        cat = s.result.screening_category if s.result else None
        if category and category != "All" and cat != category:
            continue
        anom = s.result.anomaly_count if s.result else 0
        b_code = s.battery.battery_id if s.battery else "N/A"
        tech_name = s.technician.full_name if s.technician else "Automated Lab Tech"
        prof_name = s.profile.name if s.profile else "Standard 1C Screening"

        if search:
            s_low = search.lower()
            if (s_low not in s.test_id.lower() and
                s_low not in b_code.lower() and
                s_low not in tech_name.lower()):
                continue

        results.append({
            "id": s.id,
            "test_id": s.test_id,
            "battery_id": s.battery_id,
            "battery_code": b_code,
            "technician_name": tech_name,
            "profile_name": prof_name,
            "mode": s.mode,
            "scenario": s.scenario,
            "status": s.status,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "duration_sec": s.duration_sec,
            "screening_category": cat,
            "anomaly_count": anom,
            "created_at": s.created_at
        })

    return results

@router.get("/{id}", response_model=TestSessionDetailResponse)
def get_test_session_detail(id: int, db: Session = Depends(get_db)):
    session = db.query(TestSession).filter(TestSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Test session not found")

    res = session.result
    result_dict = None
    if res:
        try:
            anomalies = json.loads(res.anomalies_json) if res.anomalies_json else []
        except Exception:
            anomalies = []
        try:
            triggered_rules = json.loads(res.triggered_rules_json) if res.triggered_rules_json else []
        except Exception:
            triggered_rules = []

        result_dict = {
            "id": res.id,
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
            "disclaimer": res.disclaimer,
            "ml_anomaly_score": res.ml_anomaly_score,
            "ml_is_anomaly": res.ml_is_anomaly,
            "created_at": res.created_at
        }

    readings = [
        {
            "id": r.id,
            "timestamp_offset_ms": r.timestamp_offset_ms,
            "pack_voltage": r.pack_voltage,
            "current_amps": r.current_amps,
            "temperature_c": r.temperature_c,
            "phase": r.phase,
            "reading_index": r.reading_index
        }
        for r in session.readings
    ]

    return {
        "id": session.id,
        "test_id": session.test_id,
        "battery_id": session.battery_id,
        "battery_code": session.battery.battery_id if session.battery else "N/A",
        "technician_name": session.technician.full_name if session.technician else "Automated Lab Tech",
        "profile_name": session.profile.name if session.profile else "Standard 1C Screening",
        "mode": session.mode,
        "scenario": session.scenario,
        "status": session.status,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "duration_sec": session.duration_sec,
        "screening_category": res.screening_category if res else None,
        "anomaly_count": res.anomaly_count if res else 0,
        "created_at": session.created_at,
        "readings": readings,
        "result": result_dict,
        "battery": session.battery,
        "profile": session.profile
    }
