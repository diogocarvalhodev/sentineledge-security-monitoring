import React, { useState } from 'react';
import { Wifi, AlertCircle, CheckCircle, Loader2, Clock, Monitor, Zap } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function CameraConnectionTest({ camera, onTestComplete = null }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const runConnectionTest = async () => {
    if (!camera?.id) return;
    
    setTesting(true);
    setTestResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/cameras/${camera.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setTestResult(data);
      
      if (onTestComplete) {
        onTestComplete(data);
      }
      
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setTestResult({
        success: false,
        message: 'Falha na comunicação com o servidor',
        details: { error: error.message }
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusColor = (success) => {
    if (success) return 'text-green-400 bg-green-500/20 border-green-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  const getStatusIcon = (success) => {
    if (success) return <CheckCircle size={16} />;
    return <AlertCircle size={16} />;
  };

  return (
    <div className="space-y-4">
      {/* Test Button */}
      <button
        onClick={runConnectionTest}
        disabled={testing || !camera}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all font-display uppercase tracking-wider ${
          testing 
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-glow'
        }`}
      >
        {testing ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <Wifi size={16} />
        )}
        {testing ? 'Testando...' : 'Testar Conexão'}
      </button>

      {/* Test Results */}
      {testResult && (
        <div className={`p-4 rounded-lg border ${getStatusColor(testResult.success)}`}>
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(testResult.success)}
            <span className="font-medium text-sm font-display uppercase tracking-wider">
              {testResult.success ? 'Conexão Bem-sucedida' : 'Falha na Conexão'}
            </span>
          </div>
          
          <p className="text-sm mb-3">{testResult.message}</p>

          {/* Connection Details */}
          {testResult.details && (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* Latency */}
                {testResult.details.latency_ms && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock size={12} />
                      Latência:
                    </div>
                    <div className="font-mono text-cyan-400">
                      {testResult.details.latency_ms}ms
                    </div>
                  </div>
                )}

                {/* Resolution */}
                {testResult.details.resolution && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Monitor size={12} />
                      Resolução:
                    </div>
                    <div className="font-mono text-cyan-400">
                      {testResult.details.resolution}
                    </div>
                  </div>
                )}

                {/* FPS */}
                {testResult.details.fps && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Zap size={12} />
                      FPS:
                    </div>
                    <div className="font-mono text-cyan-400">
                      {Math.round(testResult.details.fps)}
                    </div>
                  </div>
                )}

                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-400">
                    Status:
                  </div>
                  <div className={`font-mono text-xs px-2 py-1 rounded ${
                    testResult.details.connection === 'success' 
                      ? 'text-green-400 bg-green-500/20' 
                      : 'text-red-400 bg-red-500/20'
                  }`}>
                    {testResult.details.connection}
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              {testResult.timestamp && (
                <div className="pt-2 border-t border-slate-600 text-slate-500">
                  Testado em: {new Date(testResult.timestamp).toLocaleString('pt-BR')}
                </div>
              )}

              {/* Error details */}
              {testResult.details.error && (
                <div className="pt-2 border-t border-slate-600">
                  <div className="text-slate-400 mb-1">Erro:</div>
                  <code className="text-xs bg-slate-800 p-2 rounded block break-all">
                    {testResult.details.error}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}