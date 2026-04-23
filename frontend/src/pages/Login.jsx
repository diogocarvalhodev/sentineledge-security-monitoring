import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Building2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);

  // Buscar logo do sistema
  useEffect(() => {
    fetch(`${API_URL}/system/logo`)
      .then(res => res.json())
      .then(data => {
        if (data.has_logo) {
          setLogoUrl(data.path.startsWith('/demo/') ? data.path : `${API_URL}${data.path}`);
        }
      })
      .catch(err => console.error('Erro ao carregar logo:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-sentineledge-darker flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 hex-pattern opacity-20"></div>
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Scanning line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-[scan_4s_linear_infinite]"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="sentineledge-card p-8 backdrop-blur-xl">
          {/* Cyber border corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500"></div>

          {/* Logo & Title */}
          <div className="text-center mb-8">
            {/* Hexagon Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg animate-glow">
                <svg className="w-full h-full p-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2 L22 8.5 L22 15.5 L12 22 L2 15.5 L2 8.5 Z" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 9 L12 4 M12 20 L12 15 M15 12 L20 12 M4 12 L9 12" strokeWidth="1" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-4xl font-display font-bold tracking-wider mb-2">
              <span className="glow-text-cyan">SENTINEL</span>
            </h1>
            <p className="text-slate-400 text-sm tracking-widest uppercase font-display">
              AI Security Operations
            </p>
            <div className="mt-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg backdrop-blur-sm">
                <p className="text-sm font-display uppercase tracking-wide">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-display font-semibold text-cyan-400 mb-2 uppercase tracking-wider">
                ID de Acesso
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg 
                         focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 
                         text-slate-100 placeholder-slate-500 font-mono
                         transition-all duration-200"
                placeholder="admin"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-display font-semibold text-cyan-400 mb-2 uppercase tracking-wider">
                Código de Segurança
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg 
                         focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 
                         text-slate-100 placeholder-slate-500 font-mono
                         transition-all duration-200"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 
                       text-slate-900 font-display font-bold uppercase tracking-wider
                       rounded-lg hover:shadow-glow-lg transition-all duration-200 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading ? 'AUTENTICANDO...' : 'ACESSAR SISTEMA'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>

          {/* Default Credentials Info */}
          <div className="mt-6 p-4 bg-slate-900/30 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400 text-center font-display uppercase tracking-wider">
              <span className="text-cyan-400 font-semibold">Credenciais Padrão</span>
              <br />
              <span className="font-mono text-slate-300">admin</span> / <span className="font-mono text-slate-300">admin</span>
            </p>
          </div>

          {/* System Status */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400 font-display uppercase tracking-wider">
              Sistema Operacional
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
