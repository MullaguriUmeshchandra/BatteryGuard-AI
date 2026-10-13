import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Alert, AuditEvent, User
from app.schemas.schemas import AlertResponse, AlertAcknowledgeRequest
from app.services.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts Center"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    severity: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Alert).order_by(Alert.created_at.desc())

    if severity and severity != "All":
        query = query.filter(Alert.severity == severity)

    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)

    alerts = query.offset(offset).limit(limit).all()

    response = []
    for a in alerts:
        response.append({
            "id": a.id,
            "test_session_id": a.test_session_id,
            "battery_id": a.battery_id,
            "battery_code": a.battery.battery_id if a.battery else "System",
            "severity": a.severity,
            "category": a.category,
            "message": a.message,
            "acknowledged": a.acknowledged,
            "acknowledged_by": a.acknowledged_by,
            "acknowledged_at": a.acknowledged_at,
            "created_at": a.created_at
        })

    return response

@router.post("/{id}/acknowledge")
def acknowledge_alert(
    id: int,
    req: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    alert.acknowledged_by = current_user.full_name or req.acknowledged_by
    alert.acknowledged_at = datetime.datetime.utcnow()

    audit = AuditEvent(
        user_id=current_user.id,
        action="ALERT_ACKNOWLEDGE",
        resource_type="Alert",
        resource_id=str(alert.id),
        details=f"Acknowledged {alert.severity} alert: {alert.category}"
    )
    db.add(audit)
    db.commit()

    return {"message": "Alert acknowledged successfully", "id": alert.id}
