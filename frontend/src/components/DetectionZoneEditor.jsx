import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, Save, Download, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function DetectionZoneEditor({ camera, onClose, onSave, isModal = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentZone, setCurrentZone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSnapshot();
    
    // Carregar zona existente se houver
    if (camera.detection_zone) {
      setCurrentZone(camera.detection_zone);
    }
  }, [camera]);

  useEffect(() => {
    if (snapshot) {
      drawCanvas();
    }
  }, [snapshot, currentZone]);

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/cameras/${camera.id}/snapshot`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Erro ao capturar snapshot. Verifique se a câmera está acessível.');
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      const img = new Image();
      img.onload = () => {
        setSnapshot(img);
      };
      img.src = imageUrl;
    } catch (error) {
      console.error('Erro ao carregar snapshot:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;

    const ctx = canvas.getContext('2d');
    
    // Define tamanho do canvas
    const maxWidth = containerRef.current?.offsetWidth || 800;
    const aspectRatio = snapshot.height / snapshot.width;
    canvas.width = Math.min(maxWidth, snapshot.width);
    canvas.height = canvas.width * aspectRatio;

    // Desenha imagem
    ctx.drawImage(snapshot, 0, 0, canvas.width, canvas.height);

    // Desenha zona se existir
    if (currentZone) {
      const { x1, y1, x2, y2 } = currentZone;
      
      // Converter coordenadas normalizadas para pixels
      const px1 = x1 * canvas.width;
      const py1 = y1 * canvas.height;
      const px2 = x2 * canvas.width;
      const py2 = y2 * canvas.height;
      const width = px2 - px1;
      const height = py2 - py1;

      // Escurecer área fora da zona
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvas.width, py1); // Top
      ctx.fillRect(0, py1, px1, height); // Left
      ctx.fillRect(px2, py1, canvas.width - px2, height); // Right
      ctx.fillRect(0, py2, canvas.width, canvas.height - py2); // Bottom

      // Desenhar borda da zona
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(px1, py1, width, height);

      // Desenhar cantos
      const cornerSize = 20;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      
      // Canto superior esquerdo
      ctx.beginPath();
      ctx.moveTo(px1, py1 + cornerSize);
      ctx.lineTo(px1, py1);
      ctx.lineTo(px1 + cornerSize, py1);
      ctx.stroke();

      // Canto superior direito
      ctx.beginPath();
      ctx.moveTo(px2 - cornerSize, py1);
      ctx.lineTo(px2, py1);
      ctx.lineTo(px2, py1 + cornerSize);
      ctx.stroke();

      // Canto inferior esquerdo
      ctx.beginPath();
      ctx.moveTo(px1, py2 - cornerSize);
      ctx.lineTo(px1, py2);
      ctx.lineTo(px1 + cornerSize, py2);
      ctx.stroke();

      // Canto inferior direito
      ctx.beginPath();
      ctx.moveTo(px2 - cornerSize, py2);
      ctx.lineTo(px2, py2);
      ctx.lineTo(px2, py2 - cornerSize);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.fillRect(px1, py1 - 30, 140, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter';
      ctx.fillText('ZONA DE DETECÇÃO', px1 + 8, py1 - 10);
    }
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!drawing || !startPos) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calcular zona temporária (normalizada)
    const x1 = Math.min(startPos.x, x) / canvas.width;
    const y1 = Math.min(startPos.y, y) / canvas.height;
    const x2 = Math.max(startPos.x, x) / canvas.width;
    const y2 = Math.max(startPos.y, y) / canvas.height;

    setCurrentZone({ x1, y1, x2, y2 });
  };

  const handleMouseUp = () => {
    setDrawing(false);
    setStartPos(null);
  };

  const handleClearZone = () => {
    setCurrentZone(null);
    drawCanvas();
  };

  const handleSave = async () => {
    if (!currentZone) {
      alert('⚠️ Desenhe uma zona de detecção primeiro!');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/cameras/${camera.id}/detection-zone`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ detection_zone: currentZone })
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar zona de detecção');
      }

      const data = await response.json();
      
      if (onSave) {
        onSave(data);
      }
      
      alert('✅ Zona de detecção salva com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar zona de detecção');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className={`${isModal ? 'sentineledge-card max-w-5xl w-full' : ''} p-6 ${isModal ? 'max-h-[95vh] overflow-y-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-100 uppercase tracking-wider">
            Configurar Zona de Detecção
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {camera.name} • {camera.location}
          </p>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

        {/* Instruções */}
        <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-cyan-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-cyan-300">
              <p className="font-semibold mb-1">Como usar:</p>
              <ol className="list-decimal list-inside space-y-1 text-cyan-300/80">
                <li>Clique em "Capturar Novo Frame" para obter imagem atual da câmera</li>
                <li>Clique e arraste sobre a imagem para desenhar a zona de detecção</li>
                <li>Apenas detecções dentro da zona ativa gerarão alertas</li>
                <li>Clique em "Salvar" para aplicar a configuração</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Canvas Container */}
        <div ref={containerRef} className="mb-6 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
              <p className="text-slate-400 font-display uppercase tracking-wider">Capturando snapshot...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32">
              <AlertCircle className="text-red-400 mb-4" size={48} />
              <p className="text-red-400 font-semibold mb-2">{error}</p>
              <button
                onClick={loadSnapshot}
                className="mt-4 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 
                         font-display font-semibold uppercase tracking-wider text-sm shadow-glow"
              >
                Tentar Novamente
              </button>
            </div>
          ) : snapshot ? (
            <div className="relative">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full cursor-crosshair rounded-lg"
              />
              
              {currentZone && (
                <div className="absolute top-4 right-4 bg-green-500/90 text-white px-3 py-2 rounded-lg 
                              flex items-center gap-2 font-display font-semibold text-sm">
                  <CheckCircle size={16} />
                  Zona Definida
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32">
              <Camera className="text-slate-600 mb-4" size={48} />
              <p className="text-slate-400">Nenhum snapshot carregado</p>
            </div>
          )}
        </div>

        {/* Estatísticas da Zona */}
        {currentZone && (
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="sentineledge-card p-3 bg-slate-800/50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-display font-semibold mb-1">
                X1 (Esquerda)
              </p>
              <p className="text-lg font-mono text-cyan-400 font-semibold">
                {(currentZone.x1 * 100).toFixed(1)}%
              </p>
            </div>
            <div className="sentineledge-card p-3 bg-slate-800/50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-display font-semibold mb-1">
                Y1 (Topo)
              </p>
              <p className="text-lg font-mono text-cyan-400 font-semibold">
                {(currentZone.y1 * 100).toFixed(1)}%
              </p>
            </div>
            <div className="sentineledge-card p-3 bg-slate-800/50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-display font-semibold mb-1">
                X2 (Direita)
              </p>
              <p className="text-lg font-mono text-cyan-400 font-semibold">
                {(currentZone.x2 * 100).toFixed(1)}%
              </p>
            </div>
            <div className="sentineledge-card p-3 bg-slate-800/50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-display font-semibold mb-1">
                Y2 (Base)
              </p>
              <p className="text-lg font-mono text-cyan-400 font-semibold">
                {(currentZone.y2 * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3">
          <button
            onClick={loadSnapshot}
            disabled={loading}
            className="px-4 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     font-display font-semibold uppercase tracking-wider text-sm
                     flex items-center gap-2 transition-colors"
          >
            <Camera size={18} />
            {loading ? 'Capturando...' : 'Capturar Novo Frame'}
          </button>

          <button
            onClick={handleClearZone}
            disabled={!currentZone}
            className="px-4 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg 
                     hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed
                     font-display font-semibold uppercase tracking-wider text-sm
                     flex items-center gap-2 transition-colors"
          >
            <Trash2 size={18} />
            Limpar Zona
          </button>

          <div className="flex-1"></div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="px-4 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 
                       font-display font-semibold uppercase tracking-wider text-sm transition-colors"
            >
              Cancelar
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!currentZone || saving}
            className="px-6 py-3 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     font-display font-semibold uppercase tracking-wider text-sm
                     shadow-glow flex items-center gap-2 transition-colors"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Zona'}
          </button>
        </div>
    </div>
  );

  // Se for modal, renderizar com backdrop e centralizado
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        {content}
      </div>
    );
  }

  // Se não for modal, renderizar apenas o conteúdo
  return content;
}
