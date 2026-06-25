const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || (isLocalHost ? 'http://localhost:8000/api' : '/api');
export const API_ORIGIN = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;

export const getWebSocketUrl = (userId) => {
  if (!userId) return null;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = import.meta.env.VITE_WS_BASE_URL || (isLocalHost
    ? 'ws://localhost:8000/ws'
    : `${protocol}//${window.location.host}/ws`
  );
  return `${base}/${userId}`;
};

export const getConsultationWebSocketUrl = (consultationId) => {
  if (!consultationId) return null;
  const token = localStorage.getItem('arwa_token');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = import.meta.env.VITE_WS_BASE_URL || (isLocalHost
    ? 'ws://localhost:8000/ws'
    : `${protocol}//${window.location.host}/ws`
  );
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${base}/consultations/${consultationId}${query}`;
};
