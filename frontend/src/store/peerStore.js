import { create } from 'zustand';
import { PEER_CONNECTION_STATES } from '../constants/session';

const usePeerStore = create((set) => ({
  connectionState: PEER_CONNECTION_STATES.NEW,
  iceConnectionState: 'new',
  dataChannelState: 'closed',
  localSdp: null,
  remoteSdp: null,
  setConnectionState: (state) => set({ connectionState: state }),
  setIceConnectionState: (state) => set({ iceConnectionState: state }),
  setDataChannelState: (state) => set({ dataChannelState: state }),
  setLocalSdp: (sdp) => set({ localSdp: sdp }),
  setRemoteSdp: (sdp) => set({ remoteSdp: sdp }),
  reset: () =>
    set({
      connectionState: PEER_CONNECTION_STATES.NEW,
      iceConnectionState: 'new',
      dataChannelState: 'closed',
      localSdp: null,
      remoteSdp: null,
    }),
}));

export default usePeerStore;