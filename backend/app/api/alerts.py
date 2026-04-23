from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID
import shutil
import os
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.models import User, Alert, Camera
from app.schemas.schemas import AlertCreate, AlertUpdate, AlertResponse
from app.core.notifications import notify_new_alert, notify_alert_acknowledged  # ← NOVO

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    skip: int = 0,
    limit: int = 100,
    camera_id: Optional[UUID] = None,
    acknowledged: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert)

    if camera_id:
        query = query.filter(Alert.camera_id == camera_id)

    # Compatibilidade: o parâmetro 'acknowledged' agora é mapeado para o campo 'status'
    # e/ou campos de revisão existentes (reviewed_by/reviewed_at).
    if acknowledged is not None:
        if acknowledged:
            # Considerar como "reconhecido" alertas que não estão mais pendentes
            query = query.filter(Alert.status != "pending")
        else:
            query = query.filter(Alert.status == "pending")

    alerts = query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()
    return alerts

@router.get("/stats/today")
def get_today_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)

    total_today = db.query(func.count(Alert.id)).filter(
        and_(
            Alert.created_at >= today,
            Alert.created_at < tomorrow
        )
    ).scalar()

    # Considerar como "pendentes" os alertas cujo status ainda está em aberto
    pending = db.query(func.count(Alert.id)).filter(
        Alert.status.in_(["pending", "reviewing"])
    ).scalar()

    return {
        "total_today": total_today,
        "pending": pending
    }

@router.get("/count")
def get_alerts_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna o total de alertas no sistema"""
    total = db.query(func.count(Alert.id)).scalar()
    return {"count": total}

@router.delete("/delete-all")
def delete_all_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove todos os alertas do sistema (PERMANENTE)

    Importante: esta rota vem antes de /alerts/{alert_id} para evitar que o
    path "delete-all" seja interpretado como um UUID inválido, o que causaria 422.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem executar esta ação"
        )
    
    # Contar alertas antes de deletar
    total = db.query(func.count(Alert.id)).scalar()
    
    # Buscar todos os alertas para deletar imagens
    alerts = db.query(Alert).all()
    
    # Deletar imagens físicas
    deleted_files = 0
    for alert in alerts:
        if alert.image_path and os.path.exists(alert.image_path):
            try:
                os.remove(alert.image_path)
                deleted_files += 1
            except Exception as e:
                print(f"Erro ao deletar imagem {alert.image_path}: {e}")
    
    # Deletar todos os registros
    db.query(Alert).delete()
    db.commit()
    
    return {
        "deleted": total,
        "files_deleted": deleted_files,
        "message": f"{total} alertas removidos com sucesso"
    }

@router.delete("/delete-old")
def delete_old_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove alertas com mais de 30 dias

    Também definida antes de /alerts/{alert_id} para evitar conflito de rota.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem executar esta ação"
        )
    
    # Data de corte (30 dias atrás)
    cutoff_date = datetime.now() - timedelta(days=30)
    
    # Buscar alertas antigos
    old_alerts = db.query(Alert).filter(Alert.created_at < cutoff_date).all()
    total = len(old_alerts)
    
    # Deletar imagens físicas
    deleted_files = 0
    for alert in old_alerts:
        if alert.image_path and os.path.exists(alert.image_path):
            try:
                os.remove(alert.image_path)
                deleted_files += 1
            except Exception as e:
                print(f"Erro ao deletar imagem {alert.image_path}: {e}")
    
    # Deletar registros antigos
    db.query(Alert).filter(Alert.created_at < cutoff_date).delete()
    db.commit()
    
    return {
        "deleted": total,
        "files_deleted": deleted_files,
        "message": f"{total} alertas antigos (>30 dias) removidos com sucesso"
    }

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter detalhes de um alerta específico.

    Importante: esta rota vem **depois** das rotas estáticas como /count, /stats/today,
    /delete-all e /delete-old para evitar conflito de rota (por exemplo,
    /alerts/count ou /alerts/delete-all sendo interpretados como um UUID inválido).
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(  # ← assíncrono para suportar notificação em tempo real
    alert: AlertCreate,
    db: Session = Depends(get_db)
):
    # Verifica se a câmera existe
    camera = db.query(Camera).filter(Camera.id == alert.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    db_alert = Alert(**alert.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    # Enviar notificação em tempo real
    from app.main import manager
    await notify_new_alert(
        manager=manager,
        alert_id=db_alert.id,
        camera_name=camera.name,
        camera_location=camera.location,
        person_count=alert.persons_count,
        confidence=alert.confidence,
        # Usar severidade do alerta para inferir criticidade
        is_critical=db_alert.severity in ("high", "critical")
    )
    
    return db_alert

@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: UUID,
    alert_update: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    update_data = alert_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_alert, field, value)
    
    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Delete image file if exists
    if db_alert.image_path and os.path.exists(db_alert.image_path):
        os.remove(db_alert.image_path)
    
    db.delete(db_alert)
    db.commit()
    return None

# ← NOVO: Endpoint específico para reconhecer alerta
@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reconhecer alerta e notificar outros usuários.

    Para manter compatibilidade com a API existente, este endpoint continua
    existindo, mas agora usa os campos 'status', 'reviewed_by' e 'reviewed_at'
    do modelo Alert, em vez de campos antigos como 'acknowledged_*'.
    """

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")

    # Atualizar alerta como reconhecido
    alert.status = "confirmed"
    alert.reviewed_by = current_user.id
    alert.reviewed_at = datetime.utcnow()
    db.commit()

    # Enviar notificação
    from app.main import manager
    camera = db.query(Camera).filter(Camera.id == alert.camera_id).first()

    if camera:
        await notify_alert_acknowledged(
            manager=manager,
            alert_id=alert_id,
            camera_name=camera.name,
            acknowledged_by=current_user.username
        )

    return {"success": True, "message": "Alerta reconhecido com sucesso"}

@router.post("/upload-image")
async def upload_alert_image(file: UploadFile = File(...)):
    # Create uploads directory if not exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"alert_{timestamp}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"image_path": file_path, "filename": filename}

@router.delete("/delete-all")
def delete_all_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove todos os alertas do sistema (PERMANENTE)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem executar esta ação"
        )
    
    # Contar alertas antes de deletar
    total = db.query(func.count(Alert.id)).scalar()
    
    # Buscar todos os alertas para deletar imagens
    alerts = db.query(Alert).all()
    
    # Deletar imagens físicas
    deleted_files = 0
    for alert in alerts:
        if alert.image_path and os.path.exists(alert.image_path):
            try:
                os.remove(alert.image_path)
                deleted_files += 1
            except Exception as e:
                print(f"Erro ao deletar imagem {alert.image_path}: {e}")
    
    # Deletar todos os registros
    db.query(Alert).delete()
    db.commit()
    
    return {
        "deleted": total,
        "files_deleted": deleted_files,
        "message": f"{total} alertas removidos com sucesso"
    }

@router.delete("/delete-old")
def delete_old_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove alertas com mais de 30 dias"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem executar esta ação"
        )
    
    # Data de corte (30 dias atrás)
    cutoff_date = datetime.now() - timedelta(days=30)
    
    # Buscar alertas antigos
    old_alerts = db.query(Alert).filter(Alert.created_at < cutoff_date).all()
    total = len(old_alerts)
    
    # Deletar imagens físicas
    deleted_files = 0
    for alert in old_alerts:
        if alert.image_path and os.path.exists(alert.image_path):
            try:
                os.remove(alert.image_path)
                deleted_files += 1
            except Exception as e:
                print(f"Erro ao deletar imagem {alert.image_path}: {e}")
    
    # Deletar registros antigos
    db.query(Alert).filter(Alert.created_at < cutoff_date).delete()
    db.commit()
    
    return {
        "deleted": total,
        "files_deleted": deleted_files,
        "message": f"{total} alertas antigos (>30 dias) removidos com sucesso"
    }