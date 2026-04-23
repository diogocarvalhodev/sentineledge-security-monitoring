import React, { useState, useEffect } from 'react';
import { Camera, Search, Filter, MapPin, AlertCircle, CheckCircle, X, Grid3x3, Monitor, Eye } from 'lucide-react';
import CameraFeed from '../components/CameraFeed';
import CameraModal from '../components/CameraModal';

const API_URL = 'http://localhost:8000';

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'feeds'
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchCameras();
    fetchZones();
    const interval = setInterval(fetchCameras, 10000);
    return () => clearInterval(interval);
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/zones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setZones(data);
    } catch (error) {
      console.error('Erro ao carregar zonas:', error);
    }
  };

  const filteredCameras = cameras.filter(camera => {
    const matchesSearch = camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         camera.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'online' && camera.is_online) ||
                         (statusFilter === 'offline' && !camera.is_online);
    const matchesZone = zoneFilter === 'all' || 
                         (camera.zone_id && camera.zone_id.toString() === zoneFilter);
    return matchesSearch && matchesStatus && matchesZone;
  });

  const stats = {
    total: cameras.length,
    online: cameras.filter(c => c.is_online).length,
    offline: cameras.filter(c => !c.is_online).length,
    withZone: cameras.filter(c => c.zone_id).length
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setZoneFilter('all');
  };

  const handleCameraClick = (camera) => {
    setSelectedCamera(camera);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCamera(null);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || zoneFilter !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando câmeras...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-wider uppercase">
              <span className="glow-text-cyan">CÂMERAS</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm uppercase tracking-wide font-display">
              Visualize e gerencie todas as câmeras de segurança
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-all font-display uppercase tracking-wider ${
                viewMode === 'cards'
                  ? 'bg-cyan-500 text-slate-900 shadow-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3x3 size={16} />
              Cards
            </button>
            <button
              onClick={() => setViewMode('feeds')}
              className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-all font-display uppercase tracking-wider ${
                viewMode === 'feeds'
                  ? 'bg-cyan-500 text-slate-900 shadow-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor size={16} />
              Feeds ao Vivo
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="sentineledge-card p-6 stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Total de Câmeras</p>
              <p className="text-4xl font-bold text-slate-50 mt-2 font-mono">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Camera className="text-blue-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card card-safe">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Online</p>
              <p className="text-4xl font-bold glow-text-green mt-2 font-mono">{stats.online}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <CheckCircle className="text-green-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card card-danger">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Offline</p>
              <p className="text-4xl font-bold glow-text-red mt-2 font-mono">{stats.offline}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
              <AlertCircle className="text-red-400" size={28} />
            </div>
          </div>
        </div>

        <div className="sentineledge-card p-6 stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">Com Zona</p>
              <p className="text-4xl font-bold text-purple-400 mt-2 font-mono">{stats.withZone}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <MapPin className="text-purple-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sentineledge-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-cyan-400" />
            <h2 className="text-lg font-display font-bold text-slate-100 uppercase tracking-wider">Filtros</h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 font-medium uppercase tracking-wider font-display"
            >
              <X size={16} />
              Limpar filtros
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Buscar câmera
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Nome ou localização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Status da câmera
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">Todos os Status</option>
              <option value="online">Apenas Online</option>
              <option value="offline">Apenas Offline</option>
            </select>
          </div>

          {/* Zone Filter */}
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Zona
            </label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">Todas as Zonas</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Camera Cards or Feeds */}
      {viewMode === 'cards' ? (
        /* Camera Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCameras.map(camera => (
            <div 
              key={camera.id} 
              className="sentineledge-card overflow-hidden hover:shadow-glow-lg transition-all duration-300 cursor-pointer"
              onClick={() => handleCameraClick(camera)}
            >
              {/* Card Header with Status Bar */}
              <div className={`h-1 ${camera.status === 'online' ? 'bg-gradient-to-r from-green-500 to-green-400 animate-pulse' : 'bg-slate-700'}`}></div>
              
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${camera.status === 'online' ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700/50 border border-slate-600'} rounded-lg flex items-center justify-center`}>
                      <Camera className={camera.status === 'online' ? 'text-green-400' : 'text-slate-500'} size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold font-display text-slate-100 text-lg uppercase tracking-wide">{camera.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                        <MapPin size={14} className="text-cyan-400" />
                        <span>{camera.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Feed */}
                {camera.status === 'online' && (
                  <div className="mb-4">
                    <CameraFeed 
                      camera={camera}
                      autoRefresh={true}
                      refreshInterval={5000}
                      showControls={false}
                      className="h-32"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-xs font-display">RTSP:</span>
                    <span className="font-mono text-cyan-400">
                      {camera.rtsp_url ? 'Configurado' : 'Não configurado'}
                    </span>
                  </div>
                  
                  {camera.zone && (
                    <div className="flex items-center justify-between text-sm bg-purple-500/10 p-3 rounded-lg border border-purple-500/30">
                      <span className="text-slate-400 font-medium uppercase tracking-wider text-xs font-display">Zona:</span>
                      <span className="text-purple-400 font-medium">{camera.zone.name}</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                      <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-display">Resolução</div>
                      <div className="text-lg font-bold text-blue-400 font-mono">
                        {camera.resolution || '1920x1080'}
                      </div>
                    </div>
                    <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/30">
                      <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-display">FPS</div>
                      <div className="text-lg font-bold text-orange-400 font-mono">
                        {camera.fps || 15}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider font-display ${
                    camera.status === 'online' 
                      ? 'badge-online' 
                      : 'badge-offline'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${camera.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    {camera.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                  {camera.is_active ? (
                    <span className="text-xs text-green-400 font-semibold flex items-center gap-1 uppercase tracking-wider font-display">
                      <CheckCircle size={14} />
                      Ativa
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 uppercase tracking-wider font-display">
                      <AlertCircle size={14} />
                      Desativada
                    </span>
                  )}
                  
                  {/* Click hint */}
                  <div className="flex items-center gap-1 text-xs text-cyan-400 opacity-70">
                    <Eye size={12} />
                    Clique para ver
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Live Feeds View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredCameras.map(camera => (
            <div key={camera.id} className="relative">
              <CameraFeed 
                camera={camera}
                autoRefresh={true}
                refreshInterval={2000}
                showControls={true}
                useStream={true}
                className="h-64 cursor-pointer"
                onError={(error) => console.error(`Erro na câmera ${camera.name}:`, error)}
              />
              <button
                onClick={() => handleCameraClick(camera)}
                className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
                title="Ver em tela cheia"
              >
                <Eye size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredCameras.length === 0 && (
        <div className="text-center py-16 sentineledge-card">
          <Camera size={64} className="mx-auto mb-4 text-slate-600" />
          <p className="text-xl font-display font-bold text-slate-200 mb-2 uppercase tracking-wider">
            {cameras.length === 0 
              ? 'Nenhuma câmera cadastrada'
              : 'Nenhuma câmera encontrada'
            }
          </p>
          <p className="text-slate-400">
            {cameras.length === 0
              ? 'Adicione câmeras para começar o monitoramento'
              : 'Tente ajustar os filtros para encontrar as câmeras'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 transition-all shadow-glow font-display font-bold uppercase tracking-wider"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Camera Modal */}
      <CameraModal
        camera={selectedCamera}
        isOpen={showModal}
        onClose={closeModal}
      />
    </div>
  );
}