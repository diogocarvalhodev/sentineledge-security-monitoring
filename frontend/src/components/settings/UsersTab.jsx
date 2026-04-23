import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, X, Shield, Eye, Briefcase } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'viewer',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingUser 
        ? `${API_URL}/users/${editingUser.id}`
        : `${API_URL}/users`;
      
      const method = editingUser ? 'PUT' : 'POST';
      
      // Se estiver editando e não digitou senha, não enviar campo password
      const payload = editingUser && !formData.password
        ? { email: formData.email, username: formData.username, role: formData.role, is_active: formData.is_active }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Erro ao salvar usuário');

      await fetchUsers();
      setShowModal(false);
      resetForm();
      alert('✅ Usuário salvo com sucesso!');
    } catch (error) {
      alert('❌ Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchUsers();
      alert('✅ Usuário deletado!');
    } catch (error) {
      alert('❌ Erro ao deletar: ' + error.message);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      username: '',
      password: '',
      role: 'viewer',
      is_active: true
    });
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Shield className="text-red-600" size={20} />;
      case 'operator': return <Briefcase className="text-yellow-600" size={20} />;
      default: return <Eye className="text-green-600" size={20} />;
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return 'Administrador';
      case 'operator': return 'Operador';
      default: return 'Visualizador';
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      operator: 'bg-yellow-100 text-yellow-700',
      viewer: 'bg-green-100 text-green-700'
    };
    return colors[role] || colors.viewer;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wider">Gerenciar Usuários</h2>
          <p className="text-sm text-slate-400 uppercase tracking-wide font-display">
            {users.length} usuário(s) cadastrado(s)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 shadow-glow font-display font-semibold uppercase tracking-wider text-sm"
        >
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="sentineledge-card p-4 hover:border-cyan-500/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                  {getRoleIcon(user.role)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-100">{user.username}</h3>
                    <span className={`px-2 py-1 text-xs rounded font-mono ${
                      user.role === 'admin' ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
                      user.role === 'operator' ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' :
                      'bg-green-500/20 border border-green-500/30 text-green-400'
                    }`}>
                      {getRoleLabel(user.role)}
                    </span>
                    {!user.is_active && (
                      <span className="px-2 py-1 text-xs rounded bg-slate-700/50 border border-slate-600 text-slate-400 font-mono">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(user)}
                  className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded border border-transparent hover:border-cyan-500/30"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                {user.role !== 'admin' && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/30"
                    title="Deletar"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Roles */}
      <div className="mt-6 sentineledge-card p-4">
        <h4 className="font-display font-semibold text-slate-200 mb-3 uppercase tracking-wider">Níveis de Acesso:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="text-red-400" size={16} />
            <strong className="text-slate-200">Administrador:</strong>
            <span className="text-slate-400">Acesso total (gerencia tudo)</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="text-yellow-400" size={16} />
            <strong className="text-slate-200">Operador:</strong>
            <span className="text-slate-400">Gerencia alertas e câmeras</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="text-green-400" size={16} />
            <strong className="text-slate-200">Visualizador:</strong>
            <span className="text-slate-400">Apenas visualização</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="sentineledge-card rounded-lg max-w-md w-full">
            <div className="border-b border-slate-700/50 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wider">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 bg-slate-900/90 text-cyan-400 border border-cyan-500/30 rounded hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nome de Usuário *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="admin, operador1, etc"
                  autoComplete="username"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Usado para fazer login no sistema
                </p>
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="usuario@email.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Para notificações e recuperação de senha
                </p>
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Senha {editingUser ? '(deixe em branco para não alterar)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="••••••••"
                  autoComplete={editingUser ? 'new-password' : 'current-password'}
                />
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nível de Acesso *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600">
                    <input
                      type="radio"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="accent-red-500"
                    />
                    <Shield size={18} className="text-red-400" />
                    <span className="font-semibold text-slate-200">Administrador</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600">
                    <input
                      type="radio"
                      value="operator"
                      checked={formData.role === 'operator'}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="accent-yellow-500"
                    />
                    <Briefcase size={18} className="text-yellow-400" />
                    <span className="font-semibold text-slate-200">Operador</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600">
                    <input
                      type="radio"
                      value="viewer"
                      checked={formData.role === 'viewer'}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="accent-green-500"
                    />
                    <Eye size={18} className="text-green-400" />
                    <span className="font-semibold text-slate-200">Visualizador</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 accent-green-500"
                  />
                  <span className="text-sm text-slate-300">Usuário ativo</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-cyan-500 text-slate-900 rounded-lg hover:bg-cyan-400 disabled:opacity-50 shadow-glow font-display font-semibold uppercase tracking-wider text-sm"
                >
                  {loading ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
