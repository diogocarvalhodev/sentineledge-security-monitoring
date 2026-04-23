import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, AlertTriangle, CheckCircle, XCircle, MapPin, School, Building2 } from 'lucide-react';

const API_URL = 'http://localhost:8000';

// Fix para ícones do Leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícones customizados
const createCustomIcon = (color, isSchool = false) => {
  const innerShape = isSchool ? 
    `<rect x="8" y="6" width="8" height="6" fill="#fff"/>
     <polygon points="12,3 8,6 16,6" fill="#fff"/>` :
    `<circle fill="#fff" cx="12" cy="8" r="3"/>`;
    
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
        <path fill="${color}" stroke="#000" stroke-width="1" d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8z"/>
        ${innerShape}
      </svg>
    `)}`,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48]
  });
};

const cameraGreenIcon = createCustomIcon('#10b981', false);
const cameraYellowIcon = createCustomIcon('#f59e0b', false);
const cameraRedIcon = createCustomIcon('#ef4444', false);
const cameraGrayIcon = createCustomIcon('#6b7280', false);
const schoolIcon = createCustomIcon('#3b82f6', true);

function MapView() {
  const [cameras, setCameras] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showCameras, setShowCameras] = useState(true);
  const [stats, setStats] = useState({ 
    totalCameras: 0, 
    onlineCameras: 0, 
    totalZones: 0 
  });

  // Centro padrão: Brasil (centro aproximado)
  const defaultCenter = [-15.7801, -47.9292];
  const defaultZoom = 4;

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Buscar câmeras
      const camerasResponse = await fetch(`${API_URL}/cameras`, { headers });
      const camerasData = await camerasResponse.json();
      
      // Buscar zonas
      const zonesResponse = await fetch(`${API_URL}/zones`, { headers });
      const zonesData = await zonesResponse.json();
      
      // Filtrar câmeras com localização válida
      const camerasWithLocation = camerasData.filter(cam => 
        cam.latitude && cam.longitude && !isNaN(cam.latitude) && !isNaN(cam.longitude)
      );
      
      // Filtrar zonas com localização válida
      const zonesWithLocation = zonesData.filter(zone => 
        zone.latitude && zone.longitude && !isNaN(zone.latitude) && !isNaN(zone.longitude)
      );
      
      setCameras(camerasWithLocation);
      setZones(zonesWithLocation);
      
      setStats({
        totalCameras: camerasWithLocation.length,
        onlineCameras: camerasWithLocation.filter(c => c.is_online).length,
        totalZones: zonesWithLocation.length
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados do mapa:', error);
      setLoading(false);
    }
  };

  const getCameraIcon = (camera) => {
    if (!camera.is_online) return cameraGrayIcon;
    // Pode adicionar lógica de alertas aqui
    return cameraGreenIcon;
  };

  const getCameraStatusColor = (camera) => {
    if (!camera.is_online) return 'text-slate-500';
    return 'text-green-400';
  };

  const getCameraStatusLabel = (camera) => {
    if (!camera.is_online) return 'Offline';
    return 'Online';
  };

  // Calcular centro do mapa baseado nos marcadores visíveis
  const getMapCenter = () => {
    const markers = [];
    
    if (showCameras) {
      markers.push(...cameras.map(c => [c.latitude, c.longitude]));
    }
    if (showZones) {
      markers.push(...zones.map(z => [z.latitude, z.longitude]));
    }
    
    if (markers.length === 0) return defaultCenter;
    
    // Calcular centro médio
    const sumLat = markers.reduce((sum, [lat]) => sum + lat, 0);
    const sumLng = markers.reduce((sum, [, lng]) => sum + lng, 0);
    
    return [sumLat / markers.length, sumLng / markers.length];
  };

  const totalMarkers = (showCameras ? cameras.length : 0) + (showZones ? zones.length : 0);

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-display font-bold tracking-wider uppercase">
          <span className="glow-text-cyan">MAPA</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm uppercase tracking-wide font-display">
          Visualização geográfica das zonas e câmeras de segurança
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="sentineledge-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-1">Zonas</p>
              <p className="text-3xl font-bold text-blue-400 font-mono">{stats.totalZones}</p>
            </div>
            <Building2 className="text-blue-400" size={32} />
          </div>
        </div>

        <div className="sentineledge-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-1">Câmeras</p>
              <p className="text-3xl font-bold text-slate-100 font-mono">{stats.totalCameras}</p>
            </div>
            <Camera className="text-cyan-400" size={32} />
          </div>
        </div>
        
        <div className="sentineledge-card p-4 card-safe">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-1">Online</p>
              <p className="text-3xl font-bold glow-text-green font-mono">{stats.onlineCameras}</p>
            </div>
            <CheckCircle className="text-green-400" size={32} />
          </div>
        </div>

        <div className="sentineledge-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-1">Offline</p>
              <p className="text-3xl font-bold text-slate-500 font-mono">{stats.totalCameras - stats.onlineCameras}</p>
            </div>
            <XCircle className="text-slate-500" size={32} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="sentineledge-card p-4 mb-6">
        <h3 className="font-semibold font-display text-slate-100 mb-3 uppercase tracking-wider">Exibir no mapa:</h3>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showZones}
              onChange={(e) => setShowZones(e.target.checked)}
              className="w-4 h-4 text-cyan-500 bg-slate-800 border-slate-600 rounded focus:ring-cyan-500 focus:ring-2"
            />
            <span className="text-sm text-slate-300 font-display uppercase tracking-wide">Zonas ({stats.totalZones})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCameras}
              onChange={(e) => setShowCameras(e.target.checked)}
              className="w-4 h-4 text-cyan-500 bg-slate-800 border-slate-600 rounded focus:ring-cyan-500 focus:ring-2"
            />
            <span className="text-sm text-slate-300 font-display uppercase tracking-wide">Câmeras ({stats.totalCameras})</span>
          </label>
        </div>
      </div>

      {/* Map */}
      <div className="sentineledge-card overflow-hidden" style={{ height: '600px' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-slate-400 font-display uppercase tracking-wider">Carregando mapa...</p>
            </div>
          </div>
        ) : totalMarkers === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <MapPin size={64} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-200 text-lg font-display font-bold mb-2 uppercase tracking-wider">Nenhuma localização encontrada</p>
              <p className="text-slate-400 text-sm mb-4">
                As zonas e câmeras aparecerão aqui quando tiverem coordenadas de localização.
              </p>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 text-left">
                <p className="text-sm text-cyan-400 font-semibold mb-2 font-display uppercase tracking-wider">💡 Como adicionar localizações:</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• Vá em <strong className="text-cyan-400">Configurações → Zonas</strong></li>
                  <li>• Edite uma zona e adicione o endereço</li>
                  <li>• O sistema buscará as coordenadas automaticamente</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <MapContainer
            center={getMapCenter()}
            zoom={totalMarkers === 1 ? 15 : defaultZoom}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Marcadores de Zonas */}
            {showZones && zones.map((zone) => (
              <Marker
                key={`zone-${zone.id}`}
                position={[zone.latitude, zone.longitude]}
                icon={schoolIcon}
              >
                <Popup>
                  <div className="p-2 min-w-[250px] bg-slate-900 border border-slate-700">
                    <div className="flex items-start gap-2 mb-3">
                      <Building2 size={24} className="text-cyan-400 mt-1" />
                      <div>
                        <h3 className="font-bold text-slate-100 text-lg font-display uppercase tracking-wide">{zone.name}</h3>
                        <p className="text-xs text-cyan-400 font-medium font-display tracking-wider">ZONA DE MONITORAMENTO</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {zone.description && (
                        <div className="pb-2 border-b border-slate-700">
                          <p className="text-slate-300">{zone.description}</p>
                        </div>
                      )}
                      
                      {zone.address && (
                        <div className="pb-2 border-b border-slate-700">
                          <p className="text-slate-400 flex items-start gap-2">
                            <MapPin size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" />
                            <span>{zone.address}</span>
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-cyan-500/10 rounded p-2 border border-cyan-500/30">
                        <p className="text-xs text-slate-400 mb-1 font-display uppercase tracking-wider">Câmeras nesta zona:</p>
                        <p className="text-lg font-bold text-cyan-400 font-mono">{zone.camera_count || 0}</p>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-500 font-mono">
                          Coordenadas: {zone.latitude.toFixed(6)}, {zone.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* Marcadores de Câmeras */}
            {showCameras && cameras.map((camera) => (
              <Marker
                key={`camera-${camera.id}`}
                position={[camera.latitude, camera.longitude]}
                icon={getCameraIcon(camera)}
              >
                <Popup>
                  <div className="p-2 min-w-[220px] bg-slate-900 border border-slate-700">
                    <div className="flex items-start gap-2 mb-2">
                      <Camera size={20} className="text-cyan-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-slate-100 font-display uppercase tracking-wide">{camera.name}</h3>
                        <p className="text-sm text-slate-400">{camera.location}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between py-1 border-t border-slate-700">
                        <span className="text-slate-400 font-display uppercase tracking-wider text-xs">Status:</span>
                        <span className={`font-medium ${getCameraStatusColor(camera)}`}>
                          {getCameraStatusLabel(camera)}
                        </span>
                      </div>
                      
                      {camera.zone && (
                        <div className="flex items-center justify-between py-1 border-t border-slate-700">
                          <span className="text-slate-400 font-display uppercase tracking-wider text-xs">Zona:</span>
                          <span className="font-medium text-cyan-400">{camera.zone.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between py-1 border-t border-slate-700">
                        <span className="text-slate-400 font-display uppercase tracking-wider text-xs">IP:</span>
                        <span className="font-mono text-cyan-400 text-xs">{camera.ip}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 sentineledge-card p-4">
        <h3 className="font-semibold font-display text-slate-100 mb-3 uppercase tracking-wider">Legenda:</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-cyan-500 flex items-center justify-center">
              <Building2 size={16} className="text-slate-900" />
            </div>
            <span className="text-sm text-slate-300 font-display uppercase tracking-wide">Zona</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-slate-300 font-display uppercase tracking-wide">Câmera Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-slate-300 font-display uppercase tracking-wide">Com Alerta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-slate-300 font-display uppercase tracking-wide">Crítico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500"></div>
            <span className="text-sm text-slate-300 font-display uppercase tracking-wide">Câmera Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapView;