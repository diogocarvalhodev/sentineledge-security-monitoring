#!/usr/bin/env python3
"""
Script para criar usuário admin funcional
"""

import sys
import os
sys.path.append('/app')

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.core.database import SessionLocal, engine, Base
from app.models.models import User
from datetime import datetime
from uuid import uuid4

# Criar contexto de hash
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """Criar usuário admin com senha funcional"""
    db = SessionLocal()
    
    try:
        # Deletar usuário admin existente
        existing_user = db.query(User).filter(User.username == "admin").first()
        if existing_user:
            db.delete(existing_user)
            print("❌ Usuário admin existente removido")
        
        # Criar hash limpo
        password_hash = pwd_context.hash("admin")
        print(f"✅ Hash gerado: {password_hash}")
        
        # Criar novo usuário
        new_user = User(
            id=uuid4(),
            username="admin",
            full_name="Administrador",
            email="admin@sentineledge.local",
            hashed_password=password_hash,
            role="admin",
            is_active=True,
            is_superuser=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_user)
        db.commit()
        
        print("✅ Usuário admin criado com sucesso!")
        print("   Username: admin")
        print("   Password: admin")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar usuário: {e}")
        return False
    
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("🔐 CRIANDO USUÁRIO ADMIN FUNCIONAL")
    print("=" * 50)
    
    success = create_admin_user()
    
    if success:
        print("\n🎉 SUCESSO! Use admin/admin para fazer login")
    else:
        print("\n💥 FALHA! Verifique os logs")
    
    print("=" * 50)