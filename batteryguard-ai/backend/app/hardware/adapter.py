import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

class HardwareTelemetryPayload(BaseModel):
    device_id: str
    pack_voltage: float
    current_amps: float
    temperature_c: float
    timestamp_ms: Optional[int] = None
    sequence_id: Optional[int] = 0

class ESP32Adapter:
    """
    ESP32 Hardware Telemetry Ingestion & Connection Adapter.
    Tracks live ESP32 microcontroller endpoints over Wi-Fi/BLE REST or WebSocket.
    """

    _connected_devices: Dict[str, Dict[str, Any]] = {
        "ESP32-STATION-01": {
            "device_id": "ESP32-STATION-01",
            "name": "Lab Test Bench A (ESP32-S3)",
            "communication_type": "esp32_wifi",
            "ip_address": "192.168.1.140",
            "firmware_version": "v2.1.0-batteryguard",
            "status": "connected",
            "last_heartbeat": datetime.datetime.utcnow(),
            "assigned_battery_id": "BAT-2024-001",
            "latest_reading": {
                "pack_voltage": 48.2,
                "current_amps": 0.0,
                "temperature_c": 24.8,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
        },
        "ESP32-MOBILE-02": {
            "device_id": "ESP32-MOBILE-02",
            "name": "Field Screener BLE (ESP32-C3)",
            "communication_type": "esp32_ble",
            "ip_address": "N/A (BLE MAC: 4C:11:AE:0D:98:21)",
            "firmware_version": "v1.8.4",
            "status": "idle",
            "last_heartbeat": datetime.datetime.utcnow() - datetime.timedelta(minutes=12),
            "assigned_battery_id": None,
            "latest_reading": None
        }
    }

    _recent_hardware_readings: Dict[str, List[Dict[str, Any]]] = {}

    @classmethod
    def ingest_reading(cls, payload: HardwareTelemetryPayload) -> Dict[str, Any]:
        """
        Ingest telemetry packet from ESP32 device, validate physical boundaries,
        and update device state.
        """
        device_id = payload.device_id
        
        # Physical plausibility validation
        valid = True
        warnings = []

        if payload.pack_voltage < 0.0 or payload.pack_voltage > 160.0:
            valid = False
            warnings.append(f"Voltage {payload.pack_voltage}V outside safe operational limits (0-160V)")

        if payload.temperature_c < -20.0 or payload.temperature_c > 110.0:
            valid = False
            warnings.append(f"Temperature {payload.temperature_c}°C outside plausible sensor bounds (-20 to 110°C)")

        if abs(payload.current_amps) > 250.0:
            valid = False
            warnings.append(f"Current {payload.current_amps}A exceeds maximum shunt capability (250A)")

        now = datetime.datetime.utcnow()
        reading_dict = {
            "timestamp_offset_ms": payload.timestamp_ms or int(now.timestamp() * 1000),
            "pack_voltage": round(payload.pack_voltage, 2),
            "current_amps": round(payload.current_amps, 2),
            "temperature_c": round(payload.temperature_c, 2),
            "sequence_id": payload.sequence_id,
            "is_valid": valid,
            "warnings": warnings,
            "received_at": now.isoformat()
        }

        # Update or register device
        if device_id not in cls._connected_devices:
            cls._connected_devices[device_id] = {
                "device_id": device_id,
                "name": f"ESP32 Client ({device_id})",
                "communication_type": "esp32_wifi",
                "ip_address": "192.168.1.185",
                "firmware_version": "v1.0.0",
                "status": "connected",
                "last_heartbeat": now,
                "assigned_battery_id": None,
                "latest_reading": reading_dict
            }
        else:
            cls._connected_devices[device_id]["last_heartbeat"] = now
            cls._connected_devices[device_id]["status"] = "connected"
            cls._connected_devices[device_id]["latest_reading"] = reading_dict

        # Buffer readings for active session
        if device_id not in cls._recent_hardware_readings:
            cls._recent_hardware_readings[device_id] = []
        cls._recent_hardware_readings[device_id].append(reading_dict)
        # Keep latest 200 readings in buffer
        cls._recent_hardware_readings[device_id] = cls._recent_hardware_readings[device_id][-200:]

        return {
            "status": "success" if valid else "rejected",
            "device_id": device_id,
            "is_valid": valid,
            "warnings": warnings,
            "reading": reading_dict
        }

    @classmethod
    def get_devices(cls) -> List[Dict[str, Any]]:
        """Return list of registered ESP32 devices with updated connectivity status."""
        now = datetime.datetime.utcnow()
        result = []
        for dev in cls._connected_devices.values():
            item = dict(dev)
            # Detect disconnection if no heartbeat for > 60 seconds
            if (now - item["last_heartbeat"]).total_seconds() > 60:
                item["status"] = "disconnected"
            result.append(item)
        return result

    @classmethod
    def get_latest_device_reading(cls, device_id: str) -> Optional[Dict[str, Any]]:
        dev = cls._connected_devices.get(device_id)
        if dev:
            return dev.get("latest_reading")
        return None
