from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, DECIMAL, BigInteger
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
from ..core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    role = Column(String(20), default="operator")  # admin, operator, viewer
    is_active = Column(Boolean, default=True, index=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    audit_logs = relationship("SystemLog", back_populates="user", foreign_keys="SystemLog.user_id")

class Zone(Base):
    """Monitoring zones (replaces schools concept for generic deployment)"""
    __tablename__ = "zones"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(DECIMAL(10, 8), nullable=True)
    longitude = Column(DECIMAL(11, 8), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    cameras = relationship("Camera", back_populates="zone")
    alerts = relationship("Alert", back_populates="zone")

class Camera(Base):
    __tablename__ = "cameras"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    rtsp_url = Column(Text, nullable=False)  # Full RTSP URL (encrypted in app layer)
    username = Column(String(100), nullable=True)
    password = Column(Text, nullable=True)  # Encrypted
    location = Column(String(150), nullable=True)
    latitude = Column(DECIMAL(10, 8), nullable=True)
    longitude = Column(DECIMAL(11, 8), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    is_monitoring = Column(Boolean, default=False)
    status = Column(String(20), default="offline", index=True)  # online, offline, error, maintenance
    fps = Column(Integer, default=15)
    resolution = Column(String(20), default="1920x1080")
    detection_zone = Column(JSONB, nullable=True)  # Zone coordinates {x1, y1, x2, y2} normalized 0.0-1.0
    last_seen = Column(DateTime(timezone=True), nullable=True)
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    alerts = relationship("Alert", back_populates="camera")
    zone = relationship("Zone", back_populates="cameras")
    
    def get_rtsp_url(self):
        """Returns RTSP URL (already stored as full URL)"""
        if self.username and self.password and "://" in self.rtsp_url:
            # Insert credentials if not already in URL
            parts = self.rtsp_url.split("://", 1)
            if "@" not in parts[1]:
                return f"{parts[0]}://{self.username}:{self.password}@{parts[1]}"
        return self.rtsp_url

class DetectionClass(Base):
    """AI detection classes (COCO dataset)"""
    __tablename__ = "detection_classes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    is_person = Column(Boolean, default=False)
    is_vehicle = Column(Boolean, default=False)
    is_weapon = Column(Boolean, default=False)
    priority_level = Column(Integer, default=0)
    color_hex = Column(String(7), default="#00D1FF")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    alerts = relationship("Alert", back_populates="detection_class")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    camera_id = Column(UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    detection_class_id = Column(Integer, ForeignKey("detection_classes.id"), nullable=True, index=True)
    detected_object = Column(String(50), nullable=False)
    confidence = Column(DECIMAL(5, 2), nullable=False)
    persons_count = Column(Integer, default=0)
    vehicles_count = Column(Integer, default=0)
    bbox_coordinates = Column(JSONB, nullable=True)  # [x1, y1, x2, y2]
    image_path = Column(Text, nullable=True)
    thumbnail_path = Column(Text, nullable=True)
    status = Column(String(20), default="pending", index=True)  # pending, reviewing, confirmed, false_positive, resolved
    severity = Column(String(20), default="low", index=True)  # low, medium, high, critical
    notified_telegram = Column(Boolean, default=False)
    notified_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    extra_data = Column(JSONB, default={})
    detected_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    
    camera = relationship("Camera", back_populates="alerts")
    zone = relationship("Zone", back_populates="alerts")
    detection_class = relationship("DetectionClass", back_populates="alerts")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    value_type = Column(String(20), default="string")  # string, integer, boolean, json
    description = Column(Text, nullable=True)
    is_secret = Column(Boolean, default=False)
    category = Column(String(50), default="general", index=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    updater = relationship("User", foreign_keys=[updated_by])

class SystemLog(Base):
    """System audit and error logs (replaces AuditLog)"""
    __tablename__ = "system_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    level = Column(String(20), default="INFO", index=True)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    source = Column(String(50), nullable=False, index=True)
    message = Column(Text, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    camera_id = Column(UUID(as_uuid=True), ForeignKey("cameras.id"), nullable=True)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id"), nullable=True)
    extra_data = Column('metadata', JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="audit_logs", foreign_keys=[user_id])
    camera = relationship("Camera")
    alert = relationship("Alert")

class DetectionStats(Base):
    """Aggregated detection statistics for analytics"""
    __tablename__ = "detection_stats"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    camera_id = Column(UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True, index=True)
    hour_bucket = Column(DateTime(timezone=True), nullable=False, index=True)
    total_detections = Column(Integer, default=0)
    persons_detected = Column(Integer, default=0)
    vehicles_detected = Column(Integer, default=0)
    high_confidence_count = Column(Integer, default=0)
    avg_confidence = Column(DECIMAL(5, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    camera = relationship("Camera")
    zone = relationship("Zone")
