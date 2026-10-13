from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.models.models import Battery, TestSession, TestResult, AuditEvent, User
from app.schemas.schemas import BatteryCreate, BatteryUpdate, BatteryResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/batteries", tags=["Battery Inventory"])

@router.get("", response_model=List[BatteryResponse])
def get_batteries(
    search: Optional[str] = None,
    chemistry: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_desc: bool = True,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Battery)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Battery.battery_id.ilike(search_filter),
                Battery.manufacturer.ilike(search_filter),
                Battery.model.ilike(search_filter),
                Battery.assigned_technician.ilike(search_filter)
            )
        )

    if chemistry and chemistry != "All":
        query = query.filter(Battery.chemistry == chemistry)

    if status and status != "All":
        query = query.filter(Battery.status == status)

    if sort_desc:
        query = query.order_by(getattr(Battery, sort_by, Battery.created_at).desc())
    else:
        query = query.order_by(getattr(Battery, sort_by, Battery.created_at).asc())

    batteries = query.offset(offset).limit(limit).all()

    # Enrich with test count and latest result
    response_list = []
    for b in batteries:
        test_count = db.query(TestSession).filter(TestSession.battery_id == b.id).count()
        latest_session = (
            db.query(TestSession)
            .filter(TestSession.battery_id == b.id)
            .order_by(TestSession.created_at.desc())
            .first()
        )
        latest_res = None
        if latest_session and latest_session.result:
            latest_res = latest_session.result.screening_category

        b_dict = {
            "id": b.id,
            "battery_id": b.battery_id,
            "manufacturer": b.manufacturer,
            "model": b.model,
            "chemistry": b.chemistry,
            "nominal_voltage": b.nominal_voltage,
            "capacity_ah": b.capacity_ah,
            "mfg_date": b.mfg_date,
            "commissioning_date": b.commissioning_date,
            "condition_notes": b.condition_notes,
            "assigned_technician": b.assigned_technician,
            "status": b.status,
            "created_at": b.created_at,
            "updated_at": b.updated_at,
            "test_count": test_count,
            "latest_result": latest_res
        }
        response_list.append(b_dict)

    return response_list

@router.post("", response_model=BatteryResponse)
def create_battery(
    battery_in: BatteryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Battery).filter(Battery.battery_id == battery_in.battery_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Battery ID '{battery_in.battery_id}' already registered")

    new_battery = Battery(**battery_in.dict())
    if not new_battery.assigned_technician:
        new_battery.assigned_technician = current_user.full_name

    db.add(new_battery)
    db.commit()
    db.refresh(new_battery)

    audit = AuditEvent(
        user_id=current_user.id,
        action="BATTERY_CREATE",
        resource_type="Battery",
        resource_id=new_battery.battery_id,
        details=f"Created {new_battery.manufacturer} {new_battery.model} ({new_battery.chemistry})"
    )
    db.add(audit)
    db.commit()

    return {
        **new_battery.__dict__,
        "test_count": 0,
        "latest_result": None
    }

@router.get("/{id}", response_model=BatteryResponse)
def get_battery(id: int, db: Session = Depends(get_db)):
    battery = db.query(Battery).filter(Battery.id == id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")
    
    test_count = db.query(TestSession).filter(TestSession.battery_id == battery.id).count()
    latest_session = (
        db.query(TestSession)
        .filter(TestSession.battery_id == battery.id)
        .order_by(TestSession.created_at.desc())
        .first()
    )
    latest_res = latest_session.result.screening_category if (latest_session and latest_session.result) else None

    return {
        **battery.__dict__,
        "test_count": test_count,
        "latest_result": latest_res
    }

@router.put("/{id}", response_model=BatteryResponse)
def update_battery(
    id: int,
    battery_update: BatteryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    battery = db.query(Battery).filter(Battery.id == id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")

    update_data = battery_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(battery, key, value)

    db.commit()
    db.refresh(battery)
    
    test_count = db.query(TestSession).filter(TestSession.battery_id == battery.id).count()
    return {
        **battery.__dict__,
        "test_count": test_count,
        "latest_result": None
    }

@router.delete("/{id}")
def delete_battery(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    battery = db.query(Battery).filter(Battery.id == id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")

    battery_code = battery.battery_id
    db.delete(battery)
    db.commit()

    audit = AuditEvent(
        user_id=current_user.id,
        action="BATTERY_DELETE",
        resource_type="Battery",
        resource_id=battery_code,
        details="Deleted battery record and associated sessions"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Battery {battery_code} deleted successfully"}
