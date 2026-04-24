import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, Filter, Camera, Calendar, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

const API_URL = 'http://localhost:8000';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, acknowledged
  const [criticalFilter, setCriticalFilter] = useState('all'); // all, critical, normal
  const [cameraFilter, setCameraFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchAlerts();
    fetchCameras();
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCameras = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/cameras`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCameras(data);
    } catch (error) {
      console.error('Erro ao carregar câmeras:', error);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.camera?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.camera?.location?.toLowerCase().includes(searchTerm.toLowerCase());

    // Backend novo usa status/severity em vez de acknowledged/is_critical_hour
    const isAcknowledged = alert.status && alert.status !== 'pending';
    const isCritical = ['high', 'critical'].includes(alert.severity);

    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'pending' && !isAcknowledged) ||
                         (statusFilter === 'acknowledged' && isAcknowledged);
    const matchesCritical = criticalFilter === 'all' ||
                           (criticalFilter === 'critical' && isCritical) ||
                           (criticalFilter === 'normal' && !isCritical);
    const matchesCamera = cameraFilter === 'all' || 
                         (alert.camera_id && alert.camera_id.toString() === cameraFilter);
    return matchesSearch && matchesStatus && matchesCritical && matchesCamera;
  });

  const stats = {
    total: alerts.length,
    pending: alerts.filter(a => !(a.status && a.status !== 'pending')).length,
    critical: alerts.filter(a => ['high', 'critical'].includes(a.severity)).length,
    withPhoto: alerts.filter(a => a.image_path).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando alertas...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-wider uppercase">
          <span className="glow-text-cyan">ALERTAS</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm uppercase tracking-wide font-display">
          Histórico completo de detecções de pessoas
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="sentineledge-card p-6 stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Total de Alertas</p>
              <p className="text-3xl sm:text-4xl font-bold text-slate-50 mt-2 font-mono">{stats.total}</p>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <AlertTriangle className="text-amber-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card card-danger">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Pendentes</p>
              <p className="text-3xl sm:text-4xl font-bold glow-text-red mt-2 font-mono">{stats.pending}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
              <XCircle className="text-red-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card card-critical">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Críticos</p>
              <p className="text-3xl sm:text-4xl font-bold glow-text-red mt-2 font-mono">{stats.critical}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
              <AlertTriangle className="text-red-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Com Foto</p>
              <p className="text-3xl sm:text-4xl font-bold text-blue-400 mt-2 font-mono">{stats.withPhoto}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <ImageIcon className="text-blue-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sentineledge-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-cyan-400" />
          <h2 className="text-lg font-display font-bold text-slate-100 uppercase tracking-wider">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Buscar alerta
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Câmera ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="acknowledged">Reconhecidos</option>
            </select>
          </div>

          {/* Critical Filter */}
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tipo de período
            </label>
            <select
              value={criticalFilter}
              onChange={(e) => setCriticalFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="critical">Apenas Críticos</option>
              <option value="normal">Apenas Normais</option>
            </select>
          </div>

          {/* Camera Filter */}
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Câmera
            </label>
            <select
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">Todas as Câmeras</option>
              {cameras.map(camera => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => {
          const isAcknowledged = alert.status && alert.status !== 'pending';
          const isCritical = ['high', 'critical'].includes(alert.severity);

          // Confiança em porcentagem (aceita 0-1 ou 0-100 vindo do backend)
          const rawConfidence = Number(alert.confidence ?? 0);
          const confidencePercent = rawConfidence > 1 ? rawConfidence : rawConfidence * 100;

          // URL da imagem (ajusta para /uploads quando vier caminho relativo)
          let imageUrl = null;
          if (alert.image_path) {
            if (alert.image_path.startsWith('http')) {
              imageUrl = alert.image_path;
            } else if (alert.image_path.startsWith('/demo/')) {
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
              className={`sentineledge-card p-6 ${
                isAcknowledged
                  ? 'border-l-4 border-slate-600'
                  : isCritical
                  ? 'border-l-4 border-red-500 card-critical'
                  : 'border-l-4 border-amber-500 card-warning'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold font-display text-slate-100 uppercase tracking-wide">
                      {alert.camera?.name || `Câmera #${alert.camera_id}`}
                    </h3>
                    {isCritical && (
                      <span className="badge-alert px-2 py-1 text-xs rounded font-medium uppercase tracking-wider">
                        CRÍTICO
                      </span>
                    )}
                    {isAcknowledged && (
                      <span className="badge-online px-2 py-1 text-xs rounded font-medium uppercase tracking-wider">
                        RECONHECIDO
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-slate-400 mb-3">
                    <p className="flex items-center gap-2">
                      <Camera size={16} className="text-cyan-400" />
                      {alert.camera?.location || 'Local não especificado'}
                    </p>
                    <p className="font-mono">🎯 Confiança: {Math.round(confidencePercent)}%</p>
                    <p className="flex items-center gap-2 font-mono">
                      <Calendar size={16} className="text-cyan-400" />
                      {formatDate(alert.created_at)}
                    </p>
                    {alert.notes && (
                      <p className="italic text-slate-300 mt-2 bg-slate-900/40 p-2 rounded border border-slate-700/50">📝 {alert.notes}</p>
                    )}
                  </div>

                  {/* Photo */}
                  {imageUrl && (
                    <div className="mt-3">
                      <img
                        src={imageUrl}
                        alt="Detecção"
                        className="w-full rounded-lg border border-cyan-500/30 sm:max-w-md cursor-pointer hover:border-cyan-400/50 hover:shadow-cyan-500/20 transition-all"
                        onClick={() => setSelectedImage(imageUrl)}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isAcknowledged && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 transition-all shadow-glow font-display font-bold uppercase tracking-wider hover:shadow-glow-lg sm:w-auto sm:flex-shrink-0"
                  >
                    <CheckCircle size={18} />
                    Reconhecer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
        <div className="text-center py-12 sentineledge-card">
          <AlertTriangle size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 font-display uppercase tracking-wider">
            {alerts.length === 0 
              ? 'Nenhum alerta registrado'
              : 'Nenhum alerta encontrado com os filtros selecionados'
            }
          </p>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={selectedImage}
              alt="Detecção ampliada"
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
    </div>
  );
}
