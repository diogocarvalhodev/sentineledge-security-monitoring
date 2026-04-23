from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from uuid import UUID
import cv2
import numpy as np
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, require_admin
from app.models.models import User, Camera, SystemSettings
from app.schemas.schemas import CameraCreate, CameraUpdate, CameraResponse

# Importar detector opcionalmente
try:
    from app.core.detector import detector_manager
    DETECTOR_AVAILABLE = True
except ImportError:
    detector_manager = None
    DETECTOR_AVAILABLE = False

router = APIRouter(prefix="/cameras", tags=["cameras"])


def _is_local_video_source(source: str) -> bool:
    source_normalized = (source or "").strip().replace('\\', '/').lower()
    return (
        source_normalized.isdigit()
        or source_normalized.startswith('/')
        or (len(source_normalized) > 2 and source_normalized[1:3] == ':/')
        or source_normalized.endswith(('.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm'))
    )


def _allow_local_video_sources() -> bool:
    # Local/mock sources are useful for a portfolio demo but should be disabled in production.
    return bool(settings.ALLOW_LOCAL_VIDEO_SOURCES or settings.DEMO_MODE)


def _get_system_setting_int(db: Session, key: str, default: int) -> int:
    try:
        setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
        if setting and setting.value is not None:
            return int(setting.value)
    except Exception:
        pass
    return default

@router.get("", response_model=List[CameraResponse])
def list_cameras(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cameras = db.query(Camera).offset(skip).limit(limit).all()
    
    # Usar schema de resposta dedicado para garantir campos derivados corretos
    return [CameraResponse.from_orm(camera) for camera in cameras]

@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    return CameraResponse.from_orm(camera)

@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def create_camera(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Construir RTSP URL adequada
    camera_data = camera.model_dump()
    
    # Normalizar origem
    ip_normalized = camera.ip.replace('\\', '/')

    # Em modo demo, fontes locais/mock são permitidas para facilitar execução local.
    if _is_local_video_source(ip_normalized) and not _allow_local_video_sources():
        raise HTTPException(
            status_code=400,
            detail="Fonte de vídeo local/mock não suportada. Configure uma URL RTSP válida.",
        )

    if ip_normalized.lower().startswith("rtsp://"):
        rtsp_url = ip_normalized
    else:
        # Para câmeras RTSP tradicionais, construir URL completa
        rtsp_url = f"rtsp://{ip_normalized}:554/cam/realmonitor?channel={camera.channel}&subtype={camera.subtype}"
    
    # Mapear campos do schema para modelo do banco
    db_camera_data = {
        'name': camera.name,
        'location': camera.location,
        'zone_id': camera.zone_id,
        'rtsp_url': rtsp_url,
        'username': camera.rtsp_user if camera.rtsp_user else None,
        'password': camera.rtsp_password if camera.rtsp_password else None,
        'is_active': camera.enabled,
        'extra_data': {
            'channel': camera.channel,
            'subtype': camera.subtype,
            'confidence_threshold': camera.confidence_threshold,
            'cooldown_seconds': camera.cooldown_seconds,
            'schedule': camera.schedule,
        }
    }
    
    # Adicionar zona de detecção se fornecida
    if camera.detection_zone:
        db_camera_data['detection_zone'] = camera.detection_zone
    
    db_camera = Camera(**db_camera_data)
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    
    # Usar método personalizado para resposta 
    return CameraResponse.from_orm(db_camera)

@router.put("/{camera_id}", response_model=CameraResponse)
def update_camera(
    camera_id: UUID,
    camera_update: CameraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    update_data = camera_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_camera, field, value)
    
    db.commit()
    db.refresh(db_camera)
    
    return CameraResponse.from_orm(db_camera)

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.models.models import SystemLog
    
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    try:
        # Primeiro, parar o monitoramento se estiver ativo
        if DETECTOR_AVAILABLE and detector_manager and db_camera.is_monitoring:
            try:
                detector_manager.stop_detector(str(camera_id))
            except Exception as e:
                print(f"Erro ao parar detector: {e}")
        
        # Limpar referências em system_logs (SET NULL manualmente)
        db.query(SystemLog).filter(SystemLog.camera_id == camera_id).update(
            {"camera_id": None}, synchronize_session=False
        )
        
        # Deletar a câmera (AlertS e DetectionStats têm CASCADE automático)
        db.delete(db_camera)
        db.commit()
        return None
        
    except Exception as e:
        db.rollback()
        print(f"Erro ao deletar câmera {camera_id}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Erro ao deletar câmera: {str(e)}"
        )

@router.post("/{camera_id}/test")
def test_camera_connection(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    rtsp_url = camera.get_rtsp_url()
    test_result = {
        "camera_id": camera_id,
        "camera_name": camera.name,
        "rtsp_url": rtsp_url.replace(":","*") if ":" in rtsp_url else rtsp_url,  # Mask credentials
        "success": False,
        "message": "",
        "details": {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        import time
        start_time = time.time()
        
        # Test RTSP connection
        cap = cv2.VideoCapture(rtsp_url)
        
        if not cap.isOpened():
            test_result["message"] = "Falha ao conectar com a URL RTSP. Verifique as configurações."
            test_result["details"] = {
                "connection": "failed",
                "latency_ms": None,
                "resolution": None,
                "fps": None
            }
            return test_result
        
        # Try to read a frame to validate stream
        ret, frame = cap.read()
        connection_time = time.time() - start_time
        
        if ret and frame is not None:
            height, width = frame.shape[:2]
            
            # Get FPS if possible
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps == 0 or fps > 1000:  # Invalid FPS
                fps = None
            
            test_result.update({
                "success": True,
                "message": "Conexão RTSP bem-sucedida! Stream funcionando corretamente.",
                "details": {
                    "connection": "success",
                    "latency_ms": round(connection_time * 1000, 2),
                    "resolution": f"{width}x{height}",
                    "fps": fps,
                    "frame_captured": True
                }
            })
            
            # Update camera status in database
            camera.status = "online"
            camera.last_seen = datetime.utcnow()
            if fps:
                camera.fps = int(fps)
            camera.resolution = f"{width}x{height}"
            
        else:
            test_result["message"] = "Conexão estabelecida mas falha ao capturar frame do stream."
            test_result["details"] = {
                "connection": "partial",
                "latency_ms": round(connection_time * 1000, 2),
                "resolution": None,
                "fps": None,
                "frame_captured": False
            }
            
            camera.status = "error"
        
        cap.release()
        db.commit()
        
    except cv2.error as e:
        test_result["message"] = f"Erro OpenCV: {str(e)}"
        test_result["details"] = {
            "connection": "opencv_error",
            "error": str(e)
        }
        camera.status = "error"
        db.commit()
        
    except Exception as e:
        test_result["message"] = f"Erro de conexão: {str(e)}"
        test_result["details"] = {
            "connection": "exception",
            "error": str(e)
        }
        camera.status = "error"
        db.commit()
    
    return test_result

@router.get("/{camera_id}/snapshot")
def get_camera_snapshot(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Captura um frame atual da câmera RTSP"""
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    try:
        frame = None

        # Se o detector estiver disponível e rodando para esta câmera, usar o
        # último frame processado (mais estável, especialmente para vídeos MOT17).
        if DETECTOR_AVAILABLE and detector_manager:
            frame = detector_manager.get_camera_last_frame(camera.id)

        # Fallback: conectar diretamente ao stream RTSP se não houver frame em memória
        if frame is None:
            rtsp_url = camera.get_rtsp_url()
            cap = cv2.VideoCapture(rtsp_url)
            
            if not cap.isOpened():
                raise HTTPException(
                    status_code=400, 
                    detail="Não foi possível conectar à câmera. Verifique as configurações RTSP."
                )
            
            # Capturar frame
            ret, frame = cap.read()
            cap.release()
            
            if not ret or frame is None:
                raise HTTPException(
                    status_code=400, 
                    detail="Não foi possível capturar frame da câmera."
                )
        
        # Redimensionar para tamanho máximo (otimização)
        height, width = frame.shape[:2]
        if width > 1280:  # Limitar largura máxima
            scale = 1280 / width
            new_width = 1280
            new_height = int(height * scale)
            frame = cv2.resize(frame, (new_width, new_height))
        
        # Converter para JPEG
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        if buffer is None:
            raise HTTPException(status_code=500, detail="Erro ao processar imagem")
        
        # Retornar como resposta de imagem
        return Response(
            content=buffer.tobytes(),
            media_type="image/jpeg",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except cv2.error as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Erro OpenCV: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Erro interno: {str(e)}"
        )

@router.put("/{camera_id}/detection-zone")
def update_detection_zone(
    camera_id: UUID,
    zone_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualiza a zona de detecção da câmera"""
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    detection_zone = zone_data.get("detection_zone")
    
    # Validar formato da zona
    if detection_zone:
        required_keys = ["x1", "y1", "x2", "y2"]
        if not all(key in detection_zone for key in required_keys):
            raise HTTPException(
                status_code=400,
                detail="Zona de detecção deve conter x1, y1, x2, y2"
            )
        
        # Validar valores (devem ser entre 0.0 e 1.0)
        for key, value in detection_zone.items():
            if key in required_keys:
                if not isinstance(value, (int, float)) or not (0.0 <= value <= 1.0):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Valor {key} deve estar entre 0.0 e 1.0"
                    )
        
        # Validar que x2 > x1 e y2 > y1
        if detection_zone["x2"] <= detection_zone["x1"] or detection_zone["y2"] <= detection_zone["y1"]:
            raise HTTPException(
                status_code=400,
                detail="Zona inválida: coordenadas finais devem ser maiores que as iniciais"
            )
    
    # Atualizar zona
    camera.detection_zone = detection_zone
    db.commit()
    db.refresh(camera)
    
    return CameraResponse.from_orm(camera)


@router.post("/{camera_id}/start", status_code=status.HTTP_200_OK)
def start_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)  # ← Temporariamente desabilitado
):
    """Iniciar detecção em uma câmera"""
    # Verificar se a câmera existe
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    rtsp_url = camera.get_rtsp_url()
    if not rtsp_url:
        raise HTTPException(
            status_code=400,
            detail="A câmera deve estar configurada com uma origem de vídeo válida.",
        )

    is_local_source = _is_local_video_source(rtsp_url)
    if is_local_source and not _allow_local_video_sources():
        raise HTTPException(
            status_code=400,
            detail="A câmera deve estar configurada com URL RTSP válida (modo mock/local desabilitado).",
        )

    if (not is_local_source) and (not rtsp_url.lower().startswith("rtsp://")):
        raise HTTPException(
            status_code=400,
            detail="A câmera deve estar configurada com URL RTSP válida (modo mock/local desabilitado).",
        )
    
    # Verificar se detector_manager está disponível
    if not DETECTOR_AVAILABLE:
        # Modo básico: apenas testar conexão com câmera e atualizar status
        try:
            # Tentar conectar à câmera para validar
            cap = cv2.VideoCapture(rtsp_url)
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                
                if ret:
                    # Conexão OK, atualizar status
                    camera.status = "online"
                    camera.is_monitoring = True
                    camera.last_seen = datetime.utcnow()
                    db.commit()
                    
                    return {
                        "success": True,
                        "message": f"Câmera {camera.name} conectou com sucesso (modo básico)",
                        "camera_id": camera_id,
                        "status": "online",
                        "detector_available": False
                    }
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Câmera conectou mas não conseguiu capturar frame"
                    )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Não foi possível conectar à câmera"
                )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao testar câmera: {str(e)}"
            )
    
    # Modo completo com detector
    if not detector_manager:
        raise HTTPException(status_code=503, detail="Detector service not available")
    
    # Tentar iniciar a câmera
    try:
        success = detector_manager.add_camera(
            camera_id=str(camera.id),
            camera_name=camera.name,
            rtsp_url=rtsp_url,
            db_session=db
        )
        
        if success:
            # Atualizar status da câmera no banco
            camera.status = "online"
            camera.is_monitoring = True
            db.commit()
            
            return {
                "success": True,
                "message": f"Câmera {camera.name} iniciada com sucesso",
                "camera_id": camera_id,
                "status": "online"
            }
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Falha ao iniciar câmera {camera.name}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao iniciar câmera: {str(e)}"
        )


@router.post("/{camera_id}/stop", status_code=status.HTTP_200_OK)
def stop_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)  # ← Temporariamente desabilitado
):
    """Parar detecção em uma câmera"""
    # Verificar se a câmera existe
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Verificar se detector_manager está disponível
    if not DETECTOR_AVAILABLE:
        # Modo básico: apenas atualizar status
        camera.status = "offline"
        camera.is_monitoring = False
        db.commit()
        
        return {
            "success": True,
            "message": f"Câmera {camera.name} parada com sucesso (modo básico)",
            "camera_id": camera_id,
            "status": "offline",
            "detector_available": False
        }
    
    # Modo completo com detector  
    if not detector_manager:
        raise HTTPException(status_code=503, detail="Detector service not available")
    
    # Tentar parar a câmera
    try:
        success = detector_manager.remove_camera(str(camera.id))
        
        # Atualizar status da câmera no banco
        camera.status = "offline"
        camera.is_monitoring = False
        db.commit()
        
        return {
            "success": True,
            "message": f"Câmera {camera.name} parada com sucesso",
            "camera_id": camera_id,
            "status": "offline"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao parar câmera: {str(e)}"
        )


@router.get("/{camera_id}/stream")
async def stream_camera(
    camera_id: UUID,
    token: str = None,  # Token via query parameter para <img> tag
    db: Session = Depends(get_db)
):
    """Stream de vídeo em tempo real da câmera (MJPEG)"""
    from fastapi.responses import StreamingResponse
    from app.core.security import decode_token
    from app.core.config import settings
    
    # Autenticação via token query param (necessário para <img> tags)
    if not token:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    try:
        # Validar token
        payload = decode_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Token inválido")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    rtsp_url = camera.get_rtsp_url()
    if not rtsp_url:
        raise HTTPException(
            status_code=400,
            detail="A câmera deve estar configurada com uma origem de vídeo válida para streaming.",
        )

    is_local_source = _is_local_video_source(rtsp_url)
    if is_local_source and not _allow_local_video_sources():
        raise HTTPException(
            status_code=400,
            detail="A câmera deve estar configurada com URL RTSP válida para streaming.",
        )

    if (not is_local_source) and (not rtsp_url.lower().startswith("rtsp://")):
        raise HTTPException(
            status_code=400,
            detail="A câmera deve estar configurada com URL RTSP válida para streaming.",
        )
    
    def generate_frames():
        """Gerador de frames para streaming MJPEG"""
        import time
        cap = None

        def open_capture():
            local_cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
            if hasattr(cv2, "CAP_PROP_BUFFERSIZE"):
                local_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return local_cap

        try:
            # Frame rate alvo derivado da configuração global (MAX_FPS)
            # Limitamos a 30 FPS para evitar uso excessivo de CPU/banda.
            target_fps = max(1, min(_get_system_setting_int(db, "max_fps", settings.MAX_FPS), 30))
            frame_interval = 1.0 / target_fps
            last_frame_time = 0.0

            while True:
                if cap is None or not cap.isOpened():
                    cap = open_capture()
                    if not cap.isOpened():
                        if cap:
                            cap.release()
                        cap = None
                        time.sleep(1)
                        continue

                ret, frame = cap.read()
                if not ret:
                    cap.release()
                    cap = None
                    time.sleep(1)
                    continue
                
                # Redimensionar frame para economizar banda
                height, width = frame.shape[:2]
                if width > 1280:
                    scale = 1280 / width
                    new_width = 1280
                    new_height = int(height * scale)
                    frame = cv2.resize(frame, (new_width, new_height))
                
                # Codificar frame como JPEG
                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
                if not ret:
                    continue
                
                # Enviar frame no formato multipart
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

                # Controle simples de frame rate
                now = time.time()
                elapsed = now - last_frame_time
                if elapsed < frame_interval:
                    time.sleep(frame_interval - elapsed)
                last_frame_time = now
                
        except GeneratorExit:
            pass
        finally:
            if cap:
                cap.release()
    
    return StreamingResponse(
        generate_frames(),
        media_type='multipart/x-mixed-replace; boundary=frame',
        headers={
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Connection': 'close'
        }
    )



