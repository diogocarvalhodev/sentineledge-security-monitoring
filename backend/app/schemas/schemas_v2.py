"""
SentinelEdge API Schemas (Pydantic V2)
Updated for PostgreSQL with UUID support
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal

# ============================================
# USER SCHEMAS
# ============================================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=100)
    role: str = Field(default="operator", pattern="^(admin|operator|viewer)$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[str] = Field(None, pattern="^(admin|operator|viewer)$")
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# ZONE SCHEMAS (replaces School)
# ============================================

class ZoneBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    code: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    is_active: bool = True
    metadata: Optional[Dict[str, Any]] = {}

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    code: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    is_active: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

class ZoneResponse(ZoneBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    camera_count: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# CAMERA SCHEMAS
# ============================================

class CameraBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    zone_id: Optional[UUID] = None
    rtsp_url: str = Field(..., min_length=10)
    username: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = None
    location: Optional[str] = Field(None, max_length=150)
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    is_active: bool = True
    fps: int = Field(default=15, ge=1, le=60)
    resolution: str = Field(default="1920x1080", max_length=20)
    metadata: Optional[Dict[str, Any]] = {}

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    zone_id: Optional[UUID] = None
    rtsp_url: Optional[str] = Field(None, min_length=10)
    username: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = None
    location: Optional[str] = Field(None, max_length=150)
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    is_active: Optional[bool] = None
    fps: Optional[int] = Field(None, ge=1, le=60)
    resolution: Optional[str] = Field(None, max_length=20)
    metadata: Optional[Dict[str, Any]] = None

class CameraResponse(CameraBase):
    id: UUID
    status: str
    is_monitoring: bool
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    zone: Optional[ZoneResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# DETECTION CLASS SCHEMAS
# ============================================

class DetectionClassBase(BaseModel):
    name: str = Field(..., max_length=50)
    is_person: bool = False
    is_vehicle: bool = False
    is_weapon: bool = False
    priority_level: int = Field(default=0, ge=0, le=10)
    color_hex: str = Field(default="#00D1FF", pattern="^#[0-9A-Fa-f]{6}$")

class DetectionClassCreate(DetectionClassBase):
    pass

class DetectionClassResponse(DetectionClassBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# ALERT SCHEMAS
# ============================================

class AlertBase(BaseModel):
    camera_id: UUID
    zone_id: Optional[UUID] = None
    detection_class_id: Optional[int] = None
    detected_object: str = Field(..., max_length=50)
    confidence: Decimal = Field(..., ge=0, le=1)
    persons_count: int = Field(default=0, ge=0)
    vehicles_count: int = Field(default=0, ge=0)
    bbox_coordinates: Optional[List[int]] = None
    severity: str = Field(default="low", pattern="^(low|medium|high|critical)$")

class AlertCreate(AlertBase):
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None

class AlertUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(pending|reviewing|confirmed|false_positive|resolved)$")
    reviewed_by: Optional[UUID] = None
    notes: Optional[str] = None

class AlertResponse(AlertBase):
    id: UUID
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: str
    notified_telegram: bool
    notified_at: Optional[datetime] = None
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None
    metadata: Dict[str, Any] = {}
    detected_at: datetime
    created_at: datetime
    camera: Optional[CameraResponse] = None
    zone: Optional[ZoneResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# SYSTEM SETTINGS SCHEMAS
# ============================================

class SystemSettingBase(BaseModel):
    key: str = Field(..., max_length=100)
    value: Optional[str] = None
    value_type: str = Field(default="string", pattern="^(string|integer|boolean|json)$")
    description: Optional[str] = None
    is_secret: bool = False
    category: str = Field(default="general", max_length=50)

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None

class SystemSettingResponse(SystemSettingBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# AUTH SCHEMAS
# ============================================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)

# ============================================
# STATISTICS SCHEMAS
# ============================================

class DashboardStats(BaseModel):
    total_cameras: int
    online_cameras: int
    total_zones: int
    alerts_24h: int
    pending_alerts: int
    high_priority_alerts: int

class CameraStats(BaseModel):
    camera_id: UUID
    camera_name: str
    total_detections: int
    persons_detected: int
    vehicles_detected: int
    avg_confidence: Optional[Decimal] = None

class ZoneStats(BaseModel):
    zone_id: UUID
    zone_name: str
    total_cameras: int
    online_cameras: int
    alerts_24h: int
    pending_alerts: int

# ============================================
# LEGACY SCHEMAS (backward compatibility)
# ============================================

class SchoolCreate(ZoneCreate):
    """Deprecated: Use ZoneCreate instead"""
    pass

class SchoolUpdate(ZoneUpdate):
    """Deprecated: Use ZoneUpdate instead"""
    pass

class SchoolResponse(ZoneResponse):
    """Deprecated: Use ZoneResponse instead"""
    pass
