import React, { useEffect, useState } from 'react';
import { Camera, AlertTriangle, CheckCircle, Clock, MapPin, Users, Target, Calendar, Activity, Server, Database, Wifi, Zap, HardDrive } from 'lucide-react';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/Modal';
import { LoadingSpinner, SkeletonStats, SkeletonListItem, EmptyState } from '../components/LoadingStates';

const API_URL = 'http://localhost:8000';

export default function Dashboard() {
  const [statistics, setStatistics] = useState({
    total_cameras: 0,
    active_cameras: 0,
    total_alerts_today: 0,
    pending_alerts: 0,
    recent_alerts: []
  });
  const [systemHealth, setSystemHealth] = useState({
    backend: { status: 'unknown', latency: null },
    database: { status: 'unknown', latency: null },
    redis: { status: 'unknown', latency: null },
    websocket: { status: 'unknown', latency: null },
    cameras: { online: 0, offline: 0, total: 0 },
    memory_usage: null,
    cpu_usage: null,
    uptime: null
  });
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, alertId: null });
  const [selectedImage, setSelectedImage] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchStatistics();
    fetchSystemHealth();
    const interval = setInterval(() => {
      fetchStatistics();
      fetchSystemHealth();
    }, 5000); // Atualização a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      } else {
        // Se o endpoint não responder, marcar backend como offline
        setSystemHealth(prev => ({
          ...prev,
          backend: { status: 'error', latency: null }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar saúde do sistema:', error);
      setSystemHealth(prev => ({
        ...prev,
        backend: { status: 'error', latency: null }
      }));
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const camerasRes = await fetch(`${API_URL}/cameras`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!camerasRes.ok) {
        throw new Error('Erro ao buscar câmeras');
      }
      
      const cameras = await camerasRes.json();
      
      const alertsRes = await fetch(`${API_URL}/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!alertsRes.ok) {
        throw new Error('Erro ao buscar alertas');
      }
      
      const alerts = await alertsRes.json();
      
      const today = new Date().toDateString();
      const alertsToday = alerts.filter(a => 
        new Date(a.created_at).toDateString() === today
      );
      
      // Backend novo usa status/severity em vez de acknowledged/is_critical_hour
      const mappedAlerts = alerts.map(a => {
        const isAcknowledged = a.status && a.status !== 'pending';
        const isCritical = ['high', 'critical'].includes(a.severity);
        return { ...a, _isAcknowledged: isAcknowledged, _isCritical: isCritical };
      });

      setStatistics({
        total_cameras: cameras.length,
        active_cameras: cameras.filter(c => c.is_online).length,
        total_alerts_today: alertsToday.length,
        pending_alerts: mappedAlerts.filter(a => !a._isAcknowledged).length,
        recent_alerts: mappedAlerts.slice(0, 5)
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error(
        'Erro ao carregar dados',
        'Não foi possível carregar as estatísticas do dashboard. Tente novamente.'
      );
      setLoading(false);
    }
  };

  const handleAcknowledgeClick = (alertId) => {
    setConfirmModal({ isOpen: true, alertId });
  };

  const handleAcknowledge = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/alerts/${confirmModal.alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Erro ao reconhecer alerta');
      }

      await fetchStatistics();
      toast.success(
        'Alerta reconhecido!',
        'O alerta foi marcado como reconhecido com sucesso.'
      );
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
      toast.error(
        'Erro ao reconhecer alerta',
        'Não foi possível reconhecer o alerta. Tente novamente.'
      );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getServiceStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'warning':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'error':
      case 'offline':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getServiceIcon = (service, status) => {
    const iconProps = { size: 20 };
    switch (service) {
      case 'backend':
        return <Server {...iconProps} />;
      case 'database':
        return <Database {...iconProps} />;
      case 'redis':
        return <HardDrive {...iconProps} />;
      case 'websocket':
        return <Wifi {...iconProps} />;
      case 'system':
        return <Activity {...iconProps} />;
      default:
        return <Zap {...iconProps} />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold tracking-wider uppercase">
          <span className="glow-text-cyan">DASHBOARD</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm uppercase tracking-wide font-display">
          Monitoramento em tempo real do sistema de segurança
        </p>
      </div>

      {/* Statistics Cards */}
      {loading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="sentineledge-card p-6 stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Total de Câmeras
                </p>
                <p className="text-4xl font-bold text-slate-50 mt-2 font-mono">
                  {statistics.total_cameras}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Camera className="text-blue-400" size={28} />
              </div>
            </div>
          </div>

          <div className="sentineledge-card p-6 stat-card card-safe">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Câmeras Ativas
                </p>
                <p className="text-4xl font-bold glow-text-green mt-2 font-mono">
                  {statistics.active_cameras}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                <CheckCircle className="text-green-400" size={28} />
              </div>
            </div>
          </div>

          <div className="sentineledge-card p-6 stat-card card-warning">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Alertas Hoje
                </p>
                <p className="text-4xl font-bold text-amber-400 mt-2 font-mono">
                  {statistics.total_alerts_today}
                </p>
              </div>
              <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
                <AlertTriangle className="text-amber-400" size={28} />
              </div>
            </div>
          </div>

          <div className="sentineledge-card p-6 stat-card card-danger">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Alertas Pendentes
                </p>
                <p className="text-4xl font-bold glow-text-red mt-2 font-mono">
                  {statistics.pending_alerts}
                </p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                <Clock className="text-red-400" size={28} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Health */}
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold text-slate-100 uppercase tracking-wider mb-6">
          <span className="glow-text-cyan">System Health</span>
        </h2>
        
        {healthLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="sentineledge-card p-6 animate-pulse">
                <div className="h-4 bg-slate-700 rounded mb-4"></div>
                <div className="h-8 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Services Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Backend */}
              <div className="sentineledge-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Backend API
                  </span>
                  <div className={`p-1.5 rounded-lg border ${getServiceStatusColor(systemHealth.backend.status)}`}>
                    {getServiceIcon('backend', systemHealth.backend.status)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold capitalize ${getServiceStatusColor(systemHealth.backend.status).split(' ')[0]}`}>
                    {systemHealth.backend.status === 'healthy' ? 'Online' : 
                     systemHealth.backend.status === 'error' ? 'Offline' : systemHealth.backend.status}
                  </span>
                  {systemHealth.backend.latency && (
                    <span className="text-xs text-slate-500 font-mono">
                      {systemHealth.backend.latency}ms
                    </span>
                  )}
                </div>
              </div>

              {/* Database */}
              <div className="sentineledge-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    PostgreSQL
                  </span>
                  <div className={`p-1.5 rounded-lg border ${getServiceStatusColor(systemHealth.database.status)}`}>
                    {getServiceIcon('database', systemHealth.database.status)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold capitalize ${getServiceStatusColor(systemHealth.database.status).split(' ')[0]}`}>
                    {systemHealth.database.status === 'healthy' ? 'Online' : 
                     systemHealth.database.status === 'error' ? 'Offline' : systemHealth.database.status}
                  </span>
                  {systemHealth.database.latency && (
                    <span className="text-xs text-slate-500 font-mono">
                      {systemHealth.database.latency}ms
                    </span>
                  )}
                </div>
              </div>

              {/* Redis */}
              <div className="sentineledge-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Redis Cache
                  </span>
                  <div className={`p-1.5 rounded-lg border ${getServiceStatusColor(systemHealth.redis.status)}`}>
                    {getServiceIcon('redis', systemHealth.redis.status)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold capitalize ${getServiceStatusColor(systemHealth.redis.status).split(' ')[0]}`}>
                    {systemHealth.redis.status === 'healthy' ? 'Online' : 
                     systemHealth.redis.status === 'error' ? 'Offline' : systemHealth.redis.status}
                  </span>
                  {systemHealth.redis.latency && (
                    <span className="text-xs text-slate-500 font-mono">
                      {systemHealth.redis.latency}ms
                    </span>
                  )}
                </div>
              </div>

              {/* WebSocket */}
              <div className="sentineledge-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider">
                    Real-time
                  </span>
                  <div className={`p-1.5 rounded-lg border ${getServiceStatusColor(systemHealth.websocket.status)}`}>
                    {getServiceIcon('websocket', systemHealth.websocket.status)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold capitalize ${getServiceStatusColor(systemHealth.websocket.status).split(' ')[0]}`}>
                    {systemHealth.websocket.status === 'healthy' ? 'Connected' : 
                     systemHealth.websocket.status === 'error' ? 'Disconnected' : systemHealth.websocket.status}
                  </span>
                  {systemHealth.websocket.latency && (
                    <span className="text-xs text-slate-500 font-mono">
                      {systemHealth.websocket.latency}ms
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* System Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Camera Status */}
              <div className="sentineledge-card p-6">
                <h3 className="text-lg font-display font-bold text-slate-100 uppercase tracking-wider mb-4">
                  Cameras Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Online</span>
                    <span className="text-lg font-bold text-green-400 font-mono">
                      {systemHealth.cameras.online}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Offline</span>
                    <span className="text-lg font-bold text-red-400 font-mono">
                      {systemHealth.cameras.offline}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total</span>
                    <span className="text-lg font-bold text-cyan-400 font-mono">
                      {systemHealth.cameras.total}
                    </span>
                  </div>
                  {systemHealth.cameras.total > 0 && (
                    <div className="mt-3">
                      <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ 
                            width: `${(systemHealth.cameras.online / systemHealth.cameras.total) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 text-center">
                        {Math.round((systemHealth.cameras.online / systemHealth.cameras.total) * 100)}% online
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* System Resources */}
              <div className="sentineledge-card p-6">
                <h3 className="text-lg font-display font-bold text-slate-100 uppercase tracking-wider mb-4">
                  System Resources
                </h3>
                <div className="space-y-4">
                  {systemHealth.memory_usage && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-400">Memory</span>
                        <span className="text-sm font-mono text-slate-300">
                          {systemHealth.memory_usage}%
                        </span>
                      </div>
                      <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            systemHealth.memory_usage > 80 ? 'bg-red-500' :
                            systemHealth.memory_usage > 60 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${systemHealth.memory_usage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {systemHealth.cpu_usage && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-400">CPU</span>
                        <span className="text-sm font-mono text-slate-300">
                          {systemHealth.cpu_usage}%
                        </span>
                      </div>
                      <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            systemHealth.cpu_usage > 80 ? 'bg-red-500' :
                            systemHealth.cpu_usage > 60 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${systemHealth.cpu_usage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* System Info */}
              <div className="sentineledge-card p-6">
                <h3 className="text-lg font-display font-bold text-slate-100 uppercase tracking-wider mb-4">
                  System Info
                </h3>
                <div className="space-y-3">
                  {systemHealth.uptime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Uptime</span>
                      <span className="text-sm font-mono text-cyan-400">
                        {systemHealth.uptime}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Version</span>
                    <span className="text-sm font-mono text-cyan-400">
                      v1.0.0
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Environment</span>
                    <span className="text-sm font-mono text-green-400">
                      Production
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Last Check</span>
                    <span className="text-xs text-slate-500">
                      {new Date().toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      <div className="sentineledge-card">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wider">
            <span className="glow-text-cyan">Alertas Recentes</span>
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          ) : statistics.recent_alerts && statistics.recent_alerts.length > 0 ? (
            <div className="space-y-4">
              {statistics.recent_alerts.map((alert) => {
                const isAcknowledged = alert._isAcknowledged ?? (alert.status && alert.status !== 'pending');
                const isCritical = alert._isCritical ?? ['high', 'critical'].includes(alert.severity);

                // Confiança em porcentagem (aceita 0-1 ou 0-100)
                const rawConfidence = Number(alert.confidence ?? 0);
                const confidencePercent = rawConfidence > 1 ? rawConfidence : rawConfidence * 100;

                // URL da imagem alinhada com /uploads
                let imageUrl = null;
                if (alert.image_path) {
                  if (alert.image_path.startsWith('http')) {
                    imageUrl = alert.image_path;
                  } else {
                    let path = alert.image_path.replace(/^\/+/, '');
                    if (path.startsWith('uploads/')) {
                      imageUrl = `${API_URL}/${path}`;
                    } else {
                      imageUrl = `${API_URL}/uploads/${path}`;
                    }
                  }
                }

                return (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg transition-all ${
                      isAcknowledged
                        ? 'border-slate-700/50 bg-slate-800/30'
                        : isCritical
                        ? 'border-red-500/50 bg-red-950/30 card-critical'
                        : 'border-amber-500/50 bg-amber-950/20 card-warning'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-semibold text-slate-100 text-lg font-display uppercase tracking-wide">
                            {alert.camera?.name || `Câmera #${alert.camera_id}`}
                          </span>
                          {isCritical && (
                            <span className="badge-alert px-2 py-1 text-xs font-semibold rounded uppercase tracking-wider">
                              CRÍTICO
                            </span>
                          )}
                          {isAcknowledged && (
                            <span className="badge-online px-2 py-1 text-xs font-semibold rounded uppercase tracking-wider">
                              RECONHECIDO
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <MapPin size={16} className="text-cyan-400" />
                            <span>{alert.camera?.location || 'Local não especificado'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Target size={16} className="text-cyan-400" />
                            <span className="font-mono">Confiança: {Math.round(confidencePercent)}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Calendar size={16} className="text-cyan-400" />
                            <span className="font-mono">{formatDate(alert.created_at)}</span>
                          </div>
                        </div>

                        {alert.notes && (
                          <p className="text-sm text-slate-300 mb-3 italic bg-slate-900/40 p-2 rounded border border-slate-700/50">
                            📝 {alert.notes}
                          </p>
                        )}
                        
                        {imageUrl && (
                          <div className="mt-3">
                            <img
                              src={imageUrl}
                              alt={`Alerta #${alert.id} - ${alert.camera?.name || 'Câmera'}`}
                              className="rounded-lg border border-cyan-500/30 max-w-full h-auto max-h-64 object-contain shadow-lg hover:shadow-cyan-500/20 transition-all cursor-pointer hover:border-cyan-400/50"
                              onClick={() => setSelectedImage(imageUrl)}
                              onError={(e) => {
                                console.error('Erro ao carregar imagem:', e.target.src);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {!isAcknowledged && (
                        <button
                          onClick={() => handleAcknowledgeClick(alert.id)}
                          className="px-4 py-2 bg-cyan-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-cyan-400 transition-all flex-shrink-0 shadow-glow uppercase tracking-wider font-display hover:shadow-glow-lg"
                        >
                          Reconhecer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="Nenhum alerta recente"
              description="O sistema está monitorando continuamente"
            />
          )}
        </div>
      </div>

      {/* Image Modal - Tela cheia */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={selectedImage}
              alt="Alerta em tela cheia"
              className="max-w-full max-h-screen object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-slate-900/90 text-cyan-400 rounded-full p-2 hover:bg-slate-800 transition-all shadow-glow border border-cyan-500/30 hover:border-cyan-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, alertId: null })}
        onConfirm={handleAcknowledge}
        title="Reconhecer Alerta"
        message="Tem certeza que deseja marcar este alerta como reconhecido? Esta ação não pode ser desfeita."
        confirmText="Sim, reconhecer"
        cancelText="Cancelar"
        type="info"
      />
    </div>
  );
}