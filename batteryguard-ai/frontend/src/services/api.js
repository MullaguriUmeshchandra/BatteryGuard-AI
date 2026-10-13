const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('bg_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    
    // Handle unauthenticated
    if (res.status === 401 && !endpoint.includes('/auth/')) {
      localStorage.removeItem('bg_token');
      localStorage.removeItem('bg_user');
      window.location.href = '/login';
      throw new Error('Session expired, please login again');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      let msg = errorData.detail || `Request failed with status ${res.status}`;
      if (Array.isArray(msg)) {
        msg = msg.map(item => item.msg || item.message || JSON.stringify(item)).join('. ');
      } else if (typeof msg === 'object' && msg !== null) {
        msg = msg.msg || msg.message || JSON.stringify(msg);
      }
      throw new Error(msg);
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Authentication
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),

  // Batteries
  getBatteries: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/batteries${query ? `?${query}` : ''}`);
  },
  getBattery: (id) => request(`/batteries/${id}`),
  createBattery: (data) => request('/batteries', { method: 'POST', body: JSON.stringify(data) }),
  updateBattery: (id, data) => request(`/batteries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBattery: (id) => request(`/batteries/${id}`, { method: 'DELETE' }),

  // Test Profiles & Execution
  getTestProfiles: () => request('/tests/profiles'),
  runSimulation: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tests/simulate?${query}`, { method: 'POST' });
  },
  getSimulationTick: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tests/simulate/tick?${query}`);
  },
  saveTestSession: (data) => request('/tests/save', { method: 'POST', body: JSON.stringify(data) }),
  getTestSessions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tests${query ? `?${query}` : ''}`);
  },
  getTestSessionDetail: (id) => request(`/tests/${id}`),

  // Analytics
  getDashboardStats: () => request('/analytics/dashboard'),
  getHistoricalTrends: () => request('/analytics/trends'),
  compareSessions: (sessionA, sessionB) => request(`/analytics/compare?session_a_id=${sessionA}&session_b_id=${sessionB}`),

  // Alerts
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/alerts${query ? `?${query}` : ''}`);
  },
  acknowledgeAlert: (id, payload = {}) => request(`/alerts/${id}/acknowledge`, { method: 'POST', body: JSON.stringify(payload) }),

  // Devices & Hardware
  getDevices: () => request('/devices'),
  pingDevice: (id) => request(`/devices/${id}/ping`, { method: 'POST' }),
  getHardwareStatus: () => request('/hardware/status'),

  // Report URLs for direct downloads
  getPdfReportUrl: (testId) => `${API_BASE}/reports/pdf/${testId}`,
  getReadingsCsvUrl: (testId) => `${API_BASE}/reports/csv/readings/${testId}`,
  getBatteriesCsvUrl: () => `${API_BASE}/reports/csv/batteries`,
};
