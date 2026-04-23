import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { ToastProvider } from './components/Toast';
import { useKeyboardShortcuts } from './components/KeyboardShortcuts';
import { useRealtimeNotifications } from './components/useRealtimeNotifications';
import { PermissionRoute } from './components/PermissionRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cameras from './pages/Cameras';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import MapView from './pages/MapView';

function PrivateRoute({ children }) {
  const { token } = useStore();
  return token ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { user } = useStore();
  useKeyboardShortcuts();
  const { isConnected, requestNotificationPermission } = useRealtimeNotifications(user?.id);

  // Solicitar permissão de notificações ao carregar
  useEffect(() => {
    if (user) {
      setTimeout(() => {
        requestNotificationPermission();
      }, 2000);
    }
  }, [user, requestNotificationPermission]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Dashboard - Todos podem acessar */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Câmeras - Operator ou Admin */}
      <Route
        path="/cameras"
        element={
          <PrivateRoute>
            <Layout>
              <PermissionRoute requiredRole="operator">
                <Cameras />
              </PermissionRoute>
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Alertas - Operator ou Admin */}
      <Route
        path="/alerts"
        element={
          <PrivateRoute>
            <Layout>
              <PermissionRoute requiredRole="operator">
                <Alerts />
              </PermissionRoute>
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Mapa - Todos podem ver */}
      <Route
        path="/map"
        element={
          <PrivateRoute>
            <Layout>
              <MapView />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Relatórios - Todos podem ver */}
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Layout>
              <Reports />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Configurações - Apenas Admin */}
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Layout>
              <PermissionRoute requiredRole="admin">
                <Settings />
              </PermissionRoute>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;