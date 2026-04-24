import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Breadcrumbs } from './Breadcrumbs';
import { KeyboardShortcutsButton } from './KeyboardShortcuts';
import { useRealtimeNotifications, ConnectionStatus } from './useRealtimeNotifications';
import {
  LayoutDashboard,
  Camera,
  Bell,
  Map,
  FileText,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const getIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  };
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [sidebarOpen, setSidebarOpen] = useState(() => !getIsMobile());
  const [logoUrl, setLogoUrl] = useState(null);
  
  // Hook de notificações em tempo real
  const { isConnected } = useRealtimeNotifications(user?.id);

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

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile((prev) => {
        if (prev !== mobile) {
          setSidebarOpen(!mobile);
        }
        return mobile;
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/cameras', icon: Camera, label: 'Câmeras' },
    { path: '/alerts', icon: Bell, label: 'Alertas' },
    { path: '/map', icon: Map, label: 'Mapa' },
    { path: '/reports', icon: FileText, label: 'Relatórios' },
    { path: '/settings', icon: Settings, label: 'Configurações' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-900">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {isMobile && (
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="fixed left-3 top-3 z-40 rounded-lg border border-cyan-500/30 bg-slate-900/90 p-2 text-cyan-400 shadow-glow sm:left-4 sm:top-4"
          aria-label="Alternar menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Sidebar - Command Panel */}
      {(!isMobile || sidebarOpen) && (
      <div
        className={`${isMobile
          ? 'fixed inset-y-0 left-0 z-40 w-[85vw] max-w-[320px]'
          : `${sidebarOpen ? 'w-64' : 'w-20'}`
        } bg-sentineledge-darker border-r border-slate-700/50 text-white transition-all duration-300 flex flex-col relative`}
      >
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-700/50">
          {(sidebarOpen || isMobile) && (
            <div className="flex items-center gap-3">
              {/* Logo Hexagon */}
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center animate-glow">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2 L22 8.5 L22 15.5 L12 22 L2 15.5 L2 8.5 Z" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 9 L12 4 M12 20 L12 15 M15 12 L20 12 M4 12 L9 12" strokeWidth="1" />
                  </svg>
                </div>
              </div>
              {/* Title */}
              <div>
                <h1 className="text-lg font-display font-bold tracking-wider">
                  <span className="glow-text-cyan">SENTINEL</span>
                </h1>
                <p className="text-[10px] text-slate-400 tracking-widest uppercase font-display">AI Security Hub</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 hover:bg-slate-800 rounded transition-colors ${isMobile ? 'hidden' : ''}`}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Divider with decorative line */}
        <div className="px-4 py-2">
          <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => {
                      if (isMobile) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative group ${
                      isActive
                        ? 'bg-slate-800/50 text-cyan-400 border-l-2 border-cyan-500'
                        : 'text-slate-300 hover:bg-slate-800/30 hover:text-cyan-400 border-l-2 border-transparent'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-cyan-500/5 rounded-lg"></div>
                    )}
                    <Icon size={20} className={isActive ? 'text-cyan-400' : ''} />
                    {(sidebarOpen || isMobile) && (
                      <span className="font-display text-sm tracking-wide uppercase">
                        {item.label}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute right-0 w-1 h-full bg-cyan-500 rounded-l"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="px-4 py-2">
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
        </div>

        {/* User Info & Status */}
        <div className="p-4">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 mb-4 ${sidebarOpen || isMobile ? '' : 'justify-center'}`}>
            <div className={`relative w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-500'
            }`}>
              {isConnected && (
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
              )}
            </div>
            {(sidebarOpen || isMobile) && (
              <span className={`text-xs font-display tracking-wider uppercase ${
                isConnected ? 'text-green-400' : 'text-red-400'
              }`}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            )}
          </div>

          {/* User */}
          {user && (sidebarOpen || isMobile) && (
            <div className="mb-3 p-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <p className="text-sm font-display font-semibold tracking-wide uppercase text-cyan-400">
                {user.username}
              </p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{user.role}</p>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarOpen || isMobile ? 'gap-3' : 'justify-center'} px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-500/30`}
          >
            <LogOut size={18} />
            {(sidebarOpen || isMobile) && (
              <span className="font-display text-sm tracking-wide uppercase">Sair</span>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto hex-pattern">
        <div className="p-4 pt-16 sm:p-6 lg:p-8 lg:pt-8">
          <Breadcrumbs />
          {children}
        </div>
      </div>

      {/* Botão de atalhos de teclado */}
      <KeyboardShortcutsButton />
    </div>
  );
}