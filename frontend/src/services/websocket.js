import { ENDPOINTS } from '../constants/api';
import useWebsocketStore from '../store/websocketStore';

let ws = null;
let heartbeatTimer = null;
let messageHandler = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let currentParams = null;

export function connectWebSocket(sessionId, peerId, token, onMessage, isReconnect = false) {
  if (ws) {
    ws.close(1000);
    clearTimeout(reconnectTimer);
  }

  if (!sessionId || !peerId || !token) {
    console.error('Cannot connect WebSocket – missing parameters');
    return;
  }

  messageHandler = onMessage;
  currentParams = { sessionId, peerId, token, isReconnect };

  let url = ENDPOINTS.WS_SIGNAL(sessionId, peerId, token);
  if (isReconnect) {
    url += '&is_reconnect=true';
  }

  console.log('Connecting WebSocket to', url);
  ws = new WebSocket(url);
  useWebsocketStore.getState().setConnectionState('connecting');

  ws.onopen = () => {
    reconnectAttempts = 0;
    useWebsocketStore.getState().setConnectionState('connected');
    useWebsocketStore.getState().resetReconnect();
    startHeartbeat();
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    messageHandler?.(data);
  };

  ws.onclose = (event) => {
    console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
    useWebsocketStore.getState().setConnectionState('disconnected');
    stopHeartbeat();

    // Auto‑reconnect only if not a normal closure (code 1000)
    if (event.code !== 1000 && currentParams) {
      scheduleReconnect();
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    ws.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);
  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    if (currentParams) {
      const { sessionId, peerId, token } = currentParams;
      connectWebSocket(sessionId, peerId, token, messageHandler, true);
    }
  }, delay);
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat', payload: { timestamp: Date.now() } }));
      useWebsocketStore.getState().setLastHeartbeat(Date.now());
    }
  }, 10000);
}

function stopHeartbeat() {
  clearInterval(heartbeatTimer);
}

export function sendMessage(message) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function disconnectWebSocket() {
  stopHeartbeat();
  clearTimeout(reconnectTimer);
  if (ws) {
    ws.close(1000);
    ws = null;
  }
  currentParams = null;
  reconnectAttempts = 0;
}