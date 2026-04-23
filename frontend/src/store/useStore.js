import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getWebSocketUrl = (token) => {
  const api = new URL(API_URL);
  const protocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = `${protocol}//${api.host}/ws`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};

export const useStore = create((set, get) => ({
  // Auth
  token: localStorage.getItem('token'),
  user: null,
  
  // Data
  cameras: [],
  alerts: [],
  statistics: {
    total_cameras: 0,
    active_cameras: 0,
    total_alerts_today: 0,
    pending_alerts: 0,
    recent_alerts: []
  },
  
  // UI
  loading: false,
  error: null,
  
  // WebSocket
  ws: null,
  wsConnected: false,
  
  // Actions
  login: async (username, password) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) throw new Error('Login failed');
      
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      set({ token: data.access_token, loading: false });
      
      // Get user info
      await get().getCurrentUser();
      
      // Connect WebSocket
      get().connectWebSocket();
      
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    if (get().ws) {
      get().ws.close();
    }
    set({ token: null, user: null, ws: null, wsConnected: false });
  },
  
  getCurrentUser: async () => {
    try {
      const token = get().token;
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to get user');
      
      const user = await response.json();
      set({ user });
    } catch (error) {
      console.error('Error getting user:', error);
    }
  },
  
  fetchCameras: async () => {
    try {
      const token = get().token;
      const response = await fetch(`${API_URL}/cameras`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch cameras');
      
      const cameras = await response.json();
      set({ cameras });
    } catch (error) {
      console.error('Error fetching cameras:', error);
    }
  },
  
  fetchAlerts: async () => {
    try {
      const token = get().token;
      const response = await fetch(`${API_URL}/alerts?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch alerts');
      
      const alerts = await response.json();
      set({ alerts });
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  },
  
  fetchStatistics: async () => {
    try {
      const token = get().token;
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch statistics');
      
      const statistics = await response.json();
      set({ statistics });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  },
  
  acknowledgeAlert: async (alertId, notes = '') => {
    try {
      const token = get().token;
      const response = await fetch(`${API_URL}/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ acknowledged: true, notes })
      });
      
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      
      // Refresh alerts
      await get().fetchAlerts();
      await get().fetchStatistics();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  },
  
  connectWebSocket: () => {
    const token = get().token;
    const wsUrl = getWebSocketUrl(token);

    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      set({ wsConnected: true });
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message:', message);
        
        if (message.type === 'alert') {
          // Refresh data when new alert
          get().fetchAlerts();
          get().fetchStatistics();
        }
        
        if (message.type === 'camera_status') {
          get().fetchCameras();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      set({ wsConnected: false });
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      set({ wsConnected: false, ws: null });
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (get().token) {
          get().connectWebSocket();
        }
      }, 5000);
    };
    
    set({ ws });
  }
}));
