import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Device
from app.schemas.schemas import DeviceResponse, DeviceCreate
from app.hardware.adapter import ESP32Adapter

router = APIRouter(prefix="/devices", tags=["Device Management"])

@router.get("", response_model=List[DeviceResponse])
def get_devices(db: Session = Depends(get_db)):
    db_devices = db.query(Device).all()
    # Synchronize with hardware adapter status
    hw_devs = {d["device_id"]: d for d in ESP32Adapter.get_devices()}
    for d in db_devices:
        if d.device_id in hw_devs:
            d.status = hw_devs[d.device_id]["status"]
            d.last_seen = hw_devs[d.device_id]["last_heartbeat"]
    db.commit()
    return db_devices

@router.post("", response_model=DeviceResponse)
def create_device(device_in: DeviceCreate, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.device_id == device_in.device_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device ID already registered")

    new_device = Device(**device_in.dict())
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device

@router.post("/{device_id}/ping")
def ping_device(device_id: str, db: Session = Depends(get_db)):
    dev = db.query(Device).filter(Device.device_id == device_id).first()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    
    dev.last_seen = datetime.datetime.utcnow()
    dev.status = "connected"
    db.commit()
    return {"status": "pong", "device_id": device_id, "latency_ms": 14}
