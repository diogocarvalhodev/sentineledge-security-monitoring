import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Check, X } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function TelegramTab() {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const settings = await response.json();
      
      const botSetting = settings.find(s => s.key === 'telegram_bot_token');
      const chatSetting = settings.find(s => s.key === 'telegram_chat_id');
      
      if (botSetting) setBotToken(botSetting.value);
      if (chatSetting) setChatId(chatSetting.value);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: 'telegram_bot_token',
          value: botToken,
          description: 'Token do bot do Telegram'
        })
      });

      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: 'telegram_chat_id',
          value: chatId,
          description: 'ID do chat do Telegram'
        })
      });

      alert('✅ Configurações salvas com sucesso!');
    } catch (error) {
      alert('❌ Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!botToken || !chatId) {
      alert('Preencha Bot Token e Chat ID primeiro!');
      return;
    }

    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/settings/telegram/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bot_token: botToken,
          chat_id: chatId
        })
      });

      if (response.ok) {
        setStatus('success');
        alert('✅ Mensagem de teste enviada com sucesso!');
      } else {
        setStatus('error');
        alert('❌ Erro ao enviar mensagem de teste');
      }
    } catch (error) {
      setStatus('error');
      alert('❌ Erro: ' + error.message);
    } finally {
      setTesting(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wider mb-2">Configuração do Telegram</h2>
        <p className="text-sm text-slate-400 uppercase tracking-wide font-display">
          Configure o bot do Telegram para receber alertas em tempo real
        </p>
      </div>

      {/* Instruções */}
      <div className="sentineledge-card p-4 mb-6 border-cyan-500/30">
        <h3 className="font-display font-semibold text-cyan-400 mb-2 uppercase tracking-wider">Como configurar:</h3>
        <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
          <li>Abra o Telegram e procure por <code className="bg-slate-900 px-2 py-0.5 rounded text-cyan-400 font-mono">@BotFather</code></li>
          <li>Digite <code className="bg-slate-900 px-2 py-0.5 rounded text-cyan-400 font-mono">/newbot</code> e siga as instruções</li>
          <li>Copie o <strong className="text-slate-100">Bot Token</strong> fornecido</li>
          <li>Procure por <code className="bg-slate-900 px-2 py-0.5 rounded text-cyan-400 font-mono">@userinfobot</code> para obter seu <strong className="text-slate-100">Chat ID</strong></li>
          <li>Cole as informações abaixo e clique em "Testar Envio"</li>
        </ol>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Bot Token *
          </label>
          <input
            type="text"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
          />
          <p className="text-xs text-slate-500 mt-1">
            Exemplo: 1234567890:ABCdef...
          </p>
        </div>

        <div>
          <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Chat ID *
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
            placeholder="123456789"
          />
          <p className="text-xs text-slate-500 mt-1">
            Pode ser positivo ou negativo (para grupos)
          </p>
        </div>

        {/* Status */}
        {status && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            status === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {status === 'success' ? <Check size={20} /> : <X size={20} />}
            <span className="text-sm font-semibold">
              {status === 'success' ? 'Telegram configurado corretamente!' : 'Erro na configuração'}
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 shadow-glow font-display font-semibold uppercase tracking-wider text-sm"
          >
            <Send size={18} />
            {testing ? 'Enviando...' : 'Testar Envio'}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 disabled:opacity-50 shadow-glow font-display font-semibold uppercase tracking-wider text-sm"
          >
            {loading ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </div>

      {/* Info adicional */}
      <div className="mt-6 sentineledge-card p-4">
        <h4 className="font-display font-semibold text-slate-200 mb-2 uppercase tracking-wider">📱 O que será enviado?</h4>
        <p className="text-sm text-slate-400">
          Quando uma pessoa for detectada, você receberá uma mensagem com:
        </p>
        <ul className="text-sm text-slate-400 mt-2 space-y-1">
          <li>• Nome da câmera e local</li>
          <li>• Data e horário da detecção</li>
          <li>• Número de pessoas detectadas</li>
          <li>• Foto capturada (se disponível)</li>
          <li>• Indicação se é horário crítico</li>
        </ul>
      </div>
    </div>
  );
}
