import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, AlertCircle, Play, Pause, Settings, Maximize2 } from 'lucide-react';

const API_URL = 'http://localhost:8000';
const IS_DEMO_MOCK = import.meta.env.VITE_DEMO_MOCK === 'true';

const getMockCameraImage = (camera) => {
  const raw = String(camera?.id || '1').replace(/\D/g, '');
  const idx = ((Number(raw || 1) - 1) % 3) + 1;
  return `/demo/camera-${idx}.svg`;
};

export default function CameraFeed({ 
  camera, 
  autoRefresh = true, 
  refreshInterval = 2000,
  showControls = true,
  className = "",
  onError = null,
  useStream = false  // Nova prop: usar stream de vídeo ao invés de snapshots (desabilitado por padrão)
}) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(autoRefresh);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const imgRef = useRef(null);
  
  // URL do stream ou snapshot
  const getVideoUrl = () => {
    if (!camera?.id) return null;
    if (IS_DEMO_MOCK) {
      return `${getMockCameraImage(camera)}?t=${Date.now()}`;
    }
    const token = localStorage.getItem('token');
    if (useStream && isPlaying) {
      // Retornar URL do stream MJPEG com token no header não funciona em img, então adicionar na query
      return `${API_URL}/cameras/${camera.id}/stream?token=${token}&t=${Date.now()}`;
    }
    return null;
  };

  // Fetch snapshot from camera (usado quando stream não está disponível)
  const fetchSnapshot = async () => {
    if (!camera?.id) return;

    if (IS_DEMO_MOCK) {
      setSnapshot(`${getMockCameraImage(camera)}?t=${Date.now()}`);
      setError(null);
      setLastUpdate(new Date());
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/cameras/${camera.id}/snapshot?t=${Date.now()}`, 
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      // Clean up previous snapshot
      if (snapshot && snapshot.startsWith('blob:')) {
        URL.revokeObjectURL(snapshot);
      }
      
      setSnapshot(imageUrl);
      setError(null);
      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('Erro ao capturar snapshot:', err);
      setError(err.message);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh interval ou stream
  useEffect(() => {
    if (!camera?.id) return;
    
    // Se usar stream e estiver playing, não precisa de interval
    if (useStream && isPlaying) {
      setLoading(false);
      setError(null);
      return;
    }
    
    // Caso contrário, usar snapshots com interval
    if (isPlaying) {
      fetchSnapshot(); // Initial fetch
      
      intervalRef.current = setInterval(() => {
        fetchSnapshot();
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [camera?.id, isPlaying, refreshInterval, useStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (snapshot) {
        if (snapshot.startsWith('blob:')) {
        URL.revokeObjectURL(snapshot);
        }
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchSnapshot();
  };

  const handleFullscreen = () => {
    if (imgRef.current) {
      if (imgRef.current.requestFullscreen) {
        imgRef.current.requestFullscreen();
      }
    }
  };

  if (!camera) {
    return (
      <div className={`relative bg-slate-800 rounded-lg overflow-hidden ${className}`}>
        <div className="aspect-video flex items-center justify-center">
          <div className="text-slate-500 text-center">
            <Camera size={48} className="mx-auto mb-2" />
            <p>Nenhuma câmera selecionada</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-slate-900 rounded-lg overflow-hidden border border-slate-700 ${className}`}>
      {/* Camera Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${camera.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-white font-medium text-sm">{camera.name}</span>
          </div>
          {lastUpdate && (
            <span className="text-xs text-slate-300 font-mono">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="aspect-video relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className="animate-spin" size={20} />
              <span>Carregando feed...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-center p-4">
            <div className="text-red-400 max-w-sm">
              <AlertCircle size={32} className="mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">Erro de conexão</p>
              <p className="text-xs text-slate-500">{error}</p>
              <button 
                onClick={handleRefresh}
                className="mt-3 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs hover:bg-red-500/30 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Stream de vídeo ou snapshot */}
        {useStream && isPlaying && !error ? (
          <img
            ref={imgRef}
            src={getVideoUrl()}
            alt={`Feed da câmera ${camera.name}`}
            className="w-full h-full object-cover"
            onLoad={() => setLoading(false)}
            onError={(e) => {
              console.error('Erro ao carregar stream');
              setError('Erro ao carregar stream de vídeo');
              setLoading(false);
            }}
          />
        ) : snapshot && !loading ? (
          <img
            ref={imgRef}
            src={snapshot}
            alt={`Feed da câmera ${camera.name}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Erro ao carregar imagem');
              setError('Erro ao carregar imagem');
            }}
          />
        ) : null}

        {!snapshot && !loading && !error && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-slate-500 text-center">
              <Camera size={48} className="mx-auto mb-2" />
              <p>Feed pausado</p>
              <p className="text-xs mt-2">Clique em Play para iniciar</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePlayPause}
                className={`p-2 rounded ${isPlaying ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 text-slate-300'} hover:scale-110 transition-transform`}
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              
              <button 
                onClick={handleRefresh}
                className="p-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                title="Atualizar"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleFullscreen}
                className="p-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                title="Tela cheia"
              >
                <Maximize2 size={16} />
              </button>
              
              <div className={`px-2 py-1 rounded text-xs font-mono ${
                error ? 'bg-red-500/20 text-red-400' :
                isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {error ? 'ERRO' : isPlaying ? 'AO VIVO' : 'PARADO'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location overlay */}
      {camera.location && (
        <div className="absolute top-12 left-3 bg-black/60 px-2 py-1 rounded text-xs text-slate-300">
          📍 {camera.location}
        </div>
      )}
    </div>
  );
}