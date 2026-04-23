import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Edit, Trash2, Plus, X, Search, Building2 } from 'lucide-react';
import { OSMPlacesAutocomplete, CoordinatesDisplay } from '../OSMPlacesAutocomplete';

const API_URL = 'http://localhost:8000';

export default function ZonesTab() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: null,
    longitude: null,
    extra_data: {}
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/zones`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar zonas');
      }
      
      const data = await response.json();
      setZones(data);
    } catch (error) {
      console.error('Erro ao buscar zonas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (address, lat, lng) => {
    setFormData({
      ...formData,
      address,
      latitude: lat,
      longitude: lng
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar se selecionou endereço da lista
    if (!formData.latitude || !formData.longitude) {
      alert('Por favor, selecione um endereço da lista de sugestões para obter as coordenadas.');
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingZone 
        ? `${API_URL}/zones/${editingZone.id}`
        : `${API_URL}/zones`;
      
      const method = editingZone ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchZones();
        resetForm();
        alert(editingZone ? 'Zona atualizada com sucesso!' : 'Zona cadastrada com sucesso!');
      } else {
        const error = await response.json();
        alert(`Erro: ${error.detail || 'Não foi possível salvar a zona'}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar zona');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      address: zone.address,
      latitude: zone.latitude,
      longitude: zone.longitude,
      extra_data: zone.extra_data || {}
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta zona? Esta ação não pode ser desfeita.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/zones/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchZones();
        alert('Zona deletada com sucesso!');
      } else {
        const error = await response.json();
        alert(`Erro: ${error.detail || 'Não foi possível deletar a zona'}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao deletar zona');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      latitude: null,
      longitude: null,
      extra_data: {}
    });
    setEditingZone(null);
    setShowForm(false);
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    zone.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (zone.description && zone.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && zones.length === 0) {
    return <div className="text-center py-8 text-slate-400 font-display uppercase tracking-wide">Carregando zonas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-100 uppercase tracking-wider">Zonas de Monitoramento</h2>
          <p className="text-slate-400 text-sm uppercase tracking-wide font-display">Gerencie as áreas monitoradas pelo sistema</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 shadow-glow font-display font-semibold uppercase tracking-wider text-sm"
        >
          <Plus size={20} />
          Nova Zona
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Buscar zona..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="sentineledge-card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-display font-semibold">Total de Zonas</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{zones.length}</div>
        </div>
        <div className="sentineledge-card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-display font-semibold">Câmeras Ativas</div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {zones.reduce((sum, z) => sum + (z.camera_count || 0), 0)}
          </div>
        </div>
        <div className="sentineledge-card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-display font-semibold">Cobertura</div>
          <div className="text-2xl font-bold text-green-400 font-mono">
            {zones.filter(z => (z.camera_count || 0) > 0).length}
          </div>
        </div>
      </div>

      {/* Zones List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredZones.map(zone => (
          <div key={zone.id} className="sentineledge-card p-4 hover:border-cyan-500/50 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">{zone.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{zone.camera_count || 0} câmeras</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(zone)}
                  className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded border border-transparent hover:border-cyan-500/30"
                  title="Editar zona"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(zone.id)}
                  className="p-1 text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/30"
                  title="Deletar zona"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {zone.description && (
                <div className="text-slate-400 line-clamp-2">
                  {zone.description}
                </div>
              )}
              <div className="flex items-start gap-2 text-slate-400">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                <span className="line-clamp-2">{zone.address}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredZones.length === 0 && (
        <div className="sentineledge-card p-12 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 font-display uppercase tracking-wide">Nenhuma zona cadastrada</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-cyan-400 hover:text-cyan-300 font-display uppercase font-semibold tracking-wider text-sm"
          >
            Cadastrar primeira zona
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="sentineledge-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
              <h3 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wider">
                {editingZone ? 'Editar Zona' : 'Nova Zona'}
              </h3>
              <button onClick={resetForm} className="p-2 bg-slate-900/90 text-cyan-400 border border-cyan-500/30 rounded hover:bg-slate-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nome da Zona *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Ex: Centro Comercial, Zona Industrial, etc."
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Breve descrição da zona"
                />
              </div>

              {/* Endereço com OpenStreetMap Autocomplete */}
              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Endereço Completo *
                </label>
                <OSMPlacesAutocomplete
                  value={formData.address}
                  onChange={handleAddressChange}
                  placeholder="Digite o endereço e selecione da lista..."
                  required
                />
                
                {/* Mostrar coordenadas quando selecionado */}
                {formData.latitude && formData.longitude && (
                  <div className="mt-2">
                    <CoordinatesDisplay 
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                    />
                  </div>
                )}

                {/* Aviso se não selecionou da lista */}
                {formData.address && !formData.latitude && (
                  <p className="text-sm text-amber-400 mt-2 flex items-center gap-1">
                    <span>⚠️</span>
                    Selecione um endereço da lista para obter as coordenadas
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 disabled:opacity-50 shadow-glow font-display font-semibold uppercase tracking-wider"
                >
                  {loading ? 'Salvando...' : (editingZone ? 'Atualizar' : 'Cadastrar')}
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
    </div>
  );
}
