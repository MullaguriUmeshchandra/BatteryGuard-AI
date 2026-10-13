import datetime
import json
from sqlalchemy.orm import Session
from app.models.models import (
    User, Battery, Device, TestProfile, TestSession, SensorReading, TestResult, Alert, AuditEvent
)
from app.services.auth import get_password_hash
from app.simulation.engine import SimulationEngine
from app.diagnostics.engine import DiagnosticEngine
from app.ml.anomaly_detector import ExperimentalMLDetector

def seed_database(db: Session):
    """Seed database with realistic EV battery testing records, profiles, and accounts."""
    # Check if already seeded
    if db.query(User).first() is not None:
        return

    print("Initializing BatteryGuard AI database seed...")

    # 1. Users
    admin_user = User(
        email="admin@batteryguard.ai",
        hashed_password=get_password_hash("Admin@123456"),
        full_name="Dr. Alex Rivera (Lead Engineer)",
        role="admin",
        is_active=True
    )
    tech_user = User(
        email="tech@batteryguard.ai",
        hashed_password=get_password_hash("Tech@123456"),
        full_name="Sarah Chen (Diagnostic Technician)",
        role="technician",
        is_active=True
    )
    db.add_all([admin_user, tech_user])
    db.commit()
    db.refresh(admin_user)
    db.refresh(tech_user)

    # 2. Test Profiles
    profiles_data = [
        {
            "name": "Standard 1C Screening",
            "code": "PROF-STD-1C",
            "description": "General first-level screening cycle with 20A pulsed and continuous load phases.",
            "load_current_amps": 20.0,
            "pulse_duration_sec": 5.0,
            "sustained_duration_sec": 20.0,
            "resting_duration_sec": 5.0,
            "sample_rate_hz": 2.0,
            "max_temp_limit_c": 50.0,
            "max_temp_rise_limit_c": 8.0,
            "max_sag_percent_limit": 10.0,
            "voltage_cutoff_v": 36.0,
            "is_active": True
        },
        {
            "name": "Rapid Pulse Discharge",
            "code": "PROF-PULSE-HIGH",
            "description": "High-current transient response screening to detect cell interconnect impedance.",
            "load_current_amps": 35.0,
            "pulse_duration_sec": 8.0,
            "sustained_duration_sec": 12.0,
            "resting_duration_sec": 5.0,
            "sample_rate_hz": 4.0,
            "max_temp_limit_c": 55.0,
            "max_temp_rise_limit_c": 10.0,
            "max_sag_percent_limit": 14.0,
            "voltage_cutoff_v": 35.0,
            "is_active": True
        },
        {
            "name": "Thermal Stress Profile",
            "code": "PROF-THERMAL-STRESS",
            "description": "Extended continuous discharge to evaluate heat dissipation efficiency and thermal stability.",
            "load_current_amps": 25.0,
            "pulse_duration_sec": 5.0,
            "sustained_duration_sec": 30.0,
            "resting_duration_sec": 5.0,
            "sample_rate_hz": 2.0,
            "max_temp_limit_c": 48.0,
            "max_temp_rise_limit_c": 6.5,
            "max_sag_percent_limit": 12.0,
            "voltage_cutoff_v": 38.0,
            "is_active": True
        },
        {
            "name": "Low-Current Baseline",
            "code": "PROF-LOW-BASELINE",
            "description": "Gentle screening cycle for suspected degraded packs or cold ambient conditions.",
            "load_current_amps": 10.0,
            "pulse_duration_sec": 5.0,
            "sustained_duration_sec": 15.0,
            "resting_duration_sec": 5.0,
            "sample_rate_hz": 1.0,
            "max_temp_limit_c": 42.0,
            "max_temp_rise_limit_c": 4.0,
            "max_sag_percent_limit": 6.0,
            "voltage_cutoff_v": 40.0,
            "is_active": True
        }
    ]
    created_profiles = []
    for p_info in profiles_data:
        p = TestProfile(**p_info)
        db.add(p)
        created_profiles.append(p)
    db.commit()
    for p in created_profiles:
        db.refresh(p)

    std_profile = created_profiles[0]

    # 3. Devices
    devices_data = [
        {
            "device_id": "ESP32-STATION-01",
            "name": "Lab Test Bench A (ESP32-S3)",
            "communication_type": "esp32_wifi",
            "status": "connected",
            "ip_address": "192.168.1.140",
            "firmware_version": "v2.1.0-batteryguard",
            "assigned_battery_id": "BAT-2024-001"
        },
        {
            "device_id": "ESP32-MOBILE-02",
            "name": "Field Screener BLE (ESP32-C3)",
            "communication_type": "esp32_ble",
            "status": "idle",
            "ip_address": "N/A (BLE MAC 4C:11:AE:0D:98:21)",
            "firmware_version": "v1.8.4",
            "assigned_battery_id": None
        },
        {
            "device_id": "ESP32-SIM-VIRTUAL",
            "name": "Simulated Benchtop Adapter",
            "communication_type": "virtual_adapter",
            "status": "simulation",
            "ip_address": "127.0.0.1:8000",
            "firmware_version": "v3.0.0-sim",
            "assigned_battery_id": "BAT-2024-002"
        }
    ]
    for d_info in devices_data:
        d = Device(**d_info)
        db.add(d)
    db.commit()

    # 4. EV Batteries
    batteries_data = [
        {
            "battery_id": "BAT-2024-001",
            "manufacturer": "Tesla / CATL",
            "model": "Model 3 SR+ LFP Pack",
            "chemistry": "LFP",
            "nominal_voltage": 48.0,
            "capacity_ah": 60.0,
            "mfg_date": "2023-04-12",
            "commissioning_date": "2023-06-01",
            "condition_notes": "First-life evaluation from fleet trial. Pristine visual condition.",
            "assigned_technician": "Sarah Chen",
            "status": "Active"
        },
        {
            "battery_id": "BAT-2024-002",
            "manufacturer": "BYD",
            "model": "Blade LFP 100Ah Module",
            "chemistry": "LFP",
            "nominal_voltage": 48.0,
            "capacity_ah": 100.0,
            "mfg_date": "2023-09-18",
            "commissioning_date": "2023-11-05",
            "condition_notes": "Tested for energy storage second-life repurposing.",
            "assigned_technician": "Sarah Chen",
            "status": "Active"
        },
        {
            "battery_id": "BAT-2024-003",
            "manufacturer": "Nissan / AESC",
            "model": "Leaf Gen2 NMC Module",
            "chemistry": "NMC",
            "nominal_voltage": 48.0,
            "capacity_ah": 40.0,
            "mfg_date": "2021-02-10",
            "commissioning_date": "2021-05-15",
            "condition_notes": "Moderate cell voltage discrepancy observed during passive rest.",
            "assigned_technician": "Dr. Alex Rivera",
            "status": "Needs Review"
        },
        {
            "battery_id": "BAT-2024-004",
            "manufacturer": "LG Energy Solution",
            "model": "E63 Pouch Array",
            "chemistry": "NMC",
            "nominal_voltage": 48.0,
            "capacity_ah": 63.0,
            "mfg_date": "2020-11-02",
            "commissioning_date": "2021-01-20",
            "condition_notes": "Recovered from vehicle accident. Visible indentation on corner casing.",
            "assigned_technician": "Dr. Alex Rivera",
            "status": "Quarantined"
        },
        {
            "battery_id": "BAT-2024-005",
            "manufacturer": "Ather Energy",
            "model": "450X Gen3 Smart Pack",
            "chemistry": "NMC",
            "nominal_voltage": 51.1,
            "capacity_ah": 65.0,
            "mfg_date": "2023-01-15",
            "commissioning_date": "2023-03-10",
            "condition_notes": "Two-wheeler commercial delivery fleet return.",
            "assigned_technician": "Sarah Chen",
            "status": "Needs Review"
        },
        {
            "battery_id": "BAT-2024-006",
            "manufacturer": "Samsung SDI",
            "model": "SDI 94Ah Prismatic Module",
            "chemistry": "NCA",
            "nominal_voltage": 48.0,
            "capacity_ah": 94.0,
            "mfg_date": "2022-08-30",
            "commissioning_date": "2022-10-14",
            "condition_notes": "Clean high-capacity module undergoing baseline cycle screening.",
            "assigned_technician": "Sarah Chen",
            "status": "Active"
        }
    ]

    created_batteries = []
    for b_info in batteries_data:
        b = Battery(**b_info)
        db.add(b)
        created_batteries.append(b)
    db.commit()
    for b in created_batteries:
        db.refresh(b)

    # 5. Generate Realistic Historical Test Sessions & Results
    sessions_seed = [
        # (battery_idx, scenario, profile, days_ago)
        (0, "normal", created_profiles[0], 5),
        (1, "normal", created_profiles[0], 4),
        (2, "voltage_instability", created_profiles[0], 3),
        (3, "critical_cutoff", created_profiles[1], 2),
        (4, "elevated_temp", created_profiles[2], 1),
    ]

    for idx, (b_idx, scenario, prof, days_ago) in enumerate(sessions_seed, start=1):
        target_battery = created_batteries[b_idx]
        test_code = f"TST-202409-{idx:04d}"
        session_time = datetime.datetime.utcnow() - datetime.timedelta(days=days_ago, hours=2 * idx)

        # Generate telemetry
        readings = SimulationEngine.generate_full_session(
            nominal_voltage=target_battery.nominal_voltage,
            load_current=prof.load_current_amps,
            scenario=scenario,
            duration_sec=30.0,
            sample_rate_hz=prof.sample_rate_hz
        )

        test_session = TestSession(
            test_id=test_code,
            battery_id=target_battery.id,
            technician_id=tech_user.id if idx % 2 == 0 else admin_user.id,
            profile_id=prof.id,
            mode="simulation",
            scenario=scenario,
            status="completed",
            start_time=session_time,
            end_time=session_time + datetime.timedelta(seconds=30),
            duration_sec=30.0,
            notes=f"Automated initial screening for {target_battery.battery_id} using profile {prof.name}."
        )
        db.add(test_session)
        db.commit()
        db.refresh(test_session)

        # Store readings
        for r in readings:
            db_reading = SensorReading(
                test_session_id=test_session.id,
                timestamp_offset_ms=r["timestamp_offset_ms"],
                pack_voltage=r["pack_voltage"],
                current_amps=r["current_amps"],
                temperature_c=r["temperature_c"],
                phase=r["phase"],
                reading_index=r["reading_index"]
            )
            db.add(db_reading)
        db.commit()

        # Calculate diagnostics
        diag = DiagnosticEngine.evaluate_telemetry(readings, prof, target_battery.nominal_voltage)
        ml_eval = ExperimentalMLDetector.evaluate(
            voltage_sag_percent=diag["voltage_sag_percent"],
            temp_change_c=diag["temp_change_c"],
            internal_resistance_m_ohm=diag["internal_resistance_m_ohm"],
            voltage_stability_std=diag["voltage_stability_std"]
        )

        test_result = TestResult(
            test_session_id=test_session.id,
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

        # Generate alert if required
        if diag["screening_category"] == "CRITICAL":
            alert = Alert(
                test_session_id=test_session.id,
                battery_id=target_battery.id,
                severity="CRITICAL",
                category="Safety Cutoff Breached",
                message=f"CRITICAL under-voltage / thermal hazard recorded on {target_battery.battery_id} during {test_code}.",
                acknowledged=False,
                created_at=session_time
            )
            db.add(alert)
        elif diag["screening_category"] in ("DEGRADED", "REVIEW"):
            alert = Alert(
                test_session_id=test_session.id,
                battery_id=target_battery.id,
                severity="WARNING" if diag["screening_category"] == "DEGRADED" else "INFO",
                category="Abnormal Screening Metrics",
                message=f"Screening outcome '{diag['screening_category']}' on {target_battery.battery_id}. Recommended for secondary evaluation.",
                acknowledged=True if idx == 3 else False,
                acknowledged_by="Dr. Alex Rivera" if idx == 3 else None,
                acknowledged_at=session_time + datetime.timedelta(minutes=45) if idx == 3 else None,
                created_at=session_time
            )
            db.add(alert)

        db.commit()

    print("BatteryGuard AI database seed successfully completed!")
