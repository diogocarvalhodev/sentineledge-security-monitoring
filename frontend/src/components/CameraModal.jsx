import React, { useState } from 'react';
import { X, Settings, MapPin, Clock, Monitor, Wifi } from 'lucide-react';
import CameraFeed from './CameraFeed';
import DetectionZoneEditor from './DetectionZoneEditor';
import CameraConnectionTest from './CameraConnectionTest';

export default function CameraModal({ camera, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('feed');
  
  if (!isOpen || !camera) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-slate-900 rounded-lg border border-slate-700 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${camera.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <div>
              <h2 className="text-xl font-bold text-white font-display uppercase tracking-wider">
                {camera.name}
              </h2>
              {camera.location && (
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <MapPin size={14} />
                  {camera.location}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800">
          <button
            onClick={() => handleTabChange('feed')}
            className={`px-6 py-3 font-medium text-sm transition-colors font-display uppercase tracking-wider ${
              activeTab === 'feed'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="inline-block mr-2" size={16} />
            Feed ao Vivo
          </button>
          <button
            onClick={() => handleTabChange('test')}
            className={`px-6 py-3 font-medium text-sm transition-colors font-display uppercase tracking-wider ${
              activeTab === 'test'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wifi className="inline-block mr-2" size={16} />
            Teste de Conexão
          </button>
          <button
            onClick={() => handleTabChange('zone')}
            className={`px-6 py-3 font-medium text-sm transition-colors font-display uppercase tracking-wider ${
              activeTab === 'zone'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="inline-block mr-2" size={16} />
            Zona de Detecção
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto relative">
          {activeTab === 'feed' && (
            <div className="h-full p-4">
              <div className="h-full">
                <CameraFeed 
                  camera={camera}
                  autoRefresh={true}
                  refreshInterval={1500}  // Mais frequente para modal
                  showControls={true}
                  className="h-full"
                />
              </div>
              
              {/* Camera Info Sidebar */}
              <div className="absolute top-20 right-4 w-80 bg-slate-800/95 backdrop-blur rounded-lg border border-slate-700 p-4 space-y-4">
                <h3 className="font-bold text-white font-display uppercase tracking-wider text-sm border-b border-slate-700 pb-2">
                  Informações da Câmera
                </h3>
                
                <div className="space-y-3 text-sm">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className={`font-medium ${camera.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                      {camera.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  
                  {/* Resolution */}
                  {camera.resolution && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Resolução:</span>
                      <span className="text-white font-mono">{camera.resolution}</span>
                    </div>
                  )}
                  
                  {/* FPS */}
                  {camera.fps && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">FPS:</span>
                      <span className="text-white font-mono">{camera.fps}</span>
                    </div>
                  )}
                  
                  {/* Zone */}
                  {camera.zone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Zona:</span>
                      <span className="text-purple-400 font-medium">{camera.zone.name}</span>
                    </div>
                  )}
                  
                  {/* Detection Zone */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Zona de Detecção:</span>
                    <span className={`text-sm ${camera.detection_zone ? 'text-green-400' : 'text-slate-500'}`}>
                      {camera.detection_zone ? 'Configurada' : 'Não definida'}
                    </span>
                  </div>
                  
                  {/* Last Seen */}
                  {camera.last_seen && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Última atividade:</span>
                      <span className="text-white text-xs font-mono">
                        {new Date(camera.last_seen).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* RTSP URL (masked) */}
                {camera.rtsp_url && (
                  <div className="pt-3 border-t border-slate-700">
                    <span className="text-slate-400 text-xs font-display uppercase tracking-wider">URL RTSP:</span>
                    <p className="text-xs font-mono text-slate-500 break-all mt-1">
                      {camera.rtsp_url.replace(/(:\/\/).+?(@)/, '://*****@')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'test' && (
            <div className="h-full p-6 max-w-2xl mx-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white font-display uppercase tracking-wider mb-2">
                    Teste de Conexão RTSP
                  </h3>
                  <p className="text-slate-400 text-sm mb-6">
                    Verifique se a câmera está funcionando corretamente e obtenha informações detalhadas sobre a conexão.
                  </p>
                </div>

                <CameraConnectionTest 
                  camera={camera}
                  onTestComplete={(result) => {
                    console.log('Teste completo:', result);
                    // Opcional: atualizar status da câmera na UI
                  }}
                />

                {/* Connection Tips */}
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <h4 className="font-semibold text-white mb-2 font-display uppercase tracking-wider text-sm">
                    Dicas de Solução de Problemas
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      Verifique se a URL RTSP está correta e acessível
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      Confirme usuário e senha da câmera
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      Teste se a câmera está na mesma rede
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      Verifique firewall e portas bloqueadas
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'zone' && (
            <div className="h-full p-4 overflow-y-auto">
              <DetectionZoneEditor 
                camera={camera}
                isModal={false}
                onSave={(updatedCamera) => {
                  // Opcional: callback para atualizar câmera na lista principal
                  console.log('Zona atualizada:', updatedCamera);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}