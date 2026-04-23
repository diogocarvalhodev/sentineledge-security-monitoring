import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';

/**
 * Componente para proteger rotas que exigem permissões específicas
 * 
 * Uso:
 * <PermissionRoute requiredRole="admin">
 *   <AdminPage />
 * </PermissionRoute>
 */
export function PermissionRoute({ children, requiredRole, requiredRoles = [] }) {
  const { user } = useStore();

  // Se não estiver logado, redireciona para login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Verificar se tem a permissão necessária
  const hasPermission = checkPermission(user.role, requiredRole, requiredRoles);

  // Se não tiver permissão, mostra aviso
  if (!hasPermission) {
    return <AccessDenied userRole={user.role} requiredRole={requiredRole || requiredRoles[0]} />;
  }

  // Se tiver permissão, mostra o conteúdo
  return children;
}

/**
 * Verifica se o usuário tem permissão
 */
function checkPermission(userRole, requiredRole, requiredRoles) {
  // Hierarquia de permissões
  const roleHierarchy = {
    'admin': 3,
    'operator': 2,
    'viewer': 1
  };

  const userLevel = roleHierarchy[userRole] || 0;

  // Se especificou um role específico
  if (requiredRole) {
    const requiredLevel = roleHierarchy[requiredRole] || 999;
    return userLevel >= requiredLevel;
  }

  // Se especificou múltiplos roles permitidos
  if (requiredRoles.length > 0) {
    return requiredRoles.includes(userRole);
  }

  // Por padrão, permite
  return true;
}

/**
 * Página de acesso negado
 */
function AccessDenied({ userRole, requiredRole }) {
  const roleNames = {
    'admin': 'Administrador',
    'operator': 'Operador',
    'viewer': 'Visualizador'
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card de erro */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Ícone */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="text-red-600" size={40} />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Acesso Negado
          </h1>

          {/* Descrição */}
          <p className="text-gray-600 mb-2">
            Você não tem permissão para acessar esta página.
          </p>

          {/* Detalhes */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Seu nível:</span>
              <span className="text-sm font-semibold text-gray-900">
                {roleNames[userRole] || userRole}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Necessário:</span>
              <span className="text-sm font-semibold text-red-600">
                {roleNames[requiredRole] || requiredRole}
              </span>
            </div>
          </div>

          {/* Mensagem adicional */}
          <p className="text-sm text-gray-500 mb-6">
            Entre em contato com um administrador para solicitar acesso.
          </p>

          {/* Botão de voltar */}
          <button
            onClick={() => window.history.back()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
        </div>

        {/* Informação adicional */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Precisa de ajuda?{' '}
            <a href="https://wa.me/5521967225478" className="text-blue-600 hover:underline">
              Contate o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para verificar permissões em componentes
 * 
 * Uso:
 * const { hasPermission, canEdit, canDelete } = usePermissions();
 * 
 * if (!canEdit) {
 *   return <div>Você não pode editar</div>;
 * }
 */
export function usePermissions() {
  const { user } = useStore();

  const roleHierarchy = {
    'admin': 3,
    'operator': 2,
    'viewer': 1
  };

  const userLevel = roleHierarchy[user?.role] || 0;

  return {
    user,
    userRole: user?.role,
    userLevel,
    
    // Verificar se tem uma permissão específica
    hasPermission: (requiredRole) => {
      const requiredLevel = roleHierarchy[requiredRole] || 999;
      return userLevel >= requiredLevel;
    },

    // Atalhos comuns
    isAdmin: user?.role === 'admin',
    isOperator: user?.role === 'operator' || user?.role === 'admin',
    isViewer: user?.role === 'viewer',

    // Permissões específicas
    canCreate: userLevel >= 2, // operator ou admin
    canEdit: userLevel >= 2,   // operator ou admin
    canDelete: userLevel >= 3, // apenas admin
    canView: userLevel >= 1,   // todos

    // Permissões por recurso
    canManageUsers: userLevel >= 3,
    canManageCameras: userLevel >= 2,
    canManageAlerts: userLevel >= 2,
    canViewReports: userLevel >= 1,
    canManageSettings: userLevel >= 3,
  };
}

/**
 * Componente para esconder elementos baseado em permissão
 * 
 * Uso:
 * <IfPermission requiredRole="admin">
 *   <button>Deletar</button>
 * </IfPermission>
 */
export function IfPermission({ children, requiredRole, requiredRoles = [], fallback = null }) {
  const { user } = useStore();

  if (!user) return fallback;

  const hasPermission = checkPermission(user.role, requiredRole, requiredRoles);

  return hasPermission ? children : fallback;
}

/**
 * Componente para desabilitar elementos baseado em permissão
 * 
 * Uso:
 * <DisableIfNoPermission requiredRole="operator">
 *   <button>Editar</button>
 * </DisableIfNoPermission>
 */
export function DisableIfNoPermission({ children, requiredRole, requiredRoles = [] }) {
  const { user } = useStore();

  if (!user) {
    return React.cloneElement(children, { disabled: true });
  }

  const hasPermission = checkPermission(user.role, requiredRole, requiredRoles);

  if (hasPermission) {
    return children;
  }

  // Adiciona propriedades de desabilitado
  return React.cloneElement(children, {
    disabled: true,
    className: `${children.props.className || ''} opacity-50 cursor-not-allowed`,
    title: 'Você não tem permissão para esta ação'
  });
}
