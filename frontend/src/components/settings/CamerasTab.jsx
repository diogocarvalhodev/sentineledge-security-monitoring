import React, { useState, useEffect } from 'react';
import { Camera, Plus, Edit2, Trash2, Search, X, Clock, Target } from 'lucide-react';
import DetectionZoneEditor from '../DetectionZoneEditor';

const API_URL = 'http://localhost:8000';

const CAMERA_BRANDS = [
  { 
    value: 'custom', 
    label: 'Configuração Manual',
    template: '',
    defaultUser: 'admin',
    defaultPort: 554,
    defaultChannel: 1,
    defaultSubtype: 0
  },
  { 
    value: 'hikvision', 
    label: 'Hikvision',
    template: 'rtsp://{user}:{password}@{ip}:{port}/Streaming/Channels/{channel}0{subtype}',
    defaultUser: 'admin',
    defaultPort: 554,
    defaultChannel: 1,
    defaultSubtype: 1
  },
  { 
    value: 'dahua', 
    label: 'Dahua',
    template: 'rtsp://{user}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype={subtype}',
    defaultUser: 'admin',
    defaultPort: 554,
    defaultChannel: 1,
    defaultSubtype: 0
  },
  { 
    value: 'intelbras', 
    label: 'Intelbras',
    template: 'rtsp://{user}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype={subtype}',
    defaultUser: 'admin',
    defaultPort: 554,
    defaultChannel: 1,
    defaultSubtype: 0
  },
  { 
    value: 'axis', 
    label: 'Axis',
    template: 'rtsp://{user}:{password}@{ip}:{port}/axis-media/media.amp',
    defaultUser: 'root',
    defaultPort: 554,
    defaultChannel: 1,
    defaultSubtype: 0
  },
  { 
    value: 'vivotek', 
    label: 'Vivotek',
    template: 'rtsp://{user}:{password}@{ip}:{port}/live.sdp',
    defaultUser: 'root',
    defaultPort: 554,
    defaultChannel: 1,
    defaultSubtype: 0
  },
  { 
    value: 'foscam', 
    label: 'Foscam',
    template: 'rtsp://{user}:{password}@{ip}:{port}/videoMain',
    defaultUser: 'admin',
    defaultPort: 554,
    defaultChannel: 1,
    defaultSubtype: 0
  }
];

const DAYS_OF_WEEK = [
  { key: 'sunday', label: 'Dom' },
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' }
];

const DEFAULT_SCHEDULE = {
  sunday: { enabled: true, start: '00:00', end: '23:59', critical: true },
  monday: { enabled: true, start: '06:00', end: '18:00', critical: false },
  tuesday: { enabled: true, start: '06:00', end: '18:00', critical: false },
  wednesday: { enabled: true, start: '06:00', end: '18:00', critical: false },
  thursday: { enabled: true, start: '06:00', end: '18:00', critical: false },
  friday: { enabled: true, start: '06:00', end: '18:00', critical: false },
  saturday: { enabled: true, start: '00:00', end: '23:59', critical: true }
};

export default function CamerasTab() {
  const [cameras, setCameras] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [zoneCamera, setZoneCamera] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    zone_id: null,
    brand: 'custom',
    ip: '',
    rtsp_user: 'admin',
    rtsp_password: '',
    channel: 1,
    subtype: 0,
    confidence_threshold: 0.5,
    cooldown_seconds: 120,
    schedule: DEFAULT_SCHEDULE,
    enabled: true
  });

  useEffect(() => {
    fetchCameras();
    fetchZones();
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
    }
  };

  const fetchZones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/zones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setZones(Array.isArray(data) ? data : []);
      } else {
        setZones([]);
      }
    } catch (error) {
      console.error('Erro ao carregar zonas:', error);
      setZones([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingCamera 
        ? `${API_URL}/cameras/${editingCamera.id}`
        : `${API_URL}/cameras`;
      
      const method = editingCamera ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchCameras();
        resetForm();
        alert(editingCamera ? 'Câmera atualizada!' : 'Câmera cadastrada!');
      } else {
        const error = await response.json();
        alert(`Erro: ${error.detail}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar câmera');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      location: camera.location,
      zone_id: camera.zone_id,
      brand: camera.brand || 'custom',
      ip: camera.ip,
      rtsp_user: camera.rtsp_user,
      rtsp_password: camera.rtsp_password,
      channel: camera.channel,
      subtype: camera.subtype,
      confidence_threshold: camera.confidence_threshold,
      cooldown_seconds: camera.cooldown_seconds,
      schedule: camera.schedule || DEFAULT_SCHEDULE,
      enabled: camera.enabled
    });
    setShowModal(true);
  };

  const handleBrandChange = (brandValue) => {
    const brand = CAMERA_BRANDS.find(b => b.value === brandValue);
    if (brand) {
      if (brandValue !== 'custom') {
        setFormData({
          ...formData,
          brand: brandValue,
          rtsp_user: brand.defaultUser,
          channel: brand.defaultChannel,
          subtype: brand.defaultSubtype
        });
      } else {
        setFormData({
          ...formData,
          brand: brandValue
        });
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta câmera?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/cameras/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchCameras();
      alert('Câmera deletada!');
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao deletar câmera');
    }
  };

  const updateSchedule = (day, field, value) => {
    setFormData({
      ...formData,
      schedule: {
        ...formData.schedule,
        [day]: {
          ...formData.schedule[day],
          [field]: value
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      zone_id: null,
      brand: 'custom',
      ip: '',
      rtsp_user: 'admin',
      rtsp_password: '',
      channel: 1,
      subtype: 0,
      confidence_threshold: 0.5,
      cooldown_seconds: 120,
      schedule: DEFAULT_SCHEDULE,
      enabled: true
    });
    setEditingCamera(null);
    setShowModal(false);
    setShowSchedule(false);
  };

  const filteredCameras = cameras.filter(camera =>
    camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    camera.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-100 uppercase tracking-wider">Câmeras</h2>
          <p className="text-slate-400 text-sm uppercase tracking-wide font-display">Gerencie as câmeras de segurança</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 shadow-glow font-display font-semibold uppercase tracking-wider text-sm"
        >
          <Plus size={20} />
          Nova Câmera
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Buscar câmera..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
        />
      </div>

      {/* Cameras List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCameras.map(camera => (
          <div key={camera.id} className="sentineledge-card p-4 hover:border-cyan-500/50 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 ${camera.is_online ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700/50 border border-slate-600'} rounded-lg flex items-center justify-center`}>
                  <Camera className={camera.is_online ? 'text-green-400' : 'text-slate-500'} size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">{camera.name}</h3>
                  <p className="text-xs text-slate-500">{camera.location}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setZoneCamera(camera);
                    setShowZoneEditor(true);
                  }}
                  className="p-1 text-amber-400 hover:bg-amber-500/10 rounded border border-transparent hover:border-amber-500/30"
                  title="Configurar Zona de Detecção"
                >
                  <Target size={16} />
                </button>
                <button
                  onClick={() => handleEdit(camera)}
                  className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded border border-transparent hover:border-cyan-500/30"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(camera.id)}
                  className="p-1 text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1 text-sm text-slate-400">
              <div className="font-mono">IP: {camera.ip}</div>
              {camera.zone && <div>Zona: {camera.zone.name}</div>}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${camera.is_online ? 'bg-green-400' : 'bg-slate-600'}`}></span>
                <span className={camera.is_online ? 'text-green-400' : 'text-slate-500'}>{camera.is_online ? 'Online' : 'Offline'}</span>
              </div>
              {camera.detection_zone && (
                <div className="flex items-center gap-1 text-xs">
                  <Target size={12} className="text-amber-400" />
                  <span className="text-amber-400">Zona de detecção configurada</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCameras.length === 0 && (
        <div className="sentineledge-card p-12 text-center">
          <Camera size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 font-display uppercase tracking-wide">Nenhuma câmera cadastrada</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-700/50 flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wider">
                {editingCamera ? 'Editar Câmera' : 'Nova Câmera'}
              </h3>
              <button onClick={resetForm} className="p-2 bg-slate-900/90 text-cyan-400 border border-cyan-500/30 rounded hover:bg-slate-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Informações Básicas */}
              <div>
                <h4 className="font-display font-semibold text-slate-200 mb-3 uppercase tracking-wider">Informações Básicas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Nome da Câmera *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="Ex: CORREDOR 3"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Local/Descrição *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="Ex: Corredor Principal"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Zona
                    </label>
                    <select
                      value={formData.zone_id || ''}
                      onChange={(e) => setFormData({ ...formData, zone_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="">Selecione uma zona</option>
                      {zones.map(zone => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Selecione a zona onde esta câmera está instalada
                    </p>
                  </div>
                </div>
              </div>

              {/* Conexão RTSP */}
              <div>
                <h4 className="font-display font-semibold text-slate-200 mb-3 uppercase tracking-wider">Conexão RTSP</h4>
                
                {/* Marca da Câmera */}
                <div className="mb-4 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                  <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Marca da Câmera
                  </label>
                  <select
                    value={formData.brand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 mb-2"
                  >
                    {CAMERA_BRANDS.map(brand => (
                      <option key={brand.value} value={brand.value}>
                        {brand.label}
                      </option>
                    ))}
                  </select>
                  {formData.brand !== 'custom' && (
                    <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                      <p className="text-xs text-cyan-400 font-mono break-all">
                        Template: {CAMERA_BRANDS.find(b => b.value === formData.brand)?.template}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Selecione a marca para preencher automaticamente as configurações RTSP
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      IP da Câmera *
                    </label>
                    <input
                      type="text"
                      value={formData.ip}
                      onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                      placeholder="10.21.150.78"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Usuário RTSP
                    </label>
                    <input
                      type="text"
                      value={formData.rtsp_user}
                      onChange={(e) => setFormData({ ...formData, rtsp_user: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="admin"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Senha RTSP
                    </label>
                    <input
                      type="password"
                      value={formData.rtsp_password}
                      onChange={(e) => setFormData({ ...formData, rtsp_password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Canal
                    </label>
                    <input
                      type="number"
                      value={formData.channel}
                      onChange={(e) => setFormData({ ...formData, channel: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Subtype
                    </label>
                    <select
                      value={formData.subtype}
                      onChange={(e) => setFormData({ ...formData, subtype: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value={0}>0 - Stream Principal</option>
                      <option value={1}>1 - Stream Extra</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Detecção */}
              <div>
                <h4 className="font-display font-semibold text-slate-200 mb-3 uppercase tracking-wider">Configurações de Detecção</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Confiança Mínima (%)
                    </label>
                    <input
                      type="number"
                      value={formData.confidence_threshold * 100}
                      onChange={(e) => setFormData({ ...formData, confidence_threshold: parseFloat(e.target.value) / 100 })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                      min="0"
                      max="100"
                      step="5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Cooldown (segundos)
                    </label>
                    <input
                      type="number"
                      value={formData.cooldown_seconds}
                      onChange={(e) => setFormData({ ...formData, cooldown_seconds: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                      min="0"
                      step="30"
                    />
                  </div>
                </div>
              </div>

              {/* Horários */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display font-semibold text-slate-200 uppercase tracking-wider">Horários de Monitoramento</h4>
                  <button
                    type="button"
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                  >
                    <Clock size={16} />
                    {showSchedule ? 'Ocultar' : 'Configurar Horários'}
                  </button>
                </div>

                {showSchedule && (
                  <div className="border border-slate-700 rounded-lg p-4 space-y-3 bg-slate-800/50">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day.key} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded border border-slate-700/50">
                        <input
                          type="checkbox"
                          checked={formData.schedule[day.key].enabled}
                          onChange={(e) => updateSchedule(day.key, 'enabled', e.target.checked)}
                          className="w-4 h-4 accent-cyan-500"
                        />
                        <div className="w-10 text-sm font-medium text-slate-300">{day.label}</div>
                        <input
                          type="time"
                          value={formData.schedule[day.key].start}
                          onChange={(e) => updateSchedule(day.key, 'start', e.target.value)}
                          disabled={!formData.schedule[day.key].enabled}
                          className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-200 rounded text-sm disabled:bg-slate-900/50 disabled:text-slate-600"
                        />
                        <span className="text-slate-500">até</span>
                        <input
                          type="time"
                          value={formData.schedule[day.key].end}
                          onChange={(e) => updateSchedule(day.key, 'end', e.target.value)}
                          disabled={!formData.schedule[day.key].enabled}
                          className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-200 rounded text-sm disabled:bg-slate-900/50 disabled:text-slate-600"
                        />
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.schedule[day.key].critical}
                            onChange={(e) => updateSchedule(day.key, 'critical', e.target.checked)}
                            disabled={!formData.schedule[day.key].enabled}
                            className="w-3 h-3 accent-red-500"
                          />
                          <span className="text-red-400">Crítico</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 accent-green-500"
                  />
                  <span className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wide">Câmera Ativa</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 disabled:opacity-50 shadow-glow font-display font-semibold uppercase tracking-wider"
                >
                  {loading ? 'Salvando...' : (editingCamera ? 'Atualizar' : 'Cadastrar')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detection Zone Editor */}
      {showZoneEditor && zoneCamera && (
        <DetectionZoneEditor
          camera={zoneCamera}
          onClose={() => {
            setShowZoneEditor(false);
            setZoneCamera(null);
          }}
          onSave={(updatedCamera) => {
            // Atualizar câmera na lista
            setCameras(prev => prev.map(cam => 
              cam.id === updatedCamera.id ? updatedCamera : cam
            ));
            setShowZoneEditor(false);
            setZoneCamera(null);
          }}
        />
      )}
    </div>
  );
}
