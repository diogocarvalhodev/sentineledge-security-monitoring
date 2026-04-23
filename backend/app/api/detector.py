"""
API Endpoints para Gerenciamento do Detector
Arquivo: backend/app/api/detector.py
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.core.detector import detector_manager

router = APIRouter(prefix="/detector", tags=["detector"])


@router.get("/status", response_model=List[Dict])
def get_detector_status(
    current_user: User = Depends(get_current_user)
):
    """
    Obter status de todos os detectores
    
    Retorna informações sobre cada detector ativo:
    - camera_id
    - camera_name
    - running
    - paused
    - last_detection
    - error_count
    """
    return detector_manager.get_status()


@router.get("/status/{camera_id}", response_model=Dict)
def get_camera_detector_status(
    camera_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Obter status do detector de uma câmera específica"""
    status = detector_manager.get_camera_status(camera_id)
    
    if not status:
        raise HTTPException(
            status_code=404,
            detail=f"Detector não encontrado para câmera {camera_id}"
        )
    
    return status


@router.post("/{camera_id}/pause")
def pause_camera_detector(
    camera_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """
    Pausar detecção de uma câmera
    
    A câmera continuará conectada mas não processará detecções
    """
    status = detector_manager.get_camera_status(camera_id)
    
    if not status:
        raise HTTPException(
            status_code=404,
            detail=f"Detector não encontrado para câmera {camera_id}"
        )
    
    detector_manager.pause_camera(camera_id)
    
    return {
        "success": True,
        "message": f"Detector da câmera {camera_id} pausado",
        "camera_id": camera_id
    }


@router.post("/{camera_id}/resume")
def resume_camera_detector(
    camera_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Retomar detecção de uma câmera pausada"""
    status = detector_manager.get_camera_status(camera_id)
    
    if not status:
        raise HTTPException(
            status_code=404,
            detail=f"Detector não encontrado para câmera {camera_id}"
        )
    
    detector_manager.resume_camera(camera_id)
    
    return {
        "success": True,
        "message": f"Detector da câmera {camera_id} retomado",
        "camera_id": camera_id
    }


@router.get("/health")
def detector_health_check(
    current_user: User = Depends(get_current_user)
):
    """
    Health check do sistema de detecção
    
    Retorna estatísticas gerais sobre o detector
    """
    detectors = detector_manager.get_status()
    
    total = len(detectors)
    running = sum(1 for d in detectors if d["running"])
    paused = sum(1 for d in detectors if d["paused"])
    errors = sum(1 for d in detectors if d["error_count"] > 0)
    
    return {
        "status": "healthy" if total > 0 else "no_detectors",
        "total_detectors": total,
        "running": running,
        "paused": paused,
        "with_errors": errors,
        "timestamp": datetime.utcnow().isoformat()
    }
