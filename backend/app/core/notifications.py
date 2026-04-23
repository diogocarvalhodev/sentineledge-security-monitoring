"""
Backend - Sistema de Notificações em Tempo Real
Arquivo: backend/app/core/notifications.py

Este módulo fornece funções helper para enviar notificações via WebSocket
"""

from datetime import datetime
from typing import Optional, Dict, Any


async def send_notification(
    manager,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[Dict[str, Any]] = None,
    priority: str = "normal"
):
    """
    Enviar notificação genérica para todos os clientes conectados
    
    Args:
        manager: Instância do ConnectionManager
        notification_type: Tipo da notificação ('alert', 'camera_offline', 'system', etc)
        title: Título da notificação
        message: Mensagem descritiva
        data: Dados adicionais (opcional)
        priority: Prioridade ('low', 'normal', 'high', 'critical')
    
    Exemplo:
        await send_notification(
            manager,
            notification_type='new_alert',
            title='🚨 Novo Alerta',
            message='2 pessoas detectadas na Câmera 01',
            data={'alert_id': 123, 'camera_id': 1},
            priority='high'
        )
    """
    notification = {
        "type": "notification",
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "priority": priority,
        "data": data or {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.broadcast(notification)


async def notify_new_alert(
    manager,
    alert_id: int,
    camera_name: str,
    camera_location: str,
    person_count: int,
    confidence: float,
    is_critical: bool
):
    """
    Notificar sobre novo alerta criado
    
    Args:
        manager: Instância do ConnectionManager
        alert_id: ID do alerta
        camera_name: Nome da câmera
        camera_location: Localização da câmera
        person_count: Número de pessoas detectadas
        confidence: Nível de confiança da detecção
        is_critical: Se é horário crítico
    """
    priority = "critical" if is_critical else "high"
    title = "🚨 ALERTA CRÍTICO!" if is_critical else "⚠️ Novo Alerta"
    
    await send_notification(
        manager,
        notification_type="new_alert",
        title=title,
        message=f"{person_count} pessoa(s) detectada(s) em {camera_location}",
        data={
            "alert_id": alert_id,
            "camera_name": camera_name,
            "camera_location": camera_location,
            "person_count": person_count,
            "confidence": confidence,
            "is_critical": is_critical
        },
        priority=priority
    )


async def notify_camera_offline(
    manager,
    camera_id: int,
    camera_name: str,
    camera_location: str
):
    """
    Notificar que uma câmera ficou offline
    
    Args:
        manager: Instância do ConnectionManager
        camera_id: ID da câmera
        camera_name: Nome da câmera
        camera_location: Localização da câmera
    """
    await send_notification(
        manager,
        notification_type="camera_offline",
        title="📹 Câmera Offline",
        message=f"{camera_name} ({camera_location}) ficou offline",
        data={
            "camera_id": camera_id,
            "camera_name": camera_name,
            "camera_location": camera_location,
            "is_online": False
        },
        priority="high"
    )


async def notify_camera_online(
    manager,
    camera_id: int,
    camera_name: str,
    camera_location: str
):
    """
    Notificar que uma câmera voltou a ficar online
    
    Args:
        manager: Instância do ConnectionManager
        camera_id: ID da câmera
        camera_name: Nome da câmera
        camera_location: Localização da câmera
    """
    await send_notification(
        manager,
        notification_type="camera_online",
        title="📹 Câmera Online",
        message=f"{camera_name} voltou a ficar online",
        data={
            "camera_id": camera_id,
            "camera_name": camera_name,
            "camera_location": camera_location,
            "is_online": True
        },
        priority="normal"
    )


async def notify_alert_acknowledged(
    manager,
    alert_id: int,
    camera_name: str,
    acknowledged_by: str
):
    """
    Notificar que um alerta foi reconhecido
    
    Args:
        manager: Instância do ConnectionManager
        alert_id: ID do alerta
        camera_name: Nome da câmera
        acknowledged_by: Usuário que reconheceu
    """
    await send_notification(
        manager,
        notification_type="alert_acknowledged",
        title="✓ Alerta Reconhecido",
        message=f"Alerta da {camera_name} foi reconhecido por {acknowledged_by}",
        data={
            "alert_id": alert_id,
            "camera_name": camera_name,
            "acknowledged_by": acknowledged_by
        },
        priority="low"
    )


async def notify_system_message(
    manager,
    title: str,
    message: str,
    priority: str = "normal"
):
    """
    Enviar mensagem do sistema
    
    Args:
        manager: Instância do ConnectionManager
        title: Título da mensagem
        message: Conteúdo da mensagem
        priority: Prioridade da mensagem
    """
    await send_notification(
        manager,
        notification_type="system",
        title=title,
        message=message,
        priority=priority
    )
