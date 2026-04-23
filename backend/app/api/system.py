from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import shutil
import os
from pathlib import Path
from app.core.database import get_db
from app.core.config import settings
from app.core.security import require_admin
from app.models.models import SystemSettings, User

router = APIRouter(prefix="/system", tags=["system"])

UPLOAD_DIR = settings.UPLOAD_DIR
LOGO_FILENAME = "logo.png"

@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Upload da logo do sistema
    """
    # Validar tipo de arquivo
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Use PNG, JPG ou SVG."
        )
    
    # Validar tamanho (max 2MB)
    file.file.seek(0, 2)  # Ir para o final
    file_size = file.file.tell()
    file.file.seek(0)  # Voltar ao início
    
    if file_size > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(
            status_code=400,
            detail="Arquivo muito grande. Máximo 2MB."
        )
    
    try:
        # Criar diretório se não existir
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Salvar arquivo
        logo_path = os.path.join(UPLOAD_DIR, LOGO_FILENAME)
        
        with open(logo_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Salvar caminho no banco
        logo_setting = db.query(SystemSettings).filter(
            SystemSettings.key == "system_logo"
        ).first()
        
        if logo_setting:
            logo_setting.value = f"/{logo_path}"
        else:
            logo_setting = SystemSettings(
                key="system_logo",
                value=f"/{logo_path}",
                description="Logo do sistema"
            )
            db.add(logo_setting)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Logo atualizada com sucesso!",
            "path": f"/{logo_path}"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao salvar logo: {str(e)}"
        )

@router.get("/logo")
def get_logo(db: Session = Depends(get_db)):
    """
    Retorna o caminho da logo atual
    """
    logo_setting = db.query(SystemSettings).filter(
        SystemSettings.key == "system_logo"
    ).first()
    
    if logo_setting:
        return {
            "path": logo_setting.value,
            "has_logo": True
        }
    
    return {
        "path": None,
        "has_logo": False
    }

@router.delete("/logo")
def delete_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Remove a logo do sistema
    """
    try:
        # Deletar arquivo
        logo_path = os.path.join(UPLOAD_DIR, LOGO_FILENAME)
        if os.path.exists(logo_path):
            os.remove(logo_path)
        
        # Deletar do banco
        logo_setting = db.query(SystemSettings).filter(
            SystemSettings.key == "system_logo"
        ).first()
        
        if logo_setting:
            db.delete(logo_setting)
            db.commit()
        
        return {
            "success": True,
            "message": "Logo removida com sucesso!"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao remover logo: {str(e)}"
        )
