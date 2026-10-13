# BatteryGuard AI — Smart EV Battery Diagnostic and Screening Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00.svg)](https://www.sqlalchemy.org)
[![Pytest](https://img.shields.io/badge/Tests-Passing-brightgreen.svg?logo=pytest)](https://docs.pytest.org)

**BatteryGuard AI** is a production-grade, full-stack software platform engineered for high-voltage Electric Vehicle (EV) battery diagnostic testing, first-stage screening, and repurposing certification. Built for engineering evaluation, laboratory testing, and academic demonstrations.

---

## ⚡ Key Features

1. **Enterprise UI/UX Design System**:
   - Modern, technical dark/light mode application shell.
   - Collapsible navigation sidebar, header breadcrumbs, live alerts bell, and interactive tour.
   - Built with Tailwind CSS, Lucide icons, and Recharts.

2. **Battery Asset Inventory**:
   - Track EV packs across diverse chemistries: **LFP**, **NMC**, **NCA**, **LTO**.
   - Manage nominal voltage, rated capacity, manufacturing dates, and visual condition.
   - Filter, search, and export fleet registries.

3. **Live Diagnostic Testing Workspace**:
   - Multi-phase discharge cycle simulation: `RESTING` → `PULSE LOAD` → `SUSTAINED LOAD` → `RECOVERY`.
   - Real-time animated charts for Terminal Voltage (V), Shunt Current (A), and Surface Temperature (°C).
   - 5 repeatable simulation scenarios:
     - Normal demonstration baseline
     - Voltage instability / cell imbalance
     - Thermal dissipation failure (runaway warning)
     - Abnormal current ripple
     - Critical under-voltage cutoff violation

4. **Explainable Diagnostic & Rule Engine**:
   - Computes:
     - **Voltage Sag (%)**: $\frac{V_{\text{resting}} - V_{\text{loaded}}}{V_{\text{resting}}} \times 100$
     - **Temperature Change ($\Delta T$)**: $T_{\text{final}} - T_{\text{initial}}$
     - **DC Internal Resistance**: $\frac{\Delta V}{I_{\text{load}}} \times 1000$ (mΩ)
     - **Voltage Stability Index**: Steady-state loaded standard deviation ($\sigma_V$)
   - Deterministic safety arbitration: **CRITICAL** > **DEGRADED** > **REVIEW** > **GOOD**.
   - Transparent explanations detailing why each rule fired and operator recommendations.

5. **ESP32 Hardware Telemetry Integration**:
   - Microcontroller REST ingestion endpoint: `POST /api/hardware/telemetry`.
   - Plausibility validation against impossible or disconnected probe readings.
   - Active device registry with heartbeat tracking and connection ping tests.

6. **Publication-Quality PDF & CSV Reporting**:
   - Downloadable vector PDF engineering reports generated via ReportLab Platypus.
   - Features corporate header, metrics matrix, rule triggers, and mandatory screening disclaimer.
   - CSV raw data exports for tabular analysis.

7. **Experimental Machine Learning Module**:
   - Embedded Scikit-learn `IsolationForest` multi-variate outlier detector.
   - Evaluates multi-parameter operating clusters alongside deterministic physics rules.

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ & npm

### 1. Backend Setup
From the repository root:

```bash
# Activate virtual environment
# Windows:
.\.venv\Scripts\Activate.ps1

# Navigate to backend
cd batteryguard-ai\backend

# Run automated tests
pytest tests -v

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The database (`batteryguard.db`) will automatically initialize and populate with rich demo EV batteries, historical test sessions, test profiles, and technician accounts!

API Swagger Docs will be accessible at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
In a second terminal:

```bash
cd batteryguard-ai\frontend

# Install dependencies (already prepared)
npm install

# Start Vite development server
npm run dev
```

Open your browser to: `http://localhost:5173`

---

## 🔑 Default Credentials for Live Evaluation

| Role | Email | Password |
|---|---|---|
| **Lead Engineer (Admin)** | `admin@batteryguard.ai` | `Admin@123456` |
| **Screening Technician** | `tech@batteryguard.ai` | `Tech@123456` |

*Tip: The login screen features quick-fill buttons for 1-click credential population!*

---

## 📁 Source Code Directory Structure

```
batteryguard-ai/
├── frontend/
│   ├── src/
│   │   ├── components/       # ToastContainer, OnboardingModal
│   │   ├── context/          # AuthContext (state, theme, toasts)
│   │   ├── layouts/          # AppLayout (collapsible sidebar, header)
│   │   ├── pages/            # Overview, Inventory, Testing, Analytics, History, Alerts, Devices, Reports, Settings, Login, Register
│   │   ├── services/         # api.js (unified REST client)
│   │   ├── App.jsx           # React Router 6 setup & route protection
│   │   ├── index.css         # Design system tokens & Tailwind CSS
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── api/              # auth, batteries, devices, tests, hardware, analytics, alerts, reports
│   │   ├── database/         # session.py (SQLite WAL engine)
│   │   ├── diagnostics/      # engine.py (standardized formulas & rule arbitration)
│   │   ├── hardware/         # adapter.py (ESP32 telemetry ingestion & validation)
│   │   ├── ml/               # anomaly_detector.py (Scikit-learn Isolation Forest)
│   │   ├── models/           # models.py (SQLAlchemy relational schema)
│   │   ├── reports/          # pdf_generator.py (ReportLab), csv_generator.py
│   │   ├── schemas/          # schemas.py (Pydantic models)
│   │   ├── services/         # auth.py (bcrypt & JWT), seed.py (realistic database seed)
│   │   ├── simulation/       # engine.py (physics curve generation)
│   │   ├── config.py
│   │   └── main.py
│   ├── tests/                # test_diagnostics.py, test_api_integration.py
│   └── requirements.txt
│
├── docs/
│   └── ARCHITECTURE.md       # Technical architecture & mathematical specifications
├── .env.example
├── .gitignore
└── README.md
```

---

## 🛡️ Regulatory Screening Disclaimer

> **IMPORTANT NOTICE:** A **GOOD** screening result indicates solely that no configured screening anomalies were detected under the specific test load profile applied. This result **MUST NEVER** be construed as conclusive proof of total battery safety, cell balance, or suitability for vehicle recommissioning. Comprehensive secondary laboratory verification by qualified high-voltage personnel is mandatory.
