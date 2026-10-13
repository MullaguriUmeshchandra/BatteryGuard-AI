import pytest
from app.diagnostics.engine import DiagnosticEngine
from app.simulation.engine import SimulationEngine
from app.models.models import TestProfile

def test_voltage_sag_and_temp_delta():
    # Synthetic test profile
    profile = TestProfile(
        name="Test Profile",
        code="TEST",
        load_current_amps=20.0,
        voltage_cutoff_v=36.0,
        max_temp_limit_c=50.0,
        max_temp_rise_limit_c=8.0,
        max_sag_percent_limit=10.0,
        sample_rate_hz=2.0
    )

    readings = [
        {"pack_voltage": 50.0, "current_amps": 0.0, "temperature_c": 25.0, "phase": "resting"},
        {"pack_voltage": 45.0, "current_amps": 20.0, "temperature_c": 27.0, "phase": "sustained_load"},
        {"pack_voltage": 49.0, "current_amps": 0.0, "temperature_c": 28.0, "phase": "recovery"},
    ]

    result = DiagnosticEngine.evaluate_telemetry(readings, profile, nominal_voltage=48.0)
    
    # Voltage sag: ((50.0 - 45.0) / 50.0) * 100 = 10.0%
    assert result["resting_voltage"] == 50.0
    assert result["loaded_voltage"] == 45.0
    assert result["voltage_sag_percent"] == 10.0
    # Temp change: 28.0 - 25.0 = 3.0°C
    assert result["temp_change_c"] == 3.0
    assert "screening_category" in result

def test_critical_cutoff_rule():
    profile = TestProfile(
        name="Cutoff Profile",
        code="CUTOFF",
        load_current_amps=20.0,
        voltage_cutoff_v=36.0,
        max_temp_limit_c=50.0,
        max_temp_rise_limit_c=8.0,
        max_sag_percent_limit=10.0,
        sample_rate_hz=2.0
    )

    # Loaded voltage drops to 32V (< 36V cutoff)
    readings = [
        {"pack_voltage": 48.0, "current_amps": 0.0, "temperature_c": 25.0, "phase": "resting"},
        {"pack_voltage": 32.0, "current_amps": 20.0, "temperature_c": 30.0, "phase": "sustained_load"},
        {"pack_voltage": 38.0, "current_amps": 0.0, "temperature_c": 32.0, "phase": "recovery"},
    ]

    result = DiagnosticEngine.evaluate_telemetry(readings, profile, nominal_voltage=48.0)
    assert result["screening_category"] == "CRITICAL"
    assert any(r["rule_id"] == "RULE-VOLT-CUTOFF" for r in result["triggered_rules"])

def test_simulation_engine_scenarios():
    normal_run = SimulationEngine.generate_full_session(nominal_voltage=48.0, scenario="normal", duration_sec=10.0)
    assert len(normal_run) >= 10
    assert normal_run[0]["phase"] == "resting"
    assert normal_run[-1]["phase"] == "recovery"

    crit_run = SimulationEngine.generate_full_session(nominal_voltage=48.0, scenario="critical_cutoff", duration_sec=10.0)
    min_volt = min(r["pack_voltage"] for r in crit_run)
    assert min_volt < 40.0
