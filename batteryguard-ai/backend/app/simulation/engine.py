import math
import random
from typing import List, Dict, Any

class SimulationEngine:
    """
    Physics-based EV Battery Telemetry Simulation Engine.
    Produces repeatable and physically plausible sensor readings across test phases.
    """

    @classmethod
    def generate_full_session(
        cls,
        nominal_voltage: float = 48.0,
        load_current: float = 20.0,
        scenario: str = "normal",
        duration_sec: float = 30.0,
        sample_rate_hz: float = 2.0
    ) -> List[Dict[str, Any]]:
        """
        Generates complete telemetry stream for a test run.
        Phases:
          - 0% to 15%: resting
          - 15% to 35%: pulse_load
          - 35% to 80%: sustained_load
          - 80% to 100%: recovery
        """
        total_samples = max(10, int(duration_sec * sample_rate_hz))
        readings = []

        # Ambient baseline temperature
        current_temp = 25.2
        ocv = nominal_voltage * 1.04  # Open-circuit resting voltage (e.g. ~49.9V for 48V pack)
        
        # Scenario parameter adjustments
        internal_r = 0.045  # 45 mΩ baseline for normal
        thermal_resistance = 0.08  # °C per Joule equivalent
        
        if scenario == "voltage_instability":
            internal_r = 0.28  # High impedance
        elif scenario == "elevated_temp":
            thermal_resistance = 0.45  # Thermal dissipation failure
            internal_r = 0.12
        elif scenario == "critical_cutoff":
            internal_r = 0.58  # Catastrophic sag
            thermal_resistance = 0.55
        elif scenario == "abnormal_current":
            internal_r = 0.08

        for i in range(total_samples):
            fraction = i / total_samples
            elapsed_sec = fraction * duration_sec
            offset_ms = int(elapsed_sec * 1000)

            # Determine test phase
            if fraction < 0.15:
                phase = "resting"
                applied_current = 0.0
            elif fraction < 0.35:
                phase = "pulse_load"
                # Pulse applied current
                pulse_cycle = math.sin(elapsed_sec * math.pi * 1.2)
                applied_current = load_current * (1.0 if pulse_cycle > 0 else 0.0)
            elif fraction < 0.80:
                phase = "sustained_load"
                applied_current = load_current
            else:
                phase = "recovery"
                applied_current = 0.0

            # Scenario specifics for current
            if scenario == "abnormal_current" and applied_current > 0:
                # Add irregular current spikes and ripple
                applied_current += random.uniform(-6.0, 10.0)

            # Voltage calculation: V = OCV - (I * R) - polarization overpotential + noise
            if phase == "resting":
                v_drop = 0.0
                noise = random.uniform(-0.02, 0.02)
                voltage = ocv + noise
            elif phase in ("pulse_load", "sustained_load"):
                ohmic_drop = applied_current * internal_r
                # Slight capacity discharge depletion effect over sustained phase
                depletion = (fraction - 0.15) * 1.5 if fraction > 0.15 else 0.0
                
                # Polarization / instability noise
                if scenario == "voltage_instability":
                    instability_noise = math.sin(i * 1.5) * 1.8 + random.uniform(-0.8, 0.8)
                elif scenario == "critical_cutoff":
                    instability_noise = - (fraction * 14.0) + random.uniform(-0.3, 0.3)
                else:
                    instability_noise = random.uniform(-0.05, 0.05)

                voltage = ocv - ohmic_drop - depletion + instability_noise
            else: # recovery
                # Exponential recovery towards OCV
                rec_factor = (fraction - 0.80) / 0.20
                recovered_ocv = ocv - 0.3  # slight discharge residue
                voltage = (ocv - (load_current * internal_r)) + (rec_factor ** 0.5) * (load_current * internal_r * 0.92)
                voltage += random.uniform(-0.03, 0.03)

            # Temperature calculation: Joule heating (I^2 * R) accumulation
            power_heat = (applied_current ** 2) * internal_r
            current_temp += (power_heat * thermal_resistance * 0.015) + random.uniform(0.01, 0.04)

            # Extra heating for scenarios
            if scenario == "elevated_temp" and applied_current > 0:
                current_temp += 0.45  # Rapid thermal buildup
            elif scenario == "critical_cutoff" and applied_current > 0:
                current_temp += 0.50

            # Cap bounds and ensure realistic values
            readings.append({
                "timestamp_offset_ms": offset_ms,
                "pack_voltage": round(max(5.0, voltage), 2),
                "current_amps": round(max(0.0, applied_current), 2),
                "temperature_c": round(current_temp, 2),
                "phase": phase,
                "reading_index": i
            })

        return readings

    @classmethod
    def generate_single_reading(
        cls,
        index: int,
        nominal_voltage: float = 48.0,
        load_current: float = 20.0,
        scenario: str = "normal",
        phase: str = "sustained_load",
        prev_temp: float = 25.0
    ) -> Dict[str, Any]:
        """Generate a single live reading tick for continuous interactive streaming."""
        ocv = nominal_voltage * 1.04
        internal_r = 0.045
        if scenario == "voltage_instability":
            internal_r = 0.28
        elif scenario == "elevated_temp":
            internal_r = 0.12
        elif scenario == "critical_cutoff":
            internal_r = 0.55

        if phase == "resting":
            curr = 0.0
            volt = ocv + random.uniform(-0.03, 0.03)
            temp = prev_temp + random.uniform(-0.02, 0.02)
        elif phase == "pulse_load":
            curr = load_current if (index % 4 < 2) else 0.0
            volt = ocv - (curr * internal_r) + random.uniform(-0.1, 0.1)
            temp = prev_temp + (0.1 if curr > 0 else 0.0)
        elif phase == "sustained_load":
            curr = load_current + (random.uniform(-4, 6) if scenario == "abnormal_current" else random.uniform(-0.2, 0.2))
            drop = curr * internal_r
            if scenario == "voltage_instability":
                drop += math.sin(index * 0.8) * 2.1
            elif scenario == "critical_cutoff":
                drop += min(18.0, index * 0.8)
            volt = ocv - drop + random.uniform(-0.05, 0.05)
            temp_step = 0.4 if scenario in ("elevated_temp", "critical_cutoff") else 0.08
            temp = prev_temp + temp_step
        else: # recovery
            curr = 0.0
            volt = ocv - 0.5 + random.uniform(-0.05, 0.05)
            temp = prev_temp - 0.03

        return {
            "timestamp_offset_ms": index * 500,
            "pack_voltage": round(max(5.0, volt), 2),
            "current_amps": round(max(0.0, curr), 2),
            "temperature_c": round(temp, 2),
            "phase": phase,
            "reading_index": index
        }
