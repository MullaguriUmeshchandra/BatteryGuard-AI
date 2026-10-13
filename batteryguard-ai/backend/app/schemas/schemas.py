from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str = Field(min_length=4)
    full_name: str
    role: Optional[str] = "technician"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None

# --- Battery Schemas ---
class BatteryBase(BaseModel):
    battery_id: str
    manufacturer: str
    model: str
    chemistry: str
    nominal_voltage: float
    capacity_ah: Optional[float] = None
    mfg_date: Optional[str] = None
    commissioning_date: Optional[str] = None
    condition_notes: Optional[str] = None
    assigned_technician: Optional[str] = None
    status: Optional[str] = "Active"

class BatteryCreate(BatteryBase):
    pass

class BatteryUpdate(BaseModel):
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    chemistry: Optional[str] = None
    nominal_voltage: Optional[float] = None
    capacity_ah: Optional[float] = None
    mfg_date: Optional[str] = None
    commissioning_date: Optional[str] = None
    condition_notes: Optional[str] = None
    assigned_technician: Optional[str] = None
    status: Optional[str] = None

class BatteryResponse(BatteryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    test_count: Optional[int] = 0
    latest_result: Optional[str] = None

    class Config:
        from_attributes = True

# --- Device Schemas ---
class DeviceBase(BaseModel):
    device_id: str
    name: str
    communication_type: str = "esp32_wifi"
    status: str = "idle"
    assigned_battery_id: Optional[str] = None
    firmware_version: Optional[str] = "v1.4.2"
    ip_address: Optional[str] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase):
    id: int
    last_seen: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# --- Test Profile Schemas ---
class TestProfileResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    load_current_amps: float
    pulse_duration_sec: float
    sustained_duration_sec: float
    resting_duration_sec: float
    sample_rate_hz: float
    max_temp_limit_c: float
    max_temp_rise_limit_c: float
    max_sag_percent_limit: float
    voltage_cutoff_v: float
    is_active: bool

    class Config:
        from_attributes = True

# --- Sensor Reading Schemas ---
class SensorReadingCreate(BaseModel):
    timestamp_offset_ms: int
    pack_voltage: float
    current_amps: float
    temperature_c: float
    phase: str
    reading_index: int

class SensorReadingResponse(SensorReadingCreate):
    id: int

    class Config:
        from_attributes = True

# --- Test Result Schemas ---
class TestResultResponse(BaseModel):
    id: int
    screening_category: str
    resting_voltage: float
    loaded_voltage: float
    voltage_sag_percent: float
    initial_temp_c: float
    final_temp_c: float
    temp_change_c: float
    internal_resistance_m_ohm: float
    voltage_stability_std: float
    anomaly_count: int
    anomalies: List[str] = []
    triggered_rules: List[Dict[str, Any]] = []
    recommendations: Optional[str] = None
    disclaimer: Optional[str] = None
    ml_anomaly_score: Optional[float] = None
    ml_is_anomaly: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

# --- Test Session Schemas ---
class TestSessionCreate(BaseModel):
    battery_id: int
    profile_id: int
    mode: str = "simulation"  # "simulation" or "hardware"
    scenario: Optional[str] = "normal"
    notes: Optional[str] = None

class TestSaveRequest(BaseModel):
    battery_id: int
    profile_id: int
    mode: str = "simulation"
    scenario: Optional[str] = "normal"
    duration_sec: float
    notes: Optional[str] = None
    readings: List[SensorReadingCreate]

class TestSessionResponse(BaseModel):
    id: int
    test_id: str
    battery_id: int
    battery_code: Optional[str] = None
    technician_name: Optional[str] = None
    profile_name: Optional[str] = None
    mode: str
    scenario: Optional[str] = None
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_sec: float
    screening_category: Optional[str] = None
    anomaly_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True

class TestSessionDetailResponse(TestSessionResponse):
    readings: List[SensorReadingResponse] = []
    result: Optional[TestResultResponse] = None
    battery: Optional[BatteryResponse] = None
    profile: Optional[TestProfileResponse] = None

# --- Alert Schemas ---
class AlertResponse(BaseModel):
    id: int
    test_session_id: Optional[int] = None
    battery_id: Optional[int] = None
    battery_code: Optional[str] = None
    severity: str
    category: str
    message: str
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: Optional[str] = "Technician"

# --- Dashboard & Analytics Schemas ---
class DashboardStatsResponse(BaseModel):
    total_batteries: int
    total_completed_tests: int
    good_screening_count: int
    review_screening_count: int
    degraded_screening_count: int
    critical_alerts_count: int
    connected_devices_count: int
    screening_distribution: Dict[str, int]
    recent_activity: List[TestSessionResponse]
    recent_alerts: List[AlertResponse]

# --- Hardware Telemetry Ingestion ---
class ESP32TelemetryIngest(BaseModel):
    device_id: str
    voltage: float
    current: float
    temperature: float
    timestamp: Optional[int] = None
    sequence: Optional[int] = 0
