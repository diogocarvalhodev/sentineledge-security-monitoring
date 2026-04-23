"""
Detector de Pessoas Integrado ao Backend - Optimized with AI Engine Singleton
Arquivo: backend/app/core/detector.py

Este módulo gerencia a detecção de pessoas em múltiplas câmeras
simultaneamente, reutilizando uma única instância YOLO.
"""

import cv2
import numpy as np
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import logging

from .ai_engine import get_yolo_detector, ProcessingEngine

logger = logging.getLogger(__name__)

# Timezone do Brasil (UTC-3)
BRAZIL_TZ = timezone(timedelta(hours=-3))


class RTSPStreamer:
    """Captura RTSP resiliente com thread dedicada e buffer de último frame."""

    def __init__(
        self,
        rtsp_url: str,
        reconnect_interval_seconds: int,
        open_timeout_ms: int,
        read_timeout_ms: int,
    ):
        self.rtsp_url = rtsp_url
        self.reconnect_interval_seconds = reconnect_interval_seconds
        self.open_timeout_ms = open_timeout_ms
        self.read_timeout_ms = read_timeout_ms

        self.running = False
        self.connected = False
        self.thread = None
        self.cap = None

        self._frame_lock = threading.Lock()
        self._last_frame = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        self._release_capture()

    def get_frame(self, timeout_seconds: float = 0.0):
        deadline = time.time() + timeout_seconds

        while self.running:
            with self._frame_lock:
                if self._last_frame is not None:
                    return self._last_frame.copy()

            if timeout_seconds <= 0:
                return None

            if time.time() >= deadline:
                return None

            time.sleep(0.01)

        return None

    def is_connected(self) -> bool:
        return self.connected

    def _capture_loop(self):
        while self.running:
            if not self._ensure_connection():
                time.sleep(self.reconnect_interval_seconds)
                continue

            ret, frame = self.cap.read()
            if not ret or frame is None:
                logger.warning("⚠️ Falha ao ler frame RTSP; tentando reconectar...")
                self._release_capture()
                time.sleep(self.reconnect_interval_seconds)
                continue

            with self._frame_lock:
                self._last_frame = frame

    def _ensure_connection(self) -> bool:
        if self.cap and self.cap.isOpened():
            self.connected = True
            return True

        try:
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)

            if hasattr(cv2, "CAP_PROP_OPEN_TIMEOUT_MSEC"):
                cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, self.open_timeout_ms)
            if hasattr(cv2, "CAP_PROP_READ_TIMEOUT_MSEC"):
                cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, self.read_timeout_ms)
            if hasattr(cv2, "CAP_PROP_BUFFERSIZE"):
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not cap.isOpened():
                cap.release()
                self.connected = False
                logger.error("❌ Não foi possível conectar ao stream RTSP")
                return False

            self.cap = cap
            self.connected = True
            logger.info("✓ Stream RTSP conectado")
            return True

        except Exception as e:
            self.connected = False
            logger.error(f"❌ Erro ao conectar stream RTSP: {e}")
            return False

    def _release_capture(self):
        self.connected = False
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None


class CameraDetector:
    """Detector de pessoas para uma câmera específica usando singleton YOLO"""
    
    def __init__(self, camera_id: int, camera_name: str, rtsp_url: str, db_session, cooldown_seconds: int = 30, confidence_threshold: float = 0.5):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.rtsp_url = rtsp_url
        self.db_session = db_session
        self.cooldown_seconds = cooldown_seconds
        self.confidence_threshold = confidence_threshold
        self.running = False
        self.paused = False
        self.thread = None
        self.last_detection = None
        self.error_count = 0
        self.max_errors = 10
        self.last_frame = None  # Último frame processado (para snapshots em tempo real)
        self.streamer = None

        self.rtsp_source = self.rtsp_url.strip() if self.rtsp_url else None

        if not self.rtsp_source:
            raise ValueError(f"Nenhuma RTSP URL configurada para câmera {camera_name}")

        if not str(self.rtsp_source).lower().startswith("rtsp://"):
            raise ValueError(
                f"Fonte inválida para câmera {camera_name}. Apenas RTSP é suportado: {self.rtsp_source}"
            )
        
        # Usar engine de IA otimizado (YOLOv8n singleton)
        self.processing_engine = ProcessingEngine(camera_id)
        logger.info(f"✓ YOLOv8n AI Engine loaded for camera {camera_name} (6MB shared singleton)")
    
    def start(self):
        """Iniciar detecção em thread separada"""
        if self.running:
            logger.warning(f"⚠️ Detector já rodando para {self.camera_name}")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._detection_loop, daemon=True)
        self.thread.start()
        logger.info(f"▶️ Detecção iniciada para {self.camera_name}")
    
    def stop(self):
        """Parar detecção"""
        self.running = False
        if self.streamer:
            self.streamer.stop()
        if self.thread:
            self.thread.join(timeout=5)
        logger.info(f"⏹️ Detecção parada para {self.camera_name}")
    
    def pause(self):
        """Pausar detecção temporariamente"""
        self.paused = True
        logger.info(f"⏸️ Detecção pausada para {self.camera_name}")
    
    def resume(self):
        """Retomar detecção"""
        self.paused = False
        logger.info(f"▶️ Detecção retomada para {self.camera_name}")
    
    def _detection_loop(self):
        """Loop principal de detecção"""
        camera_online = False
        reconnect_interval_seconds = _get_system_setting_int("rtsp_reconnect_interval_seconds", 5)
        open_timeout_ms = _get_system_setting_int("rtsp_open_timeout_ms", 5000)
        read_timeout_ms = _get_system_setting_int("rtsp_read_timeout_ms", 5000)
        
        try:
            logger.info(f"🔌 Iniciando stream RTSP da câmera {self.camera_name}...")
            self.streamer = RTSPStreamer(
                rtsp_url=self.rtsp_source,
                reconnect_interval_seconds=max(1, int(reconnect_interval_seconds)),
                open_timeout_ms=max(1000, int(open_timeout_ms)),
                read_timeout_ms=max(1000, int(read_timeout_ms)),
            )
            self.streamer.start()
            
            while self.running:
                # Se pausado, aguardar
                if self.paused:
                    time.sleep(1)
                    continue

                if self.streamer.is_connected():
                    if not camera_online:
                        logger.info(f"✓ Câmera {self.camera_name} conectada")
                        self._update_camera_status(True)
                        camera_online = True
                        self.error_count = 0
                else:
                    if camera_online:
                        logger.warning(f"⚠️ Câmera {self.camera_name} offline. Aguardando reconexão...")
                        self._update_camera_status(False)
                        camera_online = False
                    time.sleep(0.2)
                    continue
                
                frame = self.streamer.get_frame(timeout_seconds=1.0)
                
                if frame is None:
                    self.error_count += 1
                    logger.warning(
                        f"⚠️ Erro ao ler frame da câmera {self.camera_name} "
                        f"({self.error_count}/{self.max_errors})"
                    )
                    
                    # Não encerra detector; streamer faz reconexão em background
                    time.sleep(0.5)
                    continue
                
                # Reset contador de erros se leu com sucesso
                self.error_count = 0

                # Guardar último frame para visualização (snapshot)
                self.last_frame = frame
                
                # Detectar pessoas
                people_count = self._detect_people(frame)
                
                # Verificar ANTES de processar se deve criar alerta
                if people_count > 0:
                    # Verificar intervalo (evitar spam)
                    now = datetime.now(BRAZIL_TZ)
                    if self.last_detection:
                        time_diff = (now - self.last_detection).total_seconds()
                        if time_diff < self.cooldown_seconds:  # ← USA cooldown configurável
                            logger.debug(
                                f"⏸️ Aguardando intervalo: {int(self.cooldown_seconds - time_diff)}s restantes "
                                f"(câmera {self.camera_name}, cooldown={self.cooldown_seconds}s)"
                            )
                            time.sleep(1)
                            continue
                    
                    # OK, pode processar
                    self._handle_detection(people_count, frame)
                
                # Aguardar 1 segundo (1 FPS)
                time.sleep(1)
                
        except Exception as e:
            logger.error(f"❌ Erro no loop de detecção da câmera {self.camera_name}: {e}")
            self._update_camera_status(False)
        finally:
            if self.streamer:
                self.streamer.stop()
            logger.info(f"🔌 Câmera {self.camera_name} desconectada")
    
    def _detect_people(self, frame) -> int:
        """Detectar pessoas no frame usando YOLO singleton otimizado"""
        try:
            # Usar engine optimizado com rate limiting
            people_count = self.processing_engine.detect_people(frame, self.confidence_threshold)
            
            if people_count == 0:
                # Pode ser skipped por rate limiting, não é erro
                logger.debug(f"🔍 Camera {self.camera_name}: No people detected (or rate limited)")
            else:
                logger.debug(f"👥 Camera {self.camera_name}: {people_count} pessoas detectadas")
            
            return people_count
            
        except Exception as e:
            logger.error(f"Erro na detecção: {e}")
            return 0
    
    def _handle_detection(self, people_count: int, frame):
        """Processar detecção e criar alerta"""
        try:
            # Atualizar timestamp da última detecção
            now = datetime.now(BRAZIL_TZ)
            self.last_detection = now
            
            # Salvar imagem
            import os
            from app.core.config import settings

            # Usar diretório de uploads configurado (mesmo usado pelo main e pela API)
            base_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
            upload_dir = os.path.join(base_upload_dir, "alerts")
            os.makedirs(upload_dir, exist_ok=True)
            
            timestamp = now.strftime("%Y%m%d_%H%M%S")
            filename = f"alert_{self.camera_id}_{timestamp}.jpg"
            filepath = os.path.join(upload_dir, filename)

            # Aplicar bounding boxes se configuração do sistema estiver habilitada
            try:
                frame_to_save = self._apply_bounding_boxes_if_enabled(frame)
            except Exception as e:
                logger.error(f"Erro ao aplicar bounding boxes: {e}")
                frame_to_save = frame

            # Salvar imagem (com ou sem boxes)
            success = cv2.imwrite(filepath, frame_to_save)
            if not success:
                logger.error(f"❌ Erro ao salvar imagem: {filepath}")
                filepath = None
            else:
                logger.info(f"📸 Imagem salva: {filepath}")
                # Caminho relativo para o banco (compatível com StaticFiles montado em /uploads)
                filepath = f"alerts/{filename}"
            
            # Criar alerta no banco com nova sessão
            from app.models.models import Alert
            from app.core.database import SessionLocal
            
            # Criar nova sessão isolada
            db = SessionLocal()
            
            try:
                # Verificar se é horário crítico (22h-6h)
                hour = now.hour
                is_critical = hour >= 22 or hour < 6
                severity = "high" if is_critical else "medium"
                
                # Criar alerta com campos corretos do modelo
                alert = Alert(
                    camera_id=self.camera_id,
                    detected_object="person",  # Campo obrigatório
                    confidence=85.0,  # DECIMAL(5, 2)
                    persons_count=people_count,  # Plural conforme modelo
                    vehicles_count=0,
                    image_path=filepath,
                    severity=severity,  # low, medium, high, critical
                    status="pending",  # pending, reviewing, confirmed, false_positive, resolved
                    notified_telegram=False
                )
                
                db.add(alert)
                db.commit()
                db.refresh(alert)
                
                logger.info(
                    f"🚨 ALERTA criado: {people_count} pessoa(s) detectada(s) "
                    f"na câmera {self.camera_name} "
                    f"{'(CRÍTICO)' if is_critical else ''}"
                )
                
                # Enviar notificação WebSocket
                self._send_websocket_notification(alert, is_critical)
                
            except Exception as e:
                logger.error(f"Erro ao criar alerta no banco: {e}")
                db.rollback()
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"Erro ao processar detecção: {e}")

    def _apply_bounding_boxes_if_enabled(self, frame):
        """Desenhar bounding boxes nas imagens de alerta se estiver habilitado em Settings.

        - Lê a configuração `show_bounding_boxes` da tabela SystemSettings.
        - Quando ativo, usa o mesmo modelo YOLOv8 compartilhado para gerar boxes
          e desenhá-los sobre o frame antes de salvar a imagem de alerta.
        """
        try:
            # Verificar configuração no banco
            from app.models.models import SystemSettings
            from app.core.database import SessionLocal
            from app.core.ai_engine import get_yolo_detector

            db = SessionLocal()
            try:
                setting = db.query(SystemSettings).filter(
                    SystemSettings.key == "show_bounding_boxes"
                ).first()

                # Default: True (mostrar boxes)
                show_bounding_boxes = True
                if setting and isinstance(setting.value, str):
                    show_bounding_boxes = setting.value.lower() == "true"

            finally:
                db.close()

            if not show_bounding_boxes:
                return frame

            # Obter detector YOLOv8 compartilhado
            detector = get_yolo_detector()
            if not detector.model_loaded:
                return frame

            # Rodar inferência para obter boxes
            with detector.detection_lock:
                results = detector.model(
                    frame,
                    classes=[0],  # pessoa
                    conf=self.confidence_threshold,
                    verbose=False,
                    stream=False
                )

            if not results or len(results) == 0 or results[0].boxes is None:
                return frame

            result = results[0]
            boxes = result.boxes

            # Desenhar boxes no frame
            output = frame.copy()
            for box in boxes:
                try:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = None
                    if getattr(box, "conf", None) is not None:
                        conf = float(box.conf[0].item())

                    color = (0, 255, 0)
                    cv2.rectangle(
                        output,
                        (int(x1), int(y1)),
                        (int(x2), int(y2)),
                        color,
                        2
                    )

                    if conf is not None:
                        label = f"{conf * 100:.0f}%"
                        cv2.putText(
                            output,
                            label,
                            (int(x1), int(y1) - 10),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.5,
                            color,
                            1,
                            cv2.LINE_AA
                        )
                except Exception as e:
                    logger.error(f"Erro ao desenhar box de detecção: {e}")

            return output

        except Exception as e:
            logger.error(f"Erro ao aplicar configuração de bounding boxes: {e}")
            return frame

    def get_last_frame(self):
        """Retornar uma cópia do último frame processado.

        Usado pelos endpoints de snapshot para evitar múltiplas conexões
        independentes à mesma câmera (especialmente em vídeos de arquivo,
        como MOT17, onde reabrir o arquivo sempre volta ao início).
        """
        try:
            if self.last_frame is None:
                return None
            return self.last_frame.copy()
        except Exception:
            return None
    
    def _update_camera_status(self, is_online: bool):
        """Atualizar status da câmera no banco"""
        try:
            from app.models.models import Camera
            from app.core.database import SessionLocal
            
            # Criar nova sessão isolada
            db = SessionLocal()
            
            try:
                camera = db.query(Camera).filter(
                    Camera.id == self.camera_id
                ).first()
                
                if camera:
                    # Atualizar campo de status existente (online/offline)
                    camera.status = "online" if is_online else "offline"
                    camera.last_seen = datetime.now(BRAZIL_TZ).replace(tzinfo=None)  # Remove timezone para salvar no banco
                    db.commit()
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Erro ao atualizar status da câmera: {e}")
    
    def _send_websocket_notification(self, alert, is_critical: bool):
        """Enviar notificação via WebSocket"""
        try:
            from app.main import manager
            from app.core.notifications import notify_new_alert
            from app.core.database import SessionLocal
            import asyncio
            
            # Criar nova sessão isolada
            db = SessionLocal()
            
            try:
                # Buscar câmera
                from app.models.models import Camera
                camera = db.query(Camera).filter(
                    Camera.id == self.camera_id
                ).first()
                
                if camera:
                    # Criar nova event loop se necessário (thread diferente)
                    try:
                        loop = asyncio.get_event_loop()
                    except RuntimeError:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                    
                    # Enviar notificação
                    loop.run_until_complete(
                        notify_new_alert(
                            manager=manager,
                            alert_id=alert.id,
                            camera_name=camera.name,
                            camera_location=camera.location,
                            person_count=alert.persons_count,  # Corrigido para persons_count (plural)
                            confidence=alert.confidence,
                            is_critical=is_critical
                        )
                    )
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Erro ao enviar notificação WebSocket: {e}")
    
    def get_status(self) -> Dict:
        """Obter status atual do detector"""
        engine_stats = self.processing_engine.get_stats()
        
        return {
            "camera_id": self.camera_id,
            "camera_name": self.camera_name,
            "running": self.running,
            "paused": self.paused,
            "last_detection": self.last_detection.isoformat() if self.last_detection else None,
            "error_count": self.error_count,
            "ai_engine": {
                "detector_loaded": engine_stats.get("detector_loaded", False),
                "total_detections": engine_stats.get("total_detections", 0),
                "processing_interval": engine_stats.get("processing_interval", 0),
                "model_type": "YOLOv8n (shared singleton)"
            },
            "stream": {
                "connected": self.streamer.is_connected() if self.streamer else False,
                "source": self.rtsp_source,
            },
        }


class DetectorManager:
    """Gerenciador de múltiplos detectores de câmera"""
    
    def __init__(self):
        self.detectors: Dict[int, CameraDetector] = {}
        self.running = False
        self.monitor_thread = None
        self.db_session = None
    
    def start(self, db_session):
        """Iniciar gerenciador de detectores"""
        self.db_session = db_session
        self.running = True
        
        # Iniciar thread de monitoramento
        self.monitor_thread = threading.Thread(
            target=self._monitor_cameras, 
            daemon=True
        )
        self.monitor_thread.start()
        
        logger.info("🚀 DetectorManager iniciado")
    
    def stop(self):
        """Parar todos os detectores"""
        self.running = False
        
        for detector in self.detectors.values():
            detector.stop()
        
        self.detectors.clear()
        logger.info("⏹️ DetectorManager parado")
    
    def _monitor_cameras(self):
        """Monitorar câmeras e ajustar detectores"""
        while self.running:
            try:
                self._sync_detectors()
                time.sleep(10)  # Verificar a cada 10 segundos
            except Exception as e:
                logger.error(f"Erro no monitoramento: {e}")
                time.sleep(30)
    
    def _sync_detectors(self):
        """Sincronizar detectores com câmeras do banco"""
        try:
            from app.models.models import Camera
            from app.core.database import SessionLocal
            
            # Criar nova sessão isolada
            db = SessionLocal()
            
            try:
                # Buscar todas as câmeras
                cameras = db.query(Camera).all()
                
                camera_ids = {camera.id for camera in cameras}
                detector_ids = set(self.detectors.keys())
                
                # Remover detectores de câmeras que não existem mais
                for camera_id in detector_ids - camera_ids:
                    logger.info(f"🗑️ Removendo detector da câmera ID {camera_id}")
                    self.detectors[camera_id].stop()
                    del self.detectors[camera_id]
                
                # Adicionar detectores para novas câmeras
                for camera in cameras:
                    if camera.id not in self.detectors:
                        logger.info(f"➕ Adicionando detector para câmera {camera.name}")
                        try:
                            # Usar método get_rtsp_url() para montar URL
                            rtsp_url = camera.get_rtsp_url()
                            
                            # Extrair configurações de extra_data
                            extra_data = camera.extra_data or {}
                            
                            # Usar cooldown_seconds da câmera (padrão: 120s)
                            cooldown = extra_data.get('cooldown_seconds', 120)
                            
                            # Usar confidence_threshold da câmera (padrão: 0.5)
                            confidence = extra_data.get('confidence_threshold', 0.5)
                            
                            detector = CameraDetector(
                                camera_id=camera.id,
                                camera_name=camera.name,
                                rtsp_url=rtsp_url,
                                db_session=None,
                                cooldown_seconds=cooldown,  # ← Cooldown configurável
                                confidence_threshold=confidence  # ← NOVO: Confiança configurável
                            )
                            detector.start()
                            self.detectors[camera.id] = detector
                            
                            logger.info(
                                f"✓ Detector configurado: cooldown={cooldown}s, "
                                f"confiança={confidence}"
                            )
                        except Exception as e:
                            logger.error(f"❌ Erro ao criar detector para {camera.name}: {e}")
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"Erro ao sincronizar detectores: {e}")
    
    def pause_camera(self, camera_id: int):
        """Pausar detecção de uma câmera"""
        if camera_id in self.detectors:
            self.detectors[camera_id].pause()
    
    def resume_camera(self, camera_id: int):
        """Retomar detecção de uma câmera"""
        if camera_id in self.detectors:
            self.detectors[camera_id].resume()
    
    def add_camera(self, camera_id: str, camera_name: str, rtsp_url: str, db_session=None) -> bool:
        """Adicionar e iniciar uma nova câmera"""
        try:
            camera_id_int = camera_id  # Manter como string inicialmente
            
            # Verificar se já existe
            if camera_id in self.detectors:
                logger.warning(f"Câmera {camera_name} já está ativa")
                return True
                
            # Criar detector
            detector = CameraDetector(
                camera_id=camera_id,
                camera_name=camera_name,
                rtsp_url=rtsp_url,
                db_session=db_session,
                cooldown_seconds=120,
                confidence_threshold=0.5
            )
            
            # Iniciar detector
            detector.start()
            self.detectors[camera_id] = detector
            
            logger.info(f"✅ Câmera {camera_name} adicionada e iniciada")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao adicionar câmera {camera_name}: {e}")
            return False
    
    def remove_camera(self, camera_id: str) -> bool:
        """Remover e parar uma câmera"""
        try:
            if camera_id in self.detectors:
                # Parar detector
                self.detectors[camera_id].stop()
                
                # Remover da lista
                del self.detectors[camera_id]
                
                logger.info(f"✅ Câmera {camera_id} removida e parada")
                return True
            else:
                logger.warning(f"Câmera {camera_id} não encontrada nos detectores ativos")
                return True  # Consideramos sucesso se já não estava ativa
                
        except Exception as e:
            logger.error(f"❌ Erro ao remover câmera {camera_id}: {e}")
            return False
    
    def get_status(self) -> List[Dict]:
        """Obter status de todos os detectores"""
        return [
            detector.get_status() 
            for detector in self.detectors.values()
        ]
    
    def get_camera_status(self, camera_id: int) -> Optional[Dict]:
        """Obter status de um detector específico"""
        if camera_id in self.detectors:
            return self.detectors[camera_id].get_status()
        return None

    def get_camera_last_frame(self, camera_id) -> Optional["np.ndarray"]:
        """Obter o último frame processado de uma câmera, se existir detector.

        Usa a mesma chave de dicionário já utilizada internamente (camera_id
        tal como foi registrado em _sync_detectors/add_camera).
        """
        detector = self.detectors.get(camera_id)
        if not detector:
            return None
        return detector.get_last_frame()


# Instância global do gerenciador
detector_manager = DetectorManager()


def _get_system_setting_int(key: str, default: int) -> int:
    """Obtém configuração inteira do banco com fallback seguro."""
    try:
        from app.models.models import SystemSettings
        from app.core.database import SessionLocal

        db = SessionLocal()
        try:
            setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
            if setting and setting.value is not None:
                return int(setting.value)
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Falha ao ler setting {key}: {e}")
    return default
