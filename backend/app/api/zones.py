"""
Sentinel API - Zones Management
Generic monitoring zones
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.models import User, Zone, Camera
from app.schemas.schemas import ZoneCreate, ZoneUpdate, ZoneResponse

router = APIRouter(prefix="/zones", tags=["zones"])

@router.get("", response_model=List[ZoneResponse])
def list_zones(
    skip: int = 0,
    limit: int = 100,
    is_active: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all monitoring zones"""
    query = db.query(Zone)
    
    if is_active is not None:
        query = query.filter(Zone.is_active == is_active)
    
    zones = query.offset(skip).limit(limit).all()
    
    # Add camera count
    for zone in zones:
        zone.camera_count = db.query(func.count(Camera.id)).filter(
            Camera.zone_id == zone.id,
            Camera.is_active == True
        ).scalar()
    
    return zones

@router.get("/{zone_id}", response_model=ZoneResponse)
def get_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get zone by ID"""
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Add camera count
    zone.camera_count = db.query(func.count(Camera.id)).filter(
        Camera.zone_id == zone.id,
        Camera.is_active == True
    ).scalar()
    
    return zone

@router.post("", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(
    zone: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create new monitoring zone"""
    # Check if zone with same name exists
    existing = db.query(Zone).filter(Zone.name == zone.name).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A zone with this name already exists"
        )
    
    # Check if code is unique
    if zone.code:
        existing_code = db.query(Zone).filter(Zone.code == zone.code).first()
        if existing_code:
            raise HTTPException(
                status_code=400,
                detail="A zone with this code already exists"
            )
    
    db_zone = Zone(**zone.model_dump())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    
    db_zone.camera_count = 0
    
    return db_zone

@router.put("/{zone_id}", response_model=ZoneResponse)
def update_zone(
    zone_id: UUID,
    zone_update: ZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update monitoring zone"""
    db_zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not db_zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Update fields
    update_data = zone_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_zone, field, value)
    
    db.commit()
    db.refresh(db_zone)
    
    # Add camera count
    db_zone.camera_count = db.query(func.count(Camera.id)).filter(
        Camera.zone_id == db_zone.id,
        Camera.is_active == True
    ).scalar()
    
    return db_zone

@router.delete("/{zone_id}")
def delete_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete monitoring zone"""
    db_zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not db_zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Check if zone has cameras
    camera_count = db.query(func.count(Camera.id)).filter(
        Camera.zone_id == zone_id
    ).scalar()
    
    if camera_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete zone. It has {camera_count} camera(s) associated. Remove cameras first."
        )
    
    db.delete(db_zone)
    db.commit()
    
    return {"message": "Zone deleted successfully"}

@router.get("/{zone_id}/cameras")
def get_zone_cameras(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all cameras in a zone"""
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    cameras = db.query(Camera).filter(
        Camera.zone_id == zone_id,
        Camera.is_active == True
    ).all()
    
    return {
        "zone": zone,
        "cameras": cameras
    }

@router.get("/{zone_id}/stats")
def get_zone_stats(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for a zone"""
    from app.models.models import Alert
    from datetime import datetime, timedelta
    
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Get cameras
    total_cameras = db.query(func.count(Camera.id)).filter(
        Camera.zone_id == zone_id
    ).scalar()
    
    online_cameras = db.query(func.count(Camera.id)).filter(
        Camera.zone_id == zone_id,
        Camera.status == 'online'
    ).scalar()
    
    # Get alerts (last 24h)
    last_24h = datetime.utcnow() - timedelta(hours=24)
    alerts_24h = db.query(func.count(Alert.id)).filter(
        Alert.zone_id == zone_id,
        Alert.detected_at >= last_24h
    ).scalar()
    
    pending_alerts = db.query(func.count(Alert.id)).filter(
        Alert.zone_id == zone_id,
        Alert.status == 'pending'
    ).scalar()
    
    return {
        "zone_id": zone_id,
        "zone_name": zone.name,
        "total_cameras": total_cameras,
        "online_cameras": online_cameras,
        "alerts_24h": alerts_24h,
        "pending_alerts": pending_alerts
    }
