import React, { useState } from 'react';
import { Camera, MessageSquare, Users, Upload, Building2 } from 'lucide-react';
import CamerasTab from '../components/settings/CamerasTab';
import TelegramTab from '../components/settings/TelegramTab';
import UsersTab from '../components/settings/UsersTab';
import SystemTab from '../components/settings/SystemTab';
import ZonesTab from '../components/settings/ZonesTab';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('cameras');

  const tabs = [
    { id: 'cameras', icon: Camera, label: 'Câmeras' },
    { id: 'zones', icon: Building2, label: 'Zonas' },
    { id: 'telegram', icon: MessageSquare, label: 'Telegram' },
    { id: 'users', icon: Users, label: 'Usuários' },
    { id: 'system', icon: Upload, label: 'Sistema' }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold tracking-wider uppercase">
          <span className="glow-text-cyan">CONFIGURAÇÕES</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm uppercase tracking-wide font-display">
          Gerencie câmeras, usuários e configurações do sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="sentineledge-card">
        <div className="border-b border-slate-700/50">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-display font-medium text-sm transition-colors uppercase tracking-wider ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'cameras' && <CamerasTab />}
          {activeTab === 'zones' && <ZonesTab />}
          {activeTab === 'telegram' && <TelegramTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'system' && <SystemTab />}
        </div>
      </div>
    </div>
  );
}
