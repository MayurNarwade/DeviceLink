// peer.js – with Metered.ca TURN support and stable connection handling

class PeerService {
  constructor(sessionId, peerId, token, onStateChange) {
    this.sessionId = sessionId;
    this.peerId = peerId;
    this.token = token;
    this.onStateChange = onStateChange;
    this.pc = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.negotiationStarted = false;
    this.pendingCandidates = [];
    this.iceServers = null;
  }

  async fetchIceServers() {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/webrtc/ice-servers`);
      if (!response.ok) throw new Error('Failed to fetch ICE servers');
      const data = await response.json();
      this.iceServers = data.iceServers;
      console.log('✅ Fetched ICE servers from backend');
      return this.iceServers;
    } catch (error) {
      console.error('Error fetching ICE servers:', error);
      // Fallback to Metered.ca STUN + TURN with your credentials
      this.iceServers = [
        { urls: "stun:stun.relay.metered.ca:80" },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "000fd4fc180e328b9ea02e59",
          credential: "BTR/8+kgb9dqCBZq",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "000fd4fc180e328b9ea02e59",
          credential: "BTR/8+kgb9dqCBZq",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "000fd4fc180e328b9ea02e59",
          credential: "BTR/8+kgb9dqCBZq",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "000fd4fc180e328b9ea02e59",
          credential: "BTR/8+kgb9dqCBZq",
        },
      ];
      console.log('⚠️ Using fallback ICE servers (hardcoded)');
      return this.iceServers;
    }
  }

  async initialize(isInitiator) {
    this.isInitiator = isInitiator;
    await this.fetchIceServers();
    await this._createPeerConnection();
  }

  async createOffer() {
    if (this.negotiationStarted) return;
    this.negotiationStarted = true;
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this._emit('offer', offer);
    } catch (e) {
      console.error('Create offer error', e);
      this._emit('error', { type: 'create-offer', error: e.message });
    }
  }

  async handleOffer(sdp) {
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this._emit('answer', answer);
    } catch (e) {
      console.error('Handle offer error', e);
      this._emit('error', { type: 'handle-offer', error: e.message });
    }
  }

  async handleAnswer(sdp) {
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      this.flushPendingCandidates();
    } catch (e) {
      console.error('Handle answer error', e);
      this._emit('error', { type: 'handle-answer', error: e.message });
    }
  }

  async addIceCandidate(candidate) {
    try {
      if (this.pc.remoteDescription && candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('✅ ICE candidate added');
      } else {
        this.pendingCandidates.push(candidate);
        console.log('⏳ ICE candidate queued (waiting for remote description)');
      }
    } catch (e) {
      console.error('Add ICE candidate error', e);
    }
  }

  flushPendingCandidates() {
    if (this.pendingCandidates.length && this.pc.remoteDescription) {
      console.log(`📦 Flushing ${this.pendingCandidates.length} pending ICE candidates`);
      this.pendingCandidates.forEach(candidate =>
        this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error)
      );
      this.pendingCandidates = [];
    }
  }

  async _createPeerConnection() {
    if (this.pc) this._cleanupPeerConnection();
    
    const config = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
    };
    
    console.log('🔌 Creating RTCPeerConnection with config:', config);
    this.pc = new RTCPeerConnection(config);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('📡 ICE candidate gathered:', event.candidate.type);
        this._emit('icecandidate', event.candidate);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      console.log('❄️ ICE connection state:', state);
      this._emit('iceconnectionstatechange', state);
      
      // Handle ICE failure
      if (state === 'failed') {
        console.error('❌ ICE connection failed');
        this._emit('error', { type: 'ice-failed', state });
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      console.log('🔗 Peer connection state:', state);
      this._emit('connectionstatechange', state);
      
      if (state === 'connected') {
        console.log('✅ WebRTC connection established');
      } else if (state === 'failed') {
        console.error('❌ Peer connection failed');
        this._emit('error', { type: 'connection-failed', state });
      }
    };

    this.pc.onicegatheringstatechange = () => {
      console.log('📡 ICE gathering state:', this.pc.iceGatheringState);
    };

    this.pc.onsignalingstatechange = () => {
      console.log('🔄 Signaling state:', this.pc.signalingState);
    };

    this.pc.ondatachannel = (event) => {
      console.log('📡 Received data channel from peer');
      this.dataChannel = event.channel;
      this._setupDataChannel();
    };

    if (this.isInitiator) {
      console.log('🎯 Creating data channel as initiator');
      this.dataChannel = this.pc.createDataChannel('aetherlink', { 
        ordered: true,
        maxRetransmits: 3,
      });
      this._setupDataChannel();
    }
  }

  _setupDataChannel() {
    if (!this.dataChannel) return;
    
    this.dataChannel.onopen = () => {
      console.log('✅ Data channel open');
      this._emit('datachannelopen');
    };
    
    this.dataChannel.onclose = () => {
      console.log('🔌 Data channel closed');
      this._emit('datachannelclose');
    };
    
    this.dataChannel.onerror = (e) => {
      console.error('❌ DataChannel error', e);
      this._emit('error', { type: 'datachannel-error', error: e });
    };
    
    this.dataChannel.onmessage = (event) => {
      this._emit('message', event.data);
    };
  }

  _cleanupPeerConnection() {
    if (this.pc) {
      console.log('🧹 Cleaning up peer connection');
      this.pc.onicecandidate = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onconnectionstatechange = null;
      this.pc.onicegatheringstatechange = null;
      this.pc.onsignalingstatechange = null;
      this.pc.ondatachannel = null;
      
      if (this.dataChannel) {
        this.dataChannel.onopen = null;
        this.dataChannel.onclose = null;
        this.dataChannel.onerror = null;
        this.dataChannel.onmessage = null;
      }
      
      this.pc.close();
      this.pc = null;
    }
    this.dataChannel = null;
    this.pendingCandidates = [];
    this.negotiationStarted = false;
  }

  _emit(event, data) {
    if (this.onStateChange) {
      this.onStateChange(event, data);
    }
  }

  send(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      if (typeof message === 'string') {
        this.dataChannel.send(message);
      } else {
        this.dataChannel.send(JSON.stringify(message));
      }
      return true;
    } else {
      console.warn('⚠️ Cannot send message: data channel not open');
      return false;
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting peer service');
    this._cleanupPeerConnection();
  }

  getConnectionState() {
    return this.pc ? this.pc.connectionState : 'closed';
  }

  getIceConnectionState() {
    return this.pc ? this.pc.iceConnectionState : 'closed';
  }
}

export default PeerService;