from fastapi import APIRouter, Request
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, exc
import redis
import time
import psutil
import datetime
from urllib.parse import urlparse
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(tags=["health"])

@router.get("/health")
async def get_system_health():
    """
    Comprehensive system health check endpoint
    Returns status of all system components and metrics
    """
    health_data = {
        "backend": {"status": "healthy", "latency": None},
        "database": {"status": "unknown", "latency": None}, 
        "redis": {"status": "unknown", "latency": None},
        "websocket": {"status": "healthy", "latency": None},  # Assume healthy for now
        "cameras": {"online": 0, "offline": 0, "total": 0},
        "memory_usage": None,
        "cpu_usage": None,
        "uptime": None
    }
    
    # Backend latency (self-test)
    start_time = time.time()
    health_data["backend"]["latency"] = round((time.time() - start_time) * 1000, 2)
    
    # Database health check
    try:
        start_time = time.time()
        db_gen = get_db()
        db = next(db_gen)
        
        # Simple query to test database
        result = db.execute(text("SELECT 1")).fetchone()
        
        if result and result[0] == 1:
            health_data["database"]["status"] = "healthy"
            health_data["database"]["latency"] = round((time.time() - start_time) * 1000, 2)
        else:
            health_data["database"]["status"] = "error"
            
        db.close()
        
    except exc.SQLAlchemyError as e:
        health_data["database"]["status"] = "error"
    except Exception as e:
        health_data["database"]["status"] = "error"
    
    # Redis health check
    try:
        start_time = time.time()
        redis_url = settings.REDIS_URL or "redis://localhost:6379/0"
        parsed = urlparse(redis_url)
        redis_host = parsed.hostname or "localhost"
        redis_port = parsed.port or 6379
        redis_db = int((parsed.path or "/0").replace("/", "") or 0)

        redis_client = redis.Redis(host=redis_host, port=redis_port, db=redis_db)
        redis_client.ping()
        
        health_data["redis"]["status"] = "healthy"
        health_data["redis"]["latency"] = round((time.time() - start_time) * 1000, 2)
        
    except redis.ConnectionError:
        health_data["redis"]["status"] = "error"
    except Exception as e:
        health_data["redis"]["status"] = "error"
    
    # Camera status (from database)
    try:
        from app.models.models import Camera
        db_gen = get_db()
        db = next(db_gen)
        
        total_cameras = db.query(Camera).count()
        online_cameras = db.query(Camera).filter(Camera.status == "online").count()
        offline_cameras = total_cameras - online_cameras
        
        health_data["cameras"] = {
            "online": online_cameras,
            "offline": offline_cameras, 
            "total": total_cameras
        }
        
        db.close()
        
    except Exception as e:
        print(f"Error checking camera status: {e}")
    
    # System metrics
    try:
        # Memory usage
        memory = psutil.virtual_memory()
        health_data["memory_usage"] = round(memory.percent, 1)
        
        # CPU usage (average over 1 second)
        health_data["cpu_usage"] = round(psutil.cpu_percent(interval=1), 1)
        
        # System uptime
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        
        if days > 0:
            health_data["uptime"] = f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            health_data["uptime"] = f"{hours}h {minutes}m"
        else:
            health_data["uptime"] = f"{minutes}m"
            
    except Exception as e:
        print(f"Error getting system metrics: {e}")
    
    # Overall health assessment
    critical_services = ["database", "redis"]
    
    # Check if any critical service is down
    for service in critical_services:
        if health_data[service]["status"] == "error":
            health_data["backend"]["status"] = "warning"
            break
    
    return health_data