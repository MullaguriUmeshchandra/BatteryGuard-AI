import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="technician")  # 'admin' or 'technician'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    test_sessions = relationship("TestSession", back_populates="technician")
    audit_events = relationship("AuditEvent", back_populates="user")


class Battery(Base):
    __tablename__ = "batteries"

    id = Column(Integer, primary_key=True, index=True)
    battery_id = Column(String(100), unique=True, index=True, nullable=False)
    manufacturer = Column(String(150), nullable=False)
    model = Column(String(150), nullable=False)
    chemistry = Column(String(50), nullable=False)  # 'LFP', 'NMC', 'NCA', 'LTO', 'Solid-State'
    nominal_voltage = Column(Float, nullable=False)
    capacity_ah = Column(Float, nullable=True)
    mfg_date = Column(String(50), nullable=True)
    commissioning_date = Column(String(50), nullable=True)
    condition_notes = Column(Text, nullable=True)
    assigned_technician = Column(String(150), nullable=True)
    status = Column(String(50), default="Active")  # 'Active', 'Under Test', 'Needs Review', 'Quarantined', 'Decommissioned'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    test_sessions = relationship("TestSession", back_populates="battery", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="battery")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    communication_type = Column(String(50), default="esp32_wifi")  # 'esp32_wifi', 'esp32_ble', 'virtual_adapter'
    status = Column(String(50), default="idle")  # 'connected', 'idle', 'disconnected', 'simulation'
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    assigned_battery_id = Column(String(100), nullable=True)
    firmware_version = Column(String(50), default="v1.4.2")
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class TestProfile(Base):
    __tablename__ = "test_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    load_current_amps = Column(Float, default=20.0)
    pulse_duration_sec = Column(Float, default=5.0)
    sustained_duration_sec = Column(Float, default=20.0)
    resting_duration_sec = Column(Float, default=5.0)
    sample_rate_hz = Column(Float, default=2.0)
    max_temp_limit_c = Column(Float, default=50.0)
    max_temp_rise_limit_c = Column(Float, default=8.0)
    max_sag_percent_limit = Column(Float, default=10.0)
    voltage_cutoff_v = Column(Float, default=36.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    test_sessions = relationship("TestSession", back_populates="profile")


class TestSession(Base):
    __tablename__ = "test_sessions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(String(100), unique=True, index=True, nullable=False)
    battery_id = Column(Integer, ForeignKey("batteries.id", ondelete="CASCADE"), nullable=False, index=True)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    profile_id = Column(Integer, ForeignKey("test_profiles.id"), nullable=False)
    mode = Column(String(50), default="simulation")  # 'simulation' or 'hardware'
    scenario = Column(String(50), default="normal")  # 'normal', 'voltage_instability', 'elevated_temp', 'abnormal_current', 'critical_cutoff'
    status = Column(String(50), default="completed")  # 'running', 'completed', 'aborted', 'failed'
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_sec = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    battery = relationship("Battery", back_populates="test_sessions")
    technician = relationship("User", back_populates="test_sessions")
    profile = relationship("TestProfile", back_populates="test_sessions")
    readings = relationship("SensorReading", back_populates="test_session", cascade="all, delete-orphan", order_by="SensorReading.reading_index")
    result = relationship("TestResult", back_populates="test_session", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="test_session")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    test_session_id = Column(Integer, ForeignKey("test_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp_offset_ms = Column(Integer, nullable=False)
    pack_voltage = Column(Float, nullable=False)
    current_amps = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    phase = Column(String(50), default="sustained_load")  # 'resting', 'pulse_load', 'sustained_load', 'recovery'
    reading_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    test_session = relationship("TestSession", back_populates="readings")

    __table_args__ = (
        Index("ix_sensor_session_index", "test_session_id", "reading_index"),
    )


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    test_session_id = Column(Integer, ForeignKey("test_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    screening_category = Column(String(50), nullable=False)  # 'GOOD', 'REVIEW', 'DEGRADED', 'CRITICAL'
    resting_voltage = Column(Float, nullable=False)
    loaded_voltage = Column(Float, nullable=False)
    voltage_sag_percent = Column(Float, nullable=False)
    initial_temp_c = Column(Float, nullable=False)
    final_temp_c = Column(Float, nullable=False)
    temp_change_c = Column(Float, nullable=False)
    internal_resistance_m_ohm = Column(Float, nullable=False)
    voltage_stability_std = Column(Float, nullable=False)
    anomaly_count = Column(Integer, default=0)
    anomalies_json = Column(Text, default="[]")  # JSON string array
    triggered_rules_json = Column(Text, default="[]")  # JSON string array of dicts
    recommendations = Column(Text, nullable=True)
    disclaimer = Column(Text, nullable=True)
    ml_anomaly_score = Column(Float, nullable=True)
    ml_is_anomaly = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    test_session = relationship("TestSession", back_populates="result")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    test_session_id = Column(Integer, ForeignKey("test_sessions.id", ondelete="SET NULL"), nullable=True)
    battery_id = Column(Integer, ForeignKey("batteries.id", ondelete="SET NULL"), nullable=True)
    severity = Column(String(50), nullable=False)  # 'CRITICAL', 'WARNING', 'INFO'
    category = Column(String(100), nullable=False)  # 'Over-temperature', 'Voltage Cutoff', 'Sag Warning', 'Current Ripple', 'Sensor Dropout'
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(150), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    test_session = relationship("TestSession", back_populates="alerts")
    battery = relationship("Battery", back_populates="alerts")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # 'USER_LOGIN', 'TEST_COMPLETED', 'BATTERY_CREATED', 'ALERT_ACKNOWLEDGED'
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_events")
