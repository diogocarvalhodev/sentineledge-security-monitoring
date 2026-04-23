"""
Backend - Sistema de Upload e Gerenciamento de Fotos
Arquivo: backend/app/api/photos.py

Funcionalidades:
- Upload de fotos para alertas
- Criação automática de thumbnails
- Validação de formato e tamanho
- Rotação automática (cleanup de fotos antigas)
- Estatísticas de armazenamento
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import os
import uuid
from datetime import datetime, timedelta
from PIL import Image
import io

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Alert

router = APIRouter(prefix="/photos", tags=["photos"])

# Configurações de diretórios
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PHOTOS_DIR = os.path.join(UPLOAD_DIR, "alerts")
THUMBNAILS_DIR = os.path.join(PHOTOS_DIR, "thumbnails")

# Criar diretórios se não existirem
os.makedirs(PHOTOS_DIR, exist_ok=True)
os.makedirs(THUMBNAILS_DIR, exist_ok=True)

# Configurações
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
THUMBNAIL_SIZE = (300, 300)
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}


def validate_image(file: UploadFile) -> bool:
    """Valida se o arquivo é uma imagem válida"""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False
    return True


def create_thumbnail(image_path: str, thumbnail_path: str):
    """Cria thumbnail da imagem mantendo proporção"""
    try:
        with Image.open(image_path) as img:
            # Converter para RGB se necessário
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Criar thumbnail mantendo proporção
            img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
            
            # Salvar com compressão
            img.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
            return True
    except Exception as e:
        print(f"Erro ao criar thumbnail: {e}")
        return False


@router.post("/upload/{alert_id}", status_code=status.HTTP_201_CREATED)
async def upload_photo(
    alert_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload de foto para um alerta
    
    Args:
        alert_id: ID do alerta
        file: Arquivo de imagem
        
    Returns:
        Informações da foto salva
    """
    
    # Validar alerta
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    # Validar formato
    if not validate_image(file):
        raise HTTPException(
            status_code=400,
            detail=f"Formato não permitido. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Ler arquivo
    content = await file.read()
    
    # Validar tamanho
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Máximo: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    try:
        # Gerar nome único
        ext = os.path.splitext(file.filename)[1].lower()
        filename = f"{alert_id}_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(PHOTOS_DIR, filename)
        thumbnail_filename = f"thumb_{filename}"
        thumbnail_path = os.path.join(THUMBNAILS_DIR, thumbnail_filename)
        
        # Salvar arquivo original
        with open(filepath, 'wb') as f:
            f.write(content)
        
        # Criar thumbnail
        thumbnail_created = create_thumbnail(filepath, thumbnail_path)
        
        # Atualizar alerta no banco
        image_url = f"/uploads/alerts/{filename}"
        thumbnail_url = f"/uploads/alerts/thumbnails/{thumbnail_filename}" if thumbnail_created else None
        
        alert.image_path = image_url
        alert.thumbnail_path = thumbnail_url
        db.commit()
        
        return {
            "success": True,
            "message": "Foto enviada com sucesso",
            "image_path": image_url,
            "thumbnail_path": thumbnail_url,
            "filename": filename,
            "size_bytes": len(content)
        }
        
    except Exception as e:
        db.rollback()
        # Limpar arquivos se houver erro
        if os.path.exists(filepath):
            os.remove(filepath)
        if thumbnail_created and os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
        raise HTTPException(status_code=500, detail=f"Erro ao salvar imagem: {str(e)}")


@router.delete("/{alert_id}")
async def delete_photo(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletar foto de um alerta
    
    Args:
        alert_id: ID do alerta
    """
    
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    if not alert.image_path:
        raise HTTPException(status_code=404, detail="Alerta não possui foto")
    
    try:
        # Extrair filename do path
        filename = os.path.basename(alert.image_path)
        thumbnail_filename = f"thumb_{filename}"
        
        filepath = os.path.join(PHOTOS_DIR, filename)
        thumbnail_path = os.path.join(THUMBNAILS_DIR, thumbnail_filename)
        
        # Deletar arquivos
        deleted_files = []
        if os.path.exists(filepath):
            os.remove(filepath)
            deleted_files.append("original")
        if os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
            deleted_files.append("thumbnail")
        
        # Atualizar banco
        alert.image_path = None
        alert.thumbnail_path = None
        db.commit()
        
        return {
            "success": True,
            "message": "Foto deletada com sucesso",
            "deleted_files": deleted_files
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar foto: {str(e)}")


@router.post("/cleanup")
async def cleanup_old_photos(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Limpar fotos antigas (rotação automática)
    
    Args:
        days: Número de dias (fotos mais antigas que isso serão deletadas)
    """
    
    # Apenas admins podem fazer cleanup
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem executar limpeza")
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Buscar alertas antigos com fotos
        old_alerts = db.query(Alert).filter(
            Alert.created_at < cutoff_date,
            Alert.image_path.isnot(None)
        ).all()
        
        deleted_count = 0
        space_freed = 0
        
        for alert in old_alerts:
            filename = os.path.basename(alert.image_path)
            thumbnail_filename = f"thumb_{filename}"
            
            filepath = os.path.join(PHOTOS_DIR, filename)
            thumbnail_path = os.path.join(THUMBNAILS_DIR, thumbnail_filename)
            
            # Calcular espaço
            if os.path.exists(filepath):
                space_freed += os.path.getsize(filepath)
                os.remove(filepath)
            
            if os.path.exists(thumbnail_path):
                space_freed += os.path.getsize(thumbnail_path)
                os.remove(thumbnail_path)
            
            # Atualizar banco
            alert.image_path = None
            alert.thumbnail_path = None
            deleted_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "space_freed_mb": round(space_freed / 1024 / 1024, 2),
            "cutoff_date": cutoff_date.isoformat(),
            "message": f"{deleted_count} fotos antigas foram deletadas, liberando {round(space_freed / 1024 / 1024, 2)}MB"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro no cleanup: {str(e)}")


@router.get("/stats")
async def get_photos_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Estatísticas de fotos e armazenamento
    """
    
    # Contadores do banco
    total_alerts = db.query(Alert).count()
    alerts_with_photos = db.query(Alert).filter(Alert.image_path.isnot(None)).count()
    
    # Calcular tamanho total em disco
    total_size = 0
    total_files = 0
    
    if os.path.exists(PHOTOS_DIR):
        for filename in os.listdir(PHOTOS_DIR):
            filepath = os.path.join(PHOTOS_DIR, filename)
            if os.path.isfile(filepath):
                total_size += os.path.getsize(filepath)
                total_files += 1
    
    # Tamanho dos thumbnails
    thumbnail_size = 0
    thumbnail_files = 0
    
    if os.path.exists(THUMBNAILS_DIR):
        for filename in os.listdir(THUMBNAILS_DIR):
            filepath = os.path.join(THUMBNAILS_DIR, filename)
            if os.path.isfile(filepath):
                thumbnail_size += os.path.getsize(filepath)
                thumbnail_files += 1
    
    return {
        "database": {
            "total_alerts": total_alerts,
            "alerts_with_photos": alerts_with_photos,
            "percentage": round((alerts_with_photos / total_alerts * 100) if total_alerts > 0 else 0, 2)
        },
        "storage": {
            "photos": {
                "total_files": total_files,
                "total_size_mb": round(total_size / 1024 / 1024, 2)
            },
            "thumbnails": {
                "total_files": thumbnail_files,
                "total_size_mb": round(thumbnail_size / 1024 / 1024, 2)
            },
            "total_size_mb": round((total_size + thumbnail_size) / 1024 / 1024, 2)
        },
        "directories": {
            "photos": PHOTOS_DIR,
            "thumbnails": THUMBNAILS_DIR
        },
        "config": {
            "max_file_size_mb": MAX_FILE_SIZE / 1024 / 1024,
            "allowed_extensions": list(ALLOWED_EXTENSIONS),
            "thumbnail_size": THUMBNAIL_SIZE
        }
    }