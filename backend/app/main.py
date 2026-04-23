from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import os
import json
import logging
from typing import List, Optional
from app.core.config import settings
from app.core.database import init_db, get_db, SessionLocal
from app.core.security import get_password_hash, decode_token, require_admin
from app.models.models import User
from app.api import auth, users, cameras, alerts, settings as settings_api, dashboard, geocoding, system, zones, health
from app.api import photos

# Tentar importar detector (opcional)
try:
    from app.api import detector as detector_api
    from app.core.detector import detector_manager
    DETECTOR_AVAILABLE = True
except ImportError:
    DETECTOR_AVAILABLE = False
    detector_api = None
    detector_manager = None

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize database
init_db()

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerenciar ciclo de vida da aplicação"""
    # Startup
    logger.info("🚀 Iniciando aplicação...")
    
    db = SessionLocal()
    
    try:
        # Bootstrap opcional: cria admin apenas se não existir.
        if settings.BOOTSTRAP_ADMIN_ENABLED:
            admin = db.query(User).filter(User.username == settings.BOOTSTRAP_ADMIN_USERNAME).first()
            if not admin:
                admin = User(
                    username=settings.BOOTSTRAP_ADMIN_USERNAME,
                    full_name=settings.BOOTSTRAP_ADMIN_FULL_NAME,
                    email=settings.BOOTSTRAP_ADMIN_EMAIL,
                    hashed_password=get_password_hash(settings.BOOTSTRAP_ADMIN_PASSWORD),
                    role="admin",
                    is_active=True,
                )
                db.add(admin)
                db.commit()
                logger.info("✅ Usuário admin de bootstrap criado")
            else:
                logger.info("ℹ️ Usuário admin de bootstrap já existe")
        else:
            logger.info("🔒 Bootstrap de admin desabilitado")
        
        # Iniciar detector
        if DETECTOR_AVAILABLE:
            logger.info("🎥 Iniciando detector...")
            detector_manager.start(db)
            logger.info("✓ Detector iniciado")
        
        logger.info("✓ Sistema iniciado!")
        
        yield
        
    finally:
        # Shutdown
        logger.info("⏹️ Parando aplicação...")
        if DETECTOR_AVAILABLE:
            detector_manager.stop()
        db.close()

# Create app
app = FastAPI(
    title="Smart Security System API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS - Configuração permissiva para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),  # Configurável via .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ============================================================================
# UPLOADS - CRÍTICO!
# ============================================================================

# Caminho absoluto unificado a partir da configuração (settings.UPLOAD_DIR)
# Isso garante que uploads realizados via API e detector sejam servidos pelo mesmo diretório.
UPLOAD_DIR = os.path.abspath(settings.UPLOAD_DIR)

logger.info(f"📁 UPLOAD_DIR: {UPLOAD_DIR}")

# Criar estrutura
os.makedirs(os.path.join(UPLOAD_DIR, "alerts"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "alerts", "thumbnails"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "system"), exist_ok=True)

# Verificar
alerts_path = os.path.join(UPLOAD_DIR, "alerts")
if os.path.exists(alerts_path):
    files = [f for f in os.listdir(alerts_path) if os.path.isfile(os.path.join(alerts_path, f))]
    logger.info(f"📁 Arquivos em alerts/: {len(files)}")
    for f in files[:5]:  # Mostrar até 5
        logger.info(f"   - {f}")

# MONTAR - ANTES DOS ROUTERS!
logger.info(f"📁 Montando /uploads -> {UPLOAD_DIR}")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
logger.info("✓ /uploads montado!")

# ============================================================================
# ROUTERS
# ============================================================================

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(zones.router)
app.include_router(cameras.router)
app.include_router(alerts.router)
app.include_router(settings_api.router)
app.include_router(dashboard.router)
app.include_router(geocoding.router)
app.include_router(system.router)
app.include_router(health.router)
app.include_router(photos.router)

if DETECTOR_AVAILABLE:
    app.include_router(detector_api.router)

# ============================================================================
# WEBSOCKET
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                dead_connections.append(connection)
        
        for conn in dead_connections:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Canal WebSocket para notificações em tempo real.

    Exige token JWT válido via query string (?token=...) em ambiente de produção.
    Em modo DEBUG, a conexão sem token é permitida para facilitar desenvolvimento.
    """
    token = websocket.query_params.get("token")

    # Em produção, exigir token; em DEBUG permitir sem token (para não quebrar clientes legados)
    if not token and not settings.DEBUG:
        await websocket.close(code=1008, reason="Authentication required")
        return

    # Validar token se fornecido
    if token:
        payload = decode_token(token)
        if payload is None or not payload.get("sub"):
            await websocket.close(code=1008, reason="Invalid token")
            return

    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": str(os.times())})
            else:
                await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Broadcast functions
async def broadcast_alert(alert_data: dict):
    await manager.broadcast({"type": "alert", "data": alert_data})

async def broadcast_camera_status(camera_data: dict):
    await manager.broadcast({"type": "camera_status", "data": camera_data})

async def broadcast_notification(notification_type: str, title: str, message: str, data: dict = None, priority: str = "normal"):
    from datetime import datetime
    await manager.broadcast({
        "type": "notification",
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "priority": priority,
        "data": data or {},
        "timestamp": datetime.utcnow().isoformat()
    })

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
def read_root():
    return {
        "message": "Smart Security System API",
        "version": "2.0.0",
        "status": "running",
        "features": {
            "websocket": True,
            "photos": True,
            "alerts": True,
            "cameras": True,
            "detector": DETECTOR_AVAILABLE
        }
    }

@app.get("/debug/uploads")
def debug_uploads(current_user: User = Depends(require_admin)):
    """Debug de uploads (restrito a administradores).

    Em produção, essa rota expõe detalhes internos de diretórios; por isso é protegida
    por autenticação e só deve ser usada para diagnóstico.
    """
    alerts_dir = os.path.join(UPLOAD_DIR, "alerts")
    
    result = {
        "upload_dir": UPLOAD_DIR,
        "upload_dir_exists": os.path.exists(UPLOAD_DIR),
        "alerts_dir": alerts_dir,
        "alerts_dir_exists": os.path.exists(alerts_dir),
        "files": []
    }
    
    if os.path.exists(alerts_dir):
        try:
            files = os.listdir(alerts_dir)
            for f in files:
                fpath = os.path.join(alerts_dir, f)
                if os.path.isfile(fpath):
                    result["files"].append({
                        "name": f,
                        "size": os.path.getsize(fpath),
                        "url": f"/uploads/alerts/{f}"
                    })
        except Exception as e:
            result["error"] = str(e)
    
    return result

@app.get("/health")
def health_check():
    """Health check"""
    response = {
        "status": "healthy",
        "websocket_connections": len(manager.active_connections),
        "upload_dir": UPLOAD_DIR,
        "upload_dir_exists": os.path.exists(UPLOAD_DIR)
    }
    
    if DETECTOR_AVAILABLE:
        detector_status = detector_manager.get_status()
        response["detector"] = {
            "available": True,
            "total": len(detector_status),
            "running": sum(1 for d in detector_status if d["running"]),
            "paused": sum(1 for d in detector_status if d["paused"])
        }
    else:
        response["detector"] = {"available": False}
    
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
