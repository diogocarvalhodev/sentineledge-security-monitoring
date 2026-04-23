from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
import re

# User Schemas
class UserBase(BaseModel):
    username: str  # Principal
    email: Optional[str] = None  # Opcional
    role: str = "viewer"
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Se tiver email, valida
        if v and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$', v):
            raise ValueError('Email inválido')
        return v

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$', v):
            raise ValueError('Email inválido')
        return v

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Zone Schemas
class ZoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    extra_data: Optional[Dict[str, Any]] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    extra_data: Optional[Dict[str, Any]] = None

class ZoneResponse(ZoneBase):
    id: UUID  # UUID correctly typed
    created_at: datetime
    updated_at: datetime
    camera_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

# Camera Schemas
class CameraBase(BaseModel):
    name: str
    location: str
    zone_id: Optional[UUID] = None
    ip: str
    rtsp_user: str
    rtsp_password: str
    channel: int = 1
    subtype: int = 0
    confidence_threshold: float = 0.5
    cooldown_seconds: int = 120
    schedule: Optional[Dict[str, Any]] = None
    detection_zone: Optional[Dict[str, float]] = None  # {x1, y1, x2, y2} normalized coordinates
    # Campos antigos (compatibilidade)
    critical_hours_start: str = "18:00"
    critical_hours_end: str = "06:00"
    monitor_weekends: bool = True
    enabled: bool = True
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    zone_id: Optional[UUID] = None
    ip: Optional[str] = None
    rtsp_user: Optional[str] = None
    rtsp_password: Optional[str] = None
    channel: Optional[int] = None
    subtype: Optional[int] = None
    confidence_threshold: Optional[float] = None
    cooldown_seconds: Optional[int] = None
    schedule: Optional[Dict[str, Any]] = None
    detection_zone: Optional[Dict[str, float]] = None
    critical_hours_start: Optional[str] = None
    critical_hours_end: Optional[str] = None
    monitor_weekends: Optional[bool] = None
    enabled: Optional[bool] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class CameraResponse(BaseModel):
    id: UUID
    name: str
    location: str
    zone_id: Optional[UUID] = None
    rtsp_url: str
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: bool
    is_monitoring: bool = False
    status: str = "offline"  # online, offline, error, maintenance
    fps: int = 15
    resolution: str = "640x480"
    detection_zone: Optional[Dict[str, float]] = None
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    zone: Optional[ZoneResponse] = None
    
    # Campos para compatibilidade com frontend
    ip: Optional[str] = None  # Derivado de rtsp_url 
    rtsp_user: Optional[str] = None  # Mapeado de username
    rtsp_password: Optional[str] = None  # Mapeado de password
    channel: int = 1
    subtype: int = 0
    confidence_threshold: float = 0.5
    cooldown_seconds: int = 120
    enabled: bool = True
    is_online: bool = False  # Mapeado de status == "online"
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, camera):
        # Usar URL RTSP completa (com credenciais, se aplicável) apenas para resposta
        full_rtsp_url = camera.get_rtsp_url() if hasattr(camera, "get_rtsp_url") else (camera.rtsp_url or "")

        # Extrair IP da RTSP URL para compatibilidade
        ip_value = full_rtsp_url or "0"
        
        # Para câmeras locais (webcam), o IP é apenas um número
        if full_rtsp_url and full_rtsp_url.isdigit():
            ip_value = full_rtsp_url
        elif "://" in full_rtsp_url:
            # Para URLs RTSP, extrair IP
            try:
                ip_value = full_rtsp_url.split("://")[1].split("/")[0].split("@")[-1].split(":")[0]
            except:
                ip_value = full_rtsp_url
                
        return cls(
            id=camera.id,
            name=camera.name,
            location=camera.location or "",
            zone_id=camera.zone_id,
            rtsp_url=full_rtsp_url,
            username=camera.username,
            password=camera.password,
            is_active=camera.is_active,
            is_monitoring=camera.is_monitoring,
            status=camera.status,
            fps=camera.fps or 15,
            resolution=camera.resolution or "640x480",
            detection_zone=camera.detection_zone,
            last_seen=camera.last_seen,
            created_at=camera.created_at,
            updated_at=camera.updated_at,
            zone=ZoneResponse.from_orm(camera.zone) if camera.zone else None,
            # Campos mapeados para compatibilidade
            ip=ip_value,
            rtsp_user=camera.username,
            rtsp_password=camera.password,
            channel=camera.extra_data.get('channel', 1) if camera.extra_data else 1,
            subtype=camera.extra_data.get('subtype', 0) if camera.extra_data else 0,
            confidence_threshold=camera.extra_data.get('confidence_threshold', 0.5) if camera.extra_data else 0.5,
            cooldown_seconds=camera.extra_data.get('cooldown_seconds', 120) if camera.extra_data else 120,
            enabled=camera.is_active,
            is_online=camera.status == "online"
        )

# Alert Schemas
class AlertBase(BaseModel):
    camera_id: UUID
    detected_object: str
    confidence: float
    persons_count: int = 0
    vehicles_count: int = 0
    severity: str = "low"  # low, medium, high, critical
    status: str = "pending"  # pending, reviewing, confirmed, false_positive, resolved

class AlertCreate(AlertBase):
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    bbox_coordinates: Optional[dict] = None

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None
    reviewed_by: Optional[UUID] = None

class AlertResponse(AlertBase):
    id: UUID
    camera_id: Optional[UUID] = None  # Permitir NULL para alertas órfãos
    zone_id: Optional[UUID] = None
    detection_class_id: Optional[int] = None
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    bbox_coordinates: Optional[dict] = None
    notified_telegram: bool = False
    notified_at: Optional[datetime] = None
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None
    extra_data: Optional[dict] = {}
    detected_at: datetime
    created_at: datetime
    camera: Optional[CameraResponse] = None
    
    class Config:
        from_attributes = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str  # Mudado de email para username
    password: str


class ChangePasswordRequest(BaseModel):
    """Payload seguro para troca de senha.

    Mantém a responsabilidade de validação encapsulada e evita o uso de
    parâmetros de query para senhas.
    """
    old_password: str
    new_password: str

# Settings Schemas
class SettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SettingCreate(SettingBase):
    pass

class SettingResponse(SettingBase):
    id: int
    updated_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

# Statistics Schema
class Statistics(BaseModel):
    total_cameras: int
    active_cameras: int
    total_alerts_today: int
    pending_alerts: int
    recent_alerts: list[AlertResponse] = []


