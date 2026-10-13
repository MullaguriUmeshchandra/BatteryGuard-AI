from fastapi import APIRouter, HTTPException
from app.hardware.adapter import ESP32Adapter, HardwareTelemetryPayload

router = APIRouter(prefix="/hardware", tags=["Hardware Integration"])

@router.post("/telemetry")
def ingest_esp32_telemetry(payload: HardwareTelemetryPayload):
    """Endpoint for ESP32 microcontrollers to stream sensor packets over HTTP POST."""
    res = ESP32Adapter.ingest_reading(payload)
    return res

@router.get("/status")
def get_hardware_status():
    """Retrieve currently active ESP32 telemetry hardware connections."""
    devices = ESP32Adapter.get_devices()
    return {
        "hardware_engine": "ESP32 Standard Telemetry Service",
        "registered_devices": len(devices),
        "devices": devices
    }

@router.get("/latest/{device_id}")
def get_latest_hardware_reading(device_id: str):
    reading = ESP32Adapter.get_latest_device_reading(device_id)
    if not reading:
        raise HTTPException(status_code=404, detail=f"No telemetry readings buffered for {device_id}")
    return reading
