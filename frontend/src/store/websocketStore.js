import { create } from 'zustand';

const useWebsocketStore = create((set) => ({
  connectionState: 'disconnected', // connecting, connected, disconnected
  reconnectAttempts: 0,
  lastHeartbeat: null,
  setConnectionState: (state) => set({ connectionState: state }),
  incrementReconnect: () =>
    set((s) => ({ reconnectAttempts: s.reconnectAttempts + 1 })),
  resetReconnect: () => set({ reconnectAttempts: 0 }),
  setLastHeartbeat: (ts) => set({ lastHeartbeat: ts }),
}));

export default useWebsocketStore;