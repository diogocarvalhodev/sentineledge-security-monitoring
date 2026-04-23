import { useEffect, useRef, useState } from 'react';
import { useToast } from './Toast';

const IS_DEMO_MOCK = import.meta.env.VITE_DEMO_MOCK === 'true';
/**
 * Hook para gerenciar notificações em tempo real via WebSocket
 * 
 * Uso:
 * const { isConnected, requestNotificationPermission } = useRealtimeNotifications(userId);
 */
export function useRealtimeNotifications(userId) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);
  const ws = useRef(null);
  const toast = useToast();
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  useEffect(() => {
    if (!userId) return;

    if (IS_DEMO_MOCK) {
      setIsConnected(true);
      return;
    }

    const connect = () => {
      try {
        // Conectar ao WebSocket com token JWT na query (quando disponível)
        const token = localStorage.getItem('token');
        const wsUrl = token
          ? `ws://localhost:8000/ws?token=${encodeURIComponent(token)}`
          : `ws://localhost:8000/ws`;
        console.log('🔌 Conectando ao WebSocket...');
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('✓ WebSocket conectado');
          setIsConnected(true);
          reconnectAttempts.current = 0;
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleNotification(data);
          } catch (error) {
            console.error('Erro ao processar mensagem:', error);
          }
        };

        ws.current.onerror = (error) => {
          console.error('Erro no WebSocket:', error);
        };

        ws.current.onclose = () => {
          console.log('✗ WebSocket desconectado');
          setIsConnected(false);
          
          // Tentar reconectar com backoff exponencial
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current += 1;
            
            console.log(`Tentando reconectar em ${delay/1000}s... (tentativa ${reconnectAttempts.current})`);
            
            reconnectTimeout.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error('❌ Máximo de tentativas de reconexão atingido');
            toast.error(
              'Conexão perdida',
              'Não foi possível reconectar ao servidor. Recarregue a página.'
            );
          }
        };

        // Manter conexão viva (ping a cada 30s)
        const pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          }
        }, 30000);

        return () => clearInterval(pingInterval);
      } catch (error) {
        console.error('Erro ao conectar WebSocket:', error);
      }
    };

    connect();

    // Cleanup
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userId]);

  const handleNotification = (data) => {
    console.log('📬 Notificação recebida:', data);
    setLastNotification(data);

    // Processar diferentes tipos de notificação
    switch (data.type) {
      case 'alert':
        handleAlertNotification(data);
        break;

      case 'camera_status':
        handleCameraStatusNotification(data);
        break;

      case 'notification':
        handleCustomNotification(data);
        break;

      case 'pong':
        // Resposta ao ping, não fazer nada
        break;

      default:
        console.log('Tipo de notificação desconhecido:', data.type);
    }
  };

  const handleAlertNotification = (notification) => {
    const { data } = notification;
    
    const isCritical = data.is_critical || data.is_critical_hour;
    const title = isCritical ? '🚨 ALERTA CRÍTICO!' : '⚠️ Novo Alerta';
    const message = `${data.person_count} pessoa(s) detectada(s) em ${data.camera_name || 'câmera desconhecida'}`;

    if (isCritical) {
      toast.error(title, message);
      playNotificationSound('critical');
      showBrowserNotification(title, message, 'critical');
    } else {
      toast.warning(title, message);
      playNotificationSound('normal');
      showBrowserNotification(title, message, 'normal');
    }
  };

  const handleCameraStatusNotification = (notification) => {
    const { data } = notification;
    
    if (data.is_online === false) {
      toast.warning(
        '📹 Câmera Offline',
        `${data.camera_name || 'Uma câmera'} ficou offline`
      );
      playNotificationSound('normal');
    } else {
      toast.info(
        '📹 Câmera Online',
        `${data.camera_name || 'Uma câmera'} voltou a ficar online`
      );
    }
  };

  const handleCustomNotification = (notification) => {
    const { notification_type, title, message, priority, data } = notification;

    // Mostrar toast baseado na prioridade
    switch (priority) {
      case 'critical':
        toast.error(title, message);
        playNotificationSound('critical');
        showBrowserNotification(title, message, 'critical');
        break;

      case 'high':
        toast.warning(title, message);
        playNotificationSound('high');
        showBrowserNotification(title, message, 'high');
        break;

      case 'normal':
        toast.info(title, message);
        break;

      case 'low':
        // Não mostrar toast para baixa prioridade
        break;

      default:
        toast.info(title, message);
    }

    // Ações específicas por tipo
    switch (notification_type) {
      case 'new_alert':
        // Pode disparar evento customizado para atualizar lista de alertas
        window.dispatchEvent(new CustomEvent('newAlert', { detail: data }));
        break;

      case 'camera_offline':
        // Pode disparar evento customizado para atualizar status de câmera
        window.dispatchEvent(new CustomEvent('cameraStatusChanged', { detail: data }));
        break;

      case 'system':
        // Mensagens do sistema
        break;
    }
  };

  const playNotificationSound = (priority) => {
    try {
      // Criar audio context se não existir
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Criar oscilador para gerar som
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurar som baseado na prioridade
      if (priority === 'critical') {
        // Som mais urgente para crítico (3 beeps rápidos)
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 100);
        
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 800;
          gain2.gain.value = 0.3;
          osc2.start();
          setTimeout(() => osc2.stop(), 100);
        }, 150);
        
        setTimeout(() => {
          const osc3 = audioContext.createOscillator();
          const gain3 = audioContext.createGain();
          osc3.connect(gain3);
          gain3.connect(audioContext.destination);
          osc3.frequency.value = 800;
          gain3.gain.value = 0.3;
          osc3.start();
          setTimeout(() => osc3.stop(), 100);
        }, 300);
      } else {
        // Som normal (1 beep suave)
        oscillator.frequency.value = 520;
        gainNode.gain.value = 0.2;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      }
    } catch (error) {
      console.log('Não foi possível tocar o som:', error);
    }
  };

  const showBrowserNotification = (title, message, priority) => {
    // Verificar se o navegador suporta notificações
    if (!('Notification' in window)) {
      return;
    }

    // Mostrar notificação se permitido
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/badge.png',
        tag: `notification-${Date.now()}`,
        requireInteraction: priority === 'critical', // Críticas não fecham sozinhas
        silent: false
      });

      // Fechar automaticamente após 5s (exceto críticas)
      if (priority !== 'critical') {
        setTimeout(() => notification.close(), 5000);
      }

      // Clicar na notificação foca a janela
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  // Solicitar permissão para notificações do navegador
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✓ Permissão de notificações concedida');
          toast.success(
            'Notificações ativadas!',
            'Você receberá alertas em tempo real.'
          );
        }
      });
    }
  };

  return {
    isConnected,
    lastNotification,
    requestNotificationPermission
  };
}

// Componente para mostrar status de conexão
export function ConnectionStatus({ isConnected }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className="text-sm text-gray-600">
        {isConnected ? 'Conectado' : 'Desconectado'}
      </span>
    </div>
  );
}
