from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Camera, Alert
from app.schemas.schemas import Statistics

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=Statistics)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total cameras
    total_cameras = db.query(func.count(Camera.id)).scalar()
    
    # Active cameras (online)
    # Campo de verdade é 'status' (online/offline/error/maintenance)
    active_cameras = db.query(func.count(Camera.id)).filter(
        Camera.status == "online"
    ).scalar()
    
    # Total alerts today
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)
    
    total_alerts_today = db.query(func.count(Alert.id)).filter(
        and_(
            Alert.created_at >= today,
            Alert.created_at < tomorrow
        )
    ).scalar()
    
    # Pending alerts (não resolvidos)
    pending_alerts = db.query(func.count(Alert.id)).filter(
        Alert.status.in_(["pending", "reviewing"])
    ).scalar()
    
    # Recent alerts (last 10)
    recent_alerts = db.query(Alert).order_by(
        Alert.created_at.desc()
    ).limit(10).all()
    
    return {
        "total_cameras": total_cameras or 0,
        "active_cameras": active_cameras or 0,
        "total_alerts_today": total_alerts_today or 0,
        "pending_alerts": pending_alerts or 0,
        "recent_alerts": recent_alerts
    }

@router.get("/alerts/recent")
def get_recent_alerts(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alerts = db.query(Alert).order_by(
        Alert.created_at.desc()
    ).limit(limit).all()
    
    return alerts

@router.get("/cameras/status")
def get_cameras_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cameras = db.query(Camera).all()
    
    return [{
        "id": camera.id,
        "name": camera.name,
        "location": camera.location,
        # Propriedade derivada, compatível com o frontend
        "is_online": camera.status == "online",
        "last_seen": camera.last_seen,
        # Usar is_active como flag de habilitação
        "enabled": camera.is_active
    } for camera in cameras]
