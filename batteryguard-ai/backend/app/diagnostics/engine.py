import math
import numpy as np
from typing import List, Dict, Any, Tuple
from app.models.models import TestProfile

class DiagnosticEngine:
    """
    Standardized EV Battery Diagnostic & Screening Calculation Engine.
    Evaluates voltage sag, thermal response, stability, and anomaly rules.
    """

    MANDATORY_DISCLAIMER = (
        "IMPORTANT NOTICE: A 'GOOD' screening result indicates solely that no configured screening "
        "anomalies were detected under the specific test load profile applied. This result MUST NEVER "
        "be construed as conclusive proof of total battery safety, cell balance, or suitability for reuse. "
        "Comprehensive secondary stage testing by qualified high-voltage personnel is mandatory."
    )

    @classmethod
    def evaluate_telemetry(
        cls,
        readings: List[Dict[str, Any]],
        profile: TestProfile,
        nominal_voltage: float = 48.0
    ) -> Dict[str, Any]:
        """
        Evaluate full session sensor readings and calculate screening metrics.
        Returns calculated metrics, screening category, triggered rules, and recommendations.
        """
        if not readings or len(readings) < 3:
            return cls._fallback_empty_result()

        voltages = [float(r.get("pack_voltage", 0.0)) for r in readings]
        currents = [float(r.get("current_amps", 0.0)) for r in readings]
        temperatures = [float(r.get("temperature_c", 0.0)) for r in readings]
        phases = [str(r.get("phase", "")) for r in readings]

        # 1. Physical Validity Check
        validity_anomalies = []
        for i, (v, c, t) in enumerate(zip(voltages, currents, temperatures)):
            if math.isnan(v) or v <= 0 or v > 200.0:
                validity_anomalies.append(f"Invalid voltage reading at sample #{i}: {v}V")
            if math.isnan(t) or t < -30.0 or t > 120.0:
                validity_anomalies.append(f"Sensor temperature out of bounds at sample #{i}: {t}°C")
            if math.isnan(c) or abs(c) > 300.0:
                validity_anomalies.append(f"Unphysical current reading at sample #{i}: {c}A")

        # 2. Extract Resting vs Loaded Phase Readings
        resting_voltages = [v for v, p in zip(voltages, phases) if p == "resting"]
        loaded_voltages = [v for v, p in zip(voltages, phases) if p in ("pulse_load", "sustained_load")]
        loaded_currents = [c for c, p in zip(currents, phases) if p in ("pulse_load", "sustained_load")]

        # Resting voltage (baseline before load)
        if resting_voltages:
            resting_v = float(np.mean(resting_voltages))
        else:
            resting_v = float(voltages[0])

        # Loaded voltage (minimum or steady state under load)
        if loaded_voltages:
            loaded_v = float(np.min(loaded_voltages))
            loaded_std = float(np.std(loaded_voltages))
            avg_loaded_current = float(np.mean(loaded_currents)) if loaded_currents else profile.load_current_amps
        else:
            loaded_v = float(np.min(voltages))
            loaded_std = float(np.std(voltages))
            avg_loaded_current = profile.load_current_amps

        # 3. Voltage Sag Percentage
        # Voltage Sag (%) = ((Resting Voltage − Loaded Voltage) / Resting Voltage) * 100
        if resting_v > 0.001:
            voltage_sag_percent = max(0.0, ((resting_v - loaded_v) / resting_v) * 100.0)
        else:
            voltage_sag_percent = 0.0

        # 4. Temperature Change
        # Temperature Change = Final Temperature − Initial Temperature
        initial_temp = float(temperatures[0])
        final_temp = float(temperatures[-1])
        max_temp = float(np.max(temperatures))
        temp_change = final_temp - initial_temp

        # 5. Internal Resistance Estimation (mΩ)
        # Internal Resistance = abs(Resting Voltage − Loaded Voltage) / Load Current (Amps) * 1000
        effective_current = max(avg_loaded_current, 0.5)
        internal_resistance_m_ohm = (abs(resting_v - loaded_v) / effective_current) * 1000.0

        # 6. Rule-Based Evaluation Engine
        triggered_rules = []
        anomalies = list(validity_anomalies)

        # Rule 1: Hardware/Sensor validity
        if validity_anomalies:
            triggered_rules.append({
                "rule_id": "RULE-SEC-01",
                "severity": "CRITICAL",
                "name": "Sensor Plausibility Violation",
                "description": "Detected unphysical or disconnected sensor signals during test.",
                "value": len(validity_anomalies),
                "threshold": 0
            })

        # Rule 2: Critical Under-Voltage Cutoff
        cutoff_threshold = profile.voltage_cutoff_v
        if loaded_v < cutoff_threshold:
            triggered_rules.append({
                "rule_id": "RULE-VOLT-CUTOFF",
                "severity": "CRITICAL",
                "name": "Under-Voltage Cutoff Breached",
                "description": f"Loaded voltage dropped to {loaded_v:.2f}V, violating cutoff threshold ({cutoff_threshold:.2f}V). Risk of cell degradation.",
                "value": round(loaded_v, 2),
                "threshold": round(cutoff_threshold, 2)
            })
            anomalies.append(f"Loaded voltage {loaded_v:.2f}V < Cutoff {cutoff_threshold:.2f}V")

        # Rule 3: Critical Over-Temperature Limit
        max_temp_limit = profile.max_temp_limit_c
        if max_temp >= max_temp_limit:
            triggered_rules.append({
                "rule_id": "RULE-THERM-CRIT",
                "severity": "CRITICAL",
                "name": "Critical Thermal Limit Exceeded",
                "description": f"Pack surface temperature peaked at {max_temp:.1f}°C (Safety limit: {max_temp_limit:.1f}°C). Imminent thermal stress hazard.",
                "value": round(max_temp, 1),
                "threshold": round(max_temp_limit, 1)
            })
            anomalies.append(f"Peak temperature {max_temp:.1f}°C >= Limit {max_temp_limit:.1f}°C")

        # Rule 4: Excessive Voltage Sag (DEGRADED vs REVIEW)
        max_sag_limit = profile.max_sag_percent_limit
        if voltage_sag_percent >= max_sag_limit * 1.75:
            triggered_rules.append({
                "rule_id": "RULE-SAG-SEVERE",
                "severity": "DEGRADED",
                "name": "Severe Voltage Sag Under Load",
                "description": f"Observed voltage sag of {voltage_sag_percent:.1f}% indicates severe internal impedance or cell degradation (Threshold: {max_sag_limit * 1.75:.1f}%).",
                "value": round(voltage_sag_percent, 1),
                "threshold": round(max_sag_limit * 1.75, 1)
            })
            anomalies.append(f"Severe voltage sag of {voltage_sag_percent:.1f}% under standard load")
        elif voltage_sag_percent >= max_sag_limit:
            triggered_rules.append({
                "rule_id": "RULE-SAG-WARN",
                "severity": "REVIEW",
                "name": "Elevated Voltage Sag",
                "description": f"Observed voltage sag of {voltage_sag_percent:.1f}% exceeds nominal threshold ({max_sag_limit:.1f}%). Requires cell balancing check.",
                "value": round(voltage_sag_percent, 1),
                "threshold": round(max_sag_limit, 1)
            })
            anomalies.append(f"Elevated voltage sag: {voltage_sag_percent:.1f}%")

        # Rule 5: Temperature Rise Gradient
        max_rise_limit = profile.max_temp_rise_limit_c
        if temp_change >= max_rise_limit * 1.5:
            triggered_rules.append({
                "rule_id": "RULE-THERM-GRAD-HIGH",
                "severity": "DEGRADED",
                "name": "Rapid Thermal Accumulation",
                "description": f"Pack temperature rose by +{temp_change:.1f}°C during short discharge cycle (Allowable: +{max_rise_limit * 1.5:.1f}°C).",
                "value": round(temp_change, 1),
                "threshold": round(max_rise_limit * 1.5, 1)
            })
            anomalies.append(f"High thermal rise: +{temp_change:.1f}°C")
        elif temp_change >= max_rise_limit:
            triggered_rules.append({
                "rule_id": "RULE-THERM-GRAD-WARN",
                "severity": "REVIEW",
                "name": "Elevated Temperature Delta",
                "description": f"Temperature rise of +{temp_change:.1f}°C exceeds nominal profile expectation (+{max_rise_limit:.1f}°C).",
                "value": round(temp_change, 1),
                "threshold": round(max_rise_limit, 1)
            })
            anomalies.append(f"Temperature rise +{temp_change:.1f}°C > {max_rise_limit:.1f}°C")

        # Rule 6: Voltage Stability Fluctuations
        if loaded_std > 0.40:
            triggered_rules.append({
                "rule_id": "RULE-STABILITY-WARN",
                "severity": "REVIEW",
                "name": "Load Voltage Instability",
                "description": f"Voltage fluctuations observed under steady load (std: {loaded_std:.3f}V). Possible loose interconnects or cell mismatch.",
                "value": round(loaded_std, 3),
                "threshold": 0.40
            })
            anomalies.append(f"Loaded voltage stability variance: {loaded_std:.3f}V")

        # 7. Category Arbitration (CRITICAL > DEGRADED > REVIEW > GOOD)
        severities = [r["severity"] for r in triggered_rules]
        if "CRITICAL" in severities:
            category = "CRITICAL"
            recommendations = (
                "IMMEDIATE ACTION REQUIRED: Isolate pack immediately into fire-safe quarantine area. "
                "Do NOT attempt recharge or further discharge. Perform thermal camera inspection and disconnect high-voltage contactors."
            )
        elif "DEGRADED" in severities:
            category = "DEGRADED"
            recommendations = (
                "QUARANTINE FOR EVALUATION: Battery shows significant degradation in voltage retention or thermal dissipation. "
                "Disallow operational vehicle deployment. Perform module-level tear down or cell-level impedance spectroscopy."
            )
        elif "REVIEW" in severities:
            category = "REVIEW"
            recommendations = (
                "FURTHER SCREENING ADVISED: Battery performance is borderline. Perform full balancing charge cycle "
                "and re-evaluate under low-current baseline test profile before clearance."
            )
        else:
            category = "GOOD"
            recommendations = (
                "SCREENING CRITERIA SATISFIED: All measured parameters fell within standard tolerances for this profile. "
                "Proceed to stage-2 capacity validation and BMS CAN bus communication audit."
            )

        return {
            "screening_category": category,
            "resting_voltage": round(resting_v, 2),
            "loaded_voltage": round(loaded_v, 2),
            "voltage_sag_percent": round(voltage_sag_percent, 2),
            "initial_temp_c": round(initial_temp, 2),
            "final_temp_c": round(final_temp, 2),
            "temp_change_c": round(temp_change, 2),
            "internal_resistance_m_ohm": round(internal_resistance_m_ohm, 2),
            "voltage_stability_std": round(loaded_std, 3),
            "anomaly_count": len(anomalies),
            "anomalies": anomalies,
            "triggered_rules": triggered_rules,
            "recommendations": recommendations,
            "disclaimer": cls.MANDATORY_DISCLAIMER
        }

    @classmethod
    def _fallback_empty_result(cls) -> Dict[str, Any]:
        return {
            "screening_category": "REVIEW",
            "resting_voltage": 0.0,
            "loaded_voltage": 0.0,
            "voltage_sag_percent": 0.0,
            "initial_temp_c": 25.0,
            "final_temp_c": 25.0,
            "temp_change_c": 0.0,
            "internal_resistance_m_ohm": 0.0,
            "voltage_stability_std": 0.0,
            "anomaly_count": 1,
            "anomalies": ["Insufficient sensor readings received to perform diagnostic evaluation"],
            "triggered_rules": [{
                "rule_id": "RULE-DATA-MIN",
                "severity": "REVIEW",
                "name": "Insufficient Telemetry Data",
                "description": "Session completed without enough data points to verify battery response.",
                "value": 0,
                "threshold": 3
            }],
            "recommendations": "Ensure sensor probes are connected and repeat diagnostic screening cycle.",
            "disclaimer": cls.MANDATORY_DISCLAIMER
        }
