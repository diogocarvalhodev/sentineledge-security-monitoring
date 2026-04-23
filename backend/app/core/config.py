from pydantic_settings import BaseSettings
from typing import Optional, List, Union

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SentinelEdge"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    DEMO_MODE: bool = True
    
    # Database - PostgreSQL
    DATABASE_URL: str = "postgresql://sentineledge_user:sentineledge_secure_pass_2024@localhost:5432/sentineledge"
    
    # Redis (for real-time communication)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    BOOTSTRAP_ADMIN_ENABLED: bool = True
    BOOTSTRAP_ADMIN_USERNAME: str = "admin"
    BOOTSTRAP_ADMIN_FULL_NAME: str = "Administrator"
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@sentineledge.local"
    BOOTSTRAP_ADMIN_PASSWORD: str = "admin"
    
    # CORS - Can be comma-separated string or list
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://localhost:8000"
    
    # Telegram Notifications
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None

    # Demo and integration controls
    ALLOW_LOCAL_VIDEO_SOURCES: bool = True
    ENABLE_EXTERNAL_INTEGRATIONS: bool = False
    
    # Uploads
    UPLOAD_DIR: str = "uploads"
    
    # AI Engine Configuration - YOLOv8n (2026)
    AI_ENGINE_ENABLED: bool = True
    YOLOV8_MODEL: str = "yolov8n.pt"  # 6MB model, auto-downloads
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.5
    DETECTION_NMS_THRESHOLD: float = 0.4  # Not used in YOLOv8n (built-in)
    MAX_FPS: int = 30

    # MOT17 Dataset Support (for tracking demonstration)
    MOT17_DATASET_PATH: Optional[str] = None
    MOT17_ENABLED: bool = False
    
    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from string or list"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
