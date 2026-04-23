from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import requests
from app.core.database import get_db
from app.core.config import settings as app_settings
from app.core.security import get_current_user, require_admin
from app.models.models import User, SystemSettings
from app.schemas.schemas import SettingCreate, SettingResponse

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=List[SettingResponse])
def list_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    settings = db.query(SystemSettings).all()
    return settings

@router.get("/detection")
def get_detection_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna configurações de detecção.

    Importante: esta rota específica vem antes de /settings/{key} para evitar
    que a string "detection" seja interpretada como um key genérico.
    """
    setting = db.query(SystemSettings).filter(
        SystemSettings.key == "show_bounding_boxes"
    ).first()
    
    # Default: True (mostrar bounding boxes)
    show_bounding_boxes = True
    if setting and isinstance(setting.value, str):
        show_bounding_boxes = setting.value.lower() == "true"
    
    return {"show_bounding_boxes": show_bounding_boxes}

@router.put("/detection")
def update_detection_settings(
    settings_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualiza configurações de detecção."""
    show_bounding_boxes = settings_data.get("show_bounding_boxes", True)
    
    # Salvar no banco
    setting = db.query(SystemSettings).filter(
        SystemSettings.key == "show_bounding_boxes"
    ).first()
    
    if setting:
        setting.value = "true" if show_bounding_boxes else "false"
    else:
        setting = SystemSettings(
            key="show_bounding_boxes",
            value="true" if show_bounding_boxes else "false",
            description="Mostrar caixas de detecção nas imagens de alerta"
        )
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    
    return {
        "show_bounding_boxes": show_bounding_boxes,
        "message": "Configurações atualizadas com sucesso"
    }

@router.get("/{key}", response_model=SettingResponse)
def get_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.post("", response_model=SettingResponse)
def create_or_update_setting(
    setting: SettingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_setting = db.query(SystemSettings).filter(SystemSettings.key == setting.key).first()
    
    if db_setting:
        # Update existing
        db_setting.value = setting.value
        if setting.description:
            db_setting.description = setting.description
    else:
        # Create new
        db_setting = SystemSettings(**setting.model_dump())
        db.add(db_setting)
    
    db.commit()
    db.refresh(db_setting)
    return db_setting

@router.post("/telegram/test")
def test_telegram(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if app_settings.DEMO_MODE or not app_settings.ENABLE_EXTERNAL_INTEGRATIONS:
        return {
            "success": True,
            "message": "Telegram test simulated in demo mode",
            "integration_mode": "mock"
        }

    # Get Telegram settings
    bot_token_setting = db.query(SystemSettings).filter(
        SystemSettings.key == "telegram_bot_token"
    ).first()
    
    chat_id_setting = db.query(SystemSettings).filter(
        SystemSettings.key == "telegram_chat_id"
    ).first()
    
    if not bot_token_setting or not chat_id_setting:
        raise HTTPException(
            status_code=400,
            detail="Telegram settings not configured"
        )
    
    # Send test message
    url = f"https://api.telegram.org/bot{bot_token_setting.value}/sendMessage"
    
    payload = {
        "chat_id": chat_id_setting.value,
        "text": "🔔 Teste de Conexão\n\nSistema de Segurança conectado com sucesso!",
        "parse_mode": "HTML"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        
        return {
            "success": True,
            "message": "Test message sent successfully"
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to send message: {str(e)}"
        )

@router.delete("/{key}")
def delete_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    db.delete(setting)
    db.commit()
    return {"message": "Setting deleted successfully"}
