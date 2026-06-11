import { ENDPOINTS } from '../constants/api';

export async function createSession() {
  const res = await fetch(ENDPOINTS.CREATE_SESSION, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function joinSession(sessionId, otp) {
  const res = await fetch(ENDPOINTS.JOIN_SESSION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, otp }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to join session');
  }
  return res.json();
}

export async function getSessionStatus(sessionId) {
  const res = await fetch(ENDPOINTS.SESSION_STATUS(sessionId));
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

export async function closeSession(sessionId) {
  const res = await fetch(ENDPOINTS.CLOSE_SESSION(sessionId), { method: 'DELETE' });
  return res.ok;
}