import React, { useState, useEffect } from 'react';
import { Box, Trash2, AlertTriangle, Info, Database, Eye, EyeOff } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function SystemTab() {
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStream, setSavingStream] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState('all'); // 'all' ou 'old'
  const [deleting, setDeleting] = useState(false);
  const [streamConfig, setStreamConfig] = useState({
    rtsp_reconnect_interval_seconds: 5,
    rtsp_open_timeout_ms: 5000,
    rtsp_read_timeout_ms: 5000,
    max_fps: 30,
  });

  useEffect(() => {
    loadSettings();
    loadAlertsCount();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const [detectionResponse, settingsResponse] = await Promise.all([
        fetch(`${API_URL}/settings/detection`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (detectionResponse.ok) {
        const data = await detectionResponse.json();
        setShowBoundingBoxes(data.show_bounding_boxes ?? true);
      }

      if (settingsResponse.ok) {
        const settingsList = await settingsResponse.json();
        const getIntSetting = (key, defaultValue) => {
          const found = settingsList.find(s => s.key === key);
          if (!found || found.value === null || found.value === undefined || found.value === '') {
            return defaultValue;
          }
          const parsed = parseInt(found.value, 10);
          return Number.isNaN(parsed) ? defaultValue : parsed;
        };

        setStreamConfig({
          rtsp_reconnect_interval_seconds: getIntSetting('rtsp_reconnect_interval_seconds', 5),
          rtsp_open_timeout_ms: getIntSetting('rtsp_open_timeout_ms', 5000),
          rtsp_read_timeout_ms: getIntSetting('rtsp_read_timeout_ms', 5000),
          max_fps: getIntSetting('max_fps', 30),
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveSetting = async (token, payload) => {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return response.ok;
  };

  const loadAlertsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/alerts/count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAlertsCount(data.count || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem de alertas:', error);
    }
  };

  const handleToggleBoundingBoxes = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const newValue = !showBoundingBoxes;
      
      const response = await fetch(`${API_URL}/settings/detection`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ show_bounding_boxes: newValue })
      });

      if (response.ok) {
        setShowBoundingBoxes(newValue);
      } else {
        alert('❌ Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlerts = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = deleteType === 'all' 
        ? `${API_URL}/alerts/delete-all`
        : `${API_URL}/alerts/delete-old`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.deleted || 0} alertas removidos com sucesso!`);
        setShowDeleteModal(false);
        loadAlertsCount();
      } else {
        alert('❌ Erro ao remover alertas');
      }
    } catch (error) {
      console.error('Erro ao remover alertas:', error);
      alert('❌ Erro ao remover alertas');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveStreamConfig = async () => {
    setSavingStream(true);
    try {
      const token = localStorage.getItem('token');
      const operations = [
        {
          key: 'rtsp_reconnect_interval_seconds',
          value: String(Math.max(1, Number(streamConfig.rtsp_reconnect_interval_seconds) || 5)),
          description: 'Intervalo de reconexao RTSP em segundos'
        },
        {
          key: 'rtsp_open_timeout_ms',
          value: String(Math.max(1000, Number(streamConfig.rtsp_open_timeout_ms) || 5000)),
          description: 'Timeout de abertura RTSP em milissegundos'
        },
        {
          key: 'rtsp_read_timeout_ms',
          value: String(Math.max(1000, Number(streamConfig.rtsp_read_timeout_ms) || 5000)),
          description: 'Timeout de leitura RTSP em milissegundos'
        },
        {
          key: 'max_fps',
          value: String(Math.max(1, Math.min(60, Number(streamConfig.max_fps) || 30))),
          description: 'FPS maximo para streaming e processamento'
        }
      ];

      const results = await Promise.all(operations.map(op => saveSetting(token, op)));
      if (results.every(Boolean)) {
        alert('✅ Configurações de streaming salvas com sucesso!');
      } else {
        alert('❌ Erro ao salvar parte das configurações de streaming');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de streaming:', error);
      alert('❌ Erro ao salvar configurações de streaming');
    } finally {
      setSavingStream(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wider mb-2">
          Configurações do Sistema
        </h2>
        <p className="text-sm text-slate-400 uppercase tracking-wide font-display">
          Ajuste o comportamento e manutenção do sistema
        </p>
      </div>

      {/* Configurações de Detecção */}
      <div className="sentineledge-card p-6 mb-6">
        <h3 className="font-display font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Box size={20} className="text-cyan-400" />
          Configurações de Detecção
        </h3>

        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-start gap-3 flex-1">
            {showBoundingBoxes ? (
              <Eye size={24} className="text-cyan-400 mt-1 flex-shrink-0" />
            ) : (
              <EyeOff size={24} className="text-slate-500 mt-1 flex-shrink-0" />
            )}
            <div>
              <p className="font-display font-semibold text-slate-200 uppercase tracking-wider">
                Mostrar Caixas de Detecção
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {showBoundingBoxes 
                  ? 'As imagens de alerta mostrarão caixas verdes ao redor de armas detectadas'
                  : 'As imagens de alerta não terão marcações visuais de detecção'
                }
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={handleToggleBoundingBoxes}
            disabled={saving}
            className={`
              relative inline-flex h-8 w-14 items-center rounded-full transition-colors flex-shrink-0
              ${showBoundingBoxes ? 'bg-cyan-500' : 'bg-slate-600'}
              ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform
                ${showBoundingBoxes ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <p className="text-xs text-cyan-400 flex items-start gap-2">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              Esta configuração afeta apenas novas detecções. Alertas já registrados manterão suas imagens originais.
            </span>
          </p>
        </div>
      </div>

      {/* Configurações de Streaming RTSP */}
      <div className="sentineledge-card p-6 mb-6">
        <h3 className="font-display font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Database size={20} className="text-cyan-400" />
          Streaming RTSP (Global)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Reconexão (s)
            </label>
            <input
              type="number"
              min="1"
              value={streamConfig.rtsp_reconnect_interval_seconds}
              onChange={(e) => setStreamConfig({ ...streamConfig, rtsp_reconnect_interval_seconds: parseInt(e.target.value, 10) || 5 })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Open Timeout (ms)
            </label>
            <input
              type="number"
              min="1000"
              step="500"
              value={streamConfig.rtsp_open_timeout_ms}
              onChange={(e) => setStreamConfig({ ...streamConfig, rtsp_open_timeout_ms: parseInt(e.target.value, 10) || 5000 })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Read Timeout (ms)
            </label>
            <input
              type="number"
              min="1000"
              step="500"
              value={streamConfig.rtsp_read_timeout_ms}
              onChange={(e) => setStreamConfig({ ...streamConfig, rtsp_read_timeout_ms: parseInt(e.target.value, 10) || 5000 })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
              FPS Máximo
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={streamConfig.max_fps}
              onChange={(e) => setStreamConfig({ ...streamConfig, max_fps: parseInt(e.target.value, 10) || 30 })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveStreamConfig}
            disabled={savingStream}
            className="px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 disabled:opacity-50 shadow-glow font-display font-semibold uppercase tracking-wider text-sm"
          >
            {savingStream ? 'Salvando...' : 'Salvar Streaming'}
          </button>
        </div>
      </div>

      {/* Manutenção de Dados */}
      <div className="sentineledge-card p-6 mb-6">
        <h3 className="font-display font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Database size={20} className="text-amber-400" />
          Manutenção de Dados
        </h3>

        <div className="space-y-4">
          {/* Estatísticas */}
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 uppercase tracking-wide font-display font-semibold">
                  Total de Alertas
                </p>
                <p className="text-3xl font-bold text-slate-100 mt-1 font-mono">
                  {alertsCount.toLocaleString('pt-BR')}
                </p>
              </div>
              <AlertTriangle size={48} className="text-slate-600" />
            </div>
          </div>

          {/* Botão de Limpeza */}
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-400 flex-shrink-0 mt-1" />
              <div>
                <p className="font-display font-semibold text-red-400 uppercase tracking-wider">
                  Zona de Perigo
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  Remova alertas antigos para liberar espaço e melhorar a performance do sistema.
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={alertsCount === 0}
              className="w-full px-4 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg 
                       hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed
                       font-display font-semibold uppercase tracking-wider text-sm
                       flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 size={18} />
              Limpar Alertas
            </button>
          </div>
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className="sentineledge-card p-6">
        <h3 className="font-display font-semibold text-slate-200 mb-4 uppercase tracking-wider">
          Informações do Sistema
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <span className="text-slate-400 uppercase tracking-wide font-display font-semibold">Nome:</span>
            <span className="font-semibold text-slate-200">Sentinel Security System</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <span className="text-slate-400 uppercase tracking-wide font-display font-semibold">Organização:</span>
            <span className="font-semibold text-slate-200">Powered by Diogo Carvalho</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <span className="text-slate-400 uppercase tracking-wide font-display font-semibold">Versão:</span>
            <span className="font-mono text-cyan-400">1.0.0</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400 uppercase tracking-wide font-display font-semibold">Última Atualização:</span>
            <span className="font-semibold text-slate-200">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="sentineledge-card max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <h3 className="font-display font-bold text-slate-100 uppercase tracking-wider text-lg">
                Confirmar Exclusão
              </h3>
            </div>

            <p className="text-slate-300 mb-6">
              Esta ação removerá {deleteType === 'all' ? 'TODOS' : 'alertas antigos'} permanentemente. 
              Você não poderá recuperar esses dados.
            </p>

            {/* Opções */}
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border-2 border-transparent cursor-pointer hover:border-red-500/30 transition-colors">
                <input
                  type="radio"
                  name="deleteType"
                  value="old"
                  checked={deleteType === 'old'}
                  onChange={(e) => setDeleteType(e.target.value)}
                  className="accent-red-500"
                />
                <div>
                  <p className="font-display font-semibold text-slate-200 uppercase tracking-wider text-sm">
                    Alertas Antigos (+ 30 dias)
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Remove apenas alertas com mais de 30 dias
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border-2 border-transparent cursor-pointer hover:border-red-500/30 transition-colors">
                <input
                  type="radio"
                  name="deleteType"
                  value="all"
                  checked={deleteType === 'all'}
                  onChange={(e) => setDeleteType(e.target.value)}
                  className="accent-red-500"
                />
                <div>
                  <p className="font-display font-semibold text-red-400 uppercase tracking-wider text-sm">
                    Todos os Alertas
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Remove TODOS os {alertsCount} alertas do sistema
                  </p>
                </div>
              </label>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 
                         font-display font-semibold uppercase tracking-wider text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAlerts}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         font-display font-semibold uppercase tracking-wider text-sm
                         shadow-glow transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>Removendo...</>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
