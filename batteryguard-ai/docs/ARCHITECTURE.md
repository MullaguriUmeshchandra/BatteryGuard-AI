# BatteryGuard AI — Technical Architecture Documentation

## 1. System Overview

BatteryGuard AI is a full-stack, enterprise-grade diagnostic and screening platform designed for high-voltage Electric Vehicle (EV) batteries. It enables service laboratories, second-life repurposing facilities, and fleet engineers to perform standardized multi-phase discharge screening, evaluate thermal gradients, detect voltage sag and internal impedance, and produce compliant engineering reports.

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|   React (Vite) + Tailwind CSS + Lucide React + Recharts + React Router 6       |
|                                                                                 |
|   [Overview]   [Inventory]   [Testing Lab]   [Analytics]   [History]  [Alerts]  |
+---------------------------------------------------------------------------------+
                                      |
                           HTTPS REST / WebSocket
                                      |
+---------------------------------------------------------------------------------+
|                                APPLICATION TIER                                 |
|                               FastAPI (Python)                                  |
|                                                                                 |
|  [Auth Service]   [Diagnostic Engine]   [Simulation Engine]   [ReportLab PDF]   |
|  [ESP32 Adapter]  [Alerts Dispatcher]   [ML Outlier Module]   [Audit Log]       |
+---------------------------------------------------------------------------------+
                                      |
                            SQLAlchemy 2.0 ORM
                                      |
+---------------------------------------------------------------------------------+
|                                  DATA TIER                                      |
|                        SQLite (WAL Mode + Foreign Keys)                         |
|                                                                                 |
|  Users | Batteries | TestProfiles | TestSessions | SensorReadings | TestResults  |
+---------------------------------------------------------------------------------+
```

---

## 2. Diagnostic Mathematical Formulations

### 2.1 Voltage Sag Percentage
Evaluates ohmic drop and polarization overpotential under applied discharge load relative to resting open-circuit voltage:

$$\text{Voltage Sag (\%)} = \left(\frac{V_{\text{resting}} - V_{\text{loaded}}}{V_{\text{resting}}}\right) \times 100$$

### 2.2 Temperature Rise Gradient
Calculates the thermal accumulation across the discharge duty cycle:

$$\Delta T = T_{\text{final}} - T_{\text{initial}}$$

### 2.3 Estimated DC Internal Resistance (IR)
Approximates pack internal impedance using shunt current step:

$$R_{\text{int}} = \frac{|V_{\text{resting}} - V_{\text{loaded}}|}{I_{\text{load}}} \times 1000 \quad (\text{m}\Omega)$$

### 2.4 Voltage Stability Index
Calculates steady-state standard deviation of voltage under sustained load:

$$\sigma_V = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (V_i - \bar{V})^2}$$

---

## 3. Screening Arbitration Priority

Screening outcomes follow strict deterministic safety hierarchy:

$$\textbf{CRITICAL} \succ \textbf{DEGRADED} \succ \textbf{REVIEW} \succ \textbf{GOOD}$$

1. **CRITICAL**:
   - $V_{\text{loaded}} < V_{\text{cutoff}}$ (Severe cell under-voltage)
   - $T_{\text{peak}} \ge T_{\text{limit}}$ (Thermal limit exceeded, e.g. $\ge 50^\circ\text{C}$)
   - Rapid thermal gradient $\Delta T \ge 1.5 \times \Delta T_{\text{limit}}$
   - Action: Immediate quarantine into fire-safe zone; disconnect contactors.

2. **DEGRADED**:
   - $\text{Voltage Sag} \ge 1.75 \times \text{Sag}_{\text{limit}}$ (Severe cell degradation)
   - $\Delta T \ge 1.5 \times \Delta T_{\text{limit}}$
   - Action: Prohibit vehicle deployment; module-level impedance spectroscopy.

3. **REVIEW**:
   - $\text{Voltage Sag} \ge \text{Sag}_{\text{limit}}$
   - $\Delta T \ge \Delta T_{\text{limit}}$
   - $\sigma_V > 0.40\,\text{V}$ (Load fluctuations / loose busbars)
   - Action: Cell balancing cycle and secondary low-current verification.

4. **GOOD**:
   - No screening limits breached.
   - Action: Proceed to secondary stage capacity and BMS CAN validation.

---

## 4. Hardware Integration Specification (ESP32)

Microcontrollers transmit sensor packets via HTTP POST:

- **Endpoint**: `POST /api/hardware/telemetry`
- **Headers**: `Content-Type: application/json`
- **Payload Schema**:
  ```json
  {
    "device_id": "ESP32-STATION-01",
    "pack_voltage": 48.25,
    "current_amps": 20.0,
    "temperature_c": 26.4,
    "sequence_id": 142
  }
  ```
- **Safety Validation**: Sensor bounds are verified (Voltage 0–160V, Current 0–250A, Temp -20–110°C). Implausible values are rejected and logged in the alerts center.
