import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSessionStore = create(
  persist(
    (set, get) => ({
      sessionId: null,
      deviceName: '',
      peerName: '',
      peerId: null,          // ← ADDED
      token: null,           // ← ADDED
      otp: null,
      status: 'waiting',     // waiting, connected, expired, closed
      peerCount: 0,
      isInitiator: false,    // true = creator, false = joiner
      creatorReady: false,   // Track if creator has entered the room
      
      setSession: (sessionId, otp, isInitiator) => set({ 
        sessionId, 
        otp, 
        isInitiator,
        status: 'waiting',
        creatorReady: false
      }),
      
      setDeviceName: (name) => set({ deviceName: name }),
      setPeerName: (name) => set({ peerName: name }),
      setPeerId: (id) => set({ peerId: id }),      // ← ADDED
      setToken: (token) => set({ token }),          // ← ADDED
      
      setCreatorReady: (ready) => set({ creatorReady: ready }),
      setPeerCount: (count) => set({ peerCount: count }),
      setStatus: (status) => set({ status }),
      
      resetSession: () => set({
        sessionId: null,
        deviceName: '',
        peerName: '',
        peerId: null,        // ← ADDED
        token: null,         // ← ADDED
        otp: null,
        status: 'waiting',
        peerCount: 0,
        isInitiator: false,
        creatorReady: false
      })
    }),
    {
      name: 'session-storage',
      storage: {
        getItem: (key) => {
          const value = sessionStorage.getItem(key);
          if (!value) return null;
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          sessionStorage.setItem(key, JSON.stringify(value));
        },
        removeItem: (key) => {
          sessionStorage.removeItem(key);
        },
      },
    }
  )
);

export default useSessionStore;