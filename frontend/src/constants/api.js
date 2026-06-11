const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';

export const ENDPOINTS = {
  CREATE_SESSION: `${API_BASE}/api/session`,
  JOIN_SESSION: `${API_BASE}/api/session/join`,
  SESSION_STATUS: (id) => `${API_BASE}/api/session/${id}/status`,
  CLOSE_SESSION: (id) => `${API_BASE}/api/session/${id}`,
  WS_SIGNAL: (sessionId, peerId, token) =>
    `${WS_BASE}/ws/signal?session_id=${sessionId}&peer_id=${peerId}&token=${token}`,
};