import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut, Download } from 'lucide-react';
import useSessionStore from '../store/sessionStore';
import usePeerStore from '../store/peerStore';
import useChatStore from '../store/chatStore';
import useTransferStore from '../store/transferStore';
import { connectWebSocket, sendMessage, disconnectWebSocket } from '../services/websocket';
import PeerService from '../lib/peer';
import ConnectionStatusBadge from '../components/ConnectionStatusBadge';
import ChatPanel from '../components/ChatPanel';
import TransferPanel from '../components/TransferPanel';

const DeviceNames = ({ myName, peerName, isInitiator }) => (
  <div className="flex items-center justify-between gap-4 p-3 bg-white/5 rounded-xl">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold">{myName?.charAt(0) || '?'}</span>
      </div>
      <div>
        <p className="text-white text-sm font-medium">{myName || 'You'}</p>
        <p className="text-purple-300 text-xs">{isInitiator ? 'Creator' : 'Joiner'}</p>
      </div>
    </div>
    <ArrowRight className="w-4 h-4 text-purple-400" />
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold">{peerName?.charAt(0) || '?'}</span>
      </div>
      <div>
        <p className="text-white text-sm font-medium">{peerName || 'Waiting...'}</p>
        <p className="text-purple-300 text-xs">{peerName ? 'Peer' : 'Not connected'}</p>
      </div>
    </div>
  </div>
);

export default function SessionRoom() {
  const { sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  const {
    peerId,
    token,
    sessionId: storeSessionId,
    expiresAt,
    isInitiator,
    deviceName,
    peerName,
    setPeerCount,
    setReconnect,
    isReconnect,
    setPeerName: setPeerNameStore,
  } = useSessionStore();
  const { setConnectionState, setIceConnectionState, setDataChannelState, reset } = usePeerStore();
  const { addMessage, messages } = useChatStore();
  const { outgoingFiles, incomingFiles } = useTransferStore();
  const { clearOutgoing, clearIncoming } = useTransferStore();
  const [expiryCount, setExpiryCount] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const peerServiceRef = useRef(null);
  const initialized = useRef(false);
  const sessionId = urlSessionId || storeSessionId;

  // Request desktop notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show notification helper
  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  // Countdown
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const now = Date.now() / 1000;
      const diff = expiresAt - now;
      if (diff <= 0) {
        setExpiryCount('Expired');
        navigate('/expired');
      } else {
        const mins = Math.floor(diff / 60);
        const secs = Math.floor(diff % 60);
        setExpiryCount(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, navigate]);

  // WebSocket message handler
  const handleWSMessage = useCallback(
    (data) => {
      const { type, payload } = data;
      switch (type) {
        case 'offer':
          if (peerServiceRef.current && !peerServiceRef.current.isInitiator)
            peerServiceRef.current.handleOffer(payload);
          break;
        case 'answer':
          if (peerServiceRef.current && peerServiceRef.current.isInitiator) {
            peerServiceRef.current.handleAnswer(payload);
            peerServiceRef.current.flushPendingCandidates();
          }
          break;
        case 'ice_candidate':
          peerServiceRef.current?.addIceCandidate(payload);
          break;
        case 'peer_joined':
          console.log('peer_joined received');
          setPeerCount(2);
          addMessage({ type: 'system', text: 'Peer joined', timestamp: Date.now() });
          showNotification('AetherLink', 'Peer joined the session');
          if (peerServiceRef.current && peerServiceRef.current.isInitiator && !isReconnect) {
            setTimeout(() => peerServiceRef.current.createOffer(), 100);
          }
          break;
        case 'peer_left':
          setPeerCount(1);
          addMessage({ type: 'system', text: 'Peer left', timestamp: Date.now() });
          showNotification('AetherLink', 'Peer left the session');
          break;
        case 'error':
          addMessage({ type: 'system', text: `Error: ${payload.message}`, timestamp: Date.now() });
          break;
        default:
          break;
      }
    },
    [setPeerCount, addMessage, isReconnect]
  );

  // Main connection effect
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!sessionId || !peerId || !token) {
      console.error('Missing connection parameters');
      navigate('/');
      return;
    }

    const reconnectFlag = isReconnect;
    console.log(`Connecting WebSocket – isReconnect: ${reconnectFlag}`);
    connectWebSocket(sessionId, peerId, token, handleWSMessage, reconnectFlag);

    const peerService = new PeerService(sessionId, peerId, token, (event, detail) => {
      switch (event) {
        case 'icecandidate':
          sendMessage({ type: 'ice_candidate', payload: detail });
          break;
        case 'offer':
          sendMessage({ type: 'offer', payload: detail });
          break;
        case 'answer':
          sendMessage({ type: 'answer', payload: detail });
          break;
        case 'iceconnectionstatechange':
          setIceConnectionState(detail);
          break;
        case 'connectionstatechange':
          setConnectionState(detail);
          break;
        case 'datachannelopen':
          setDataChannelState('open');
          setConnectionState('connected');
          // Send own device name
          if (peerServiceRef.current?.dataChannel?.readyState === 'open') {
            peerServiceRef.current.dataChannel.send(JSON.stringify({
              type: 'name',
              name: deviceName
            }));
          }
          addMessage({ type: 'system', text: 'Connection established', timestamp: Date.now() });
          showNotification('AetherLink', 'Connected to peer');
          break;
        case 'datachannelclose':
          setDataChannelState('closed');
          break;
        default:
          break;
      }
    });
    peerServiceRef.current = peerService;
    peerService.initialize(isInitiator);

    if (reconnectFlag && isInitiator) {
      setTimeout(() => {
        if (peerServiceRef.current) {
          peerServiceRef.current.createOffer();
          setReconnect(false);
        }
      }, 500);
    }

    return () => {
      disconnectWebSocket();
      peerService.disconnect();
      clearOutgoing();
      clearIncoming();
      reset();
    };
  }, []);

  // Listen for peer name via data channel
  useEffect(() => {
    const dc = peerServiceRef.current?.dataChannel;
    if (!dc) return;
    const handleNameMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'name' && data.name) {
          setPeerNameStore(data.name);
          console.log('Received peer name:', data.name);
        }
      } catch {}
    };
    dc.addEventListener('message', handleNameMessage);
    return () => dc.removeEventListener('message', handleNameMessage);
  }, [peerServiceRef.current?.dataChannel, setPeerNameStore]);

  // Export session history
  const exportHistory = () => {
    const history = {
      sessionId,
      exportedAt: new Date().toISOString(),
      messages: messages.map(m => ({ text: m.text, timestamp: m.timestamp, from: m.from, status: m.status })),
      files: {
        sent: outgoingFiles.map(f => ({ name: f.name, size: f.size, status: f.status })),
        received: incomingFiles.map(f => ({ name: f.name, size: f.size, status: f.status })),
      },
    };
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aetherlink-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const endSession = async () => {
    setShowEndConfirm(false);
    disconnectWebSocket();
    if (peerServiceRef.current) peerServiceRef.current.disconnect();
    try {
      await fetch(`http://localhost:8000/api/session/${sessionId}`, { method: 'DELETE' });
    } catch {}
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b dark:border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-gray-500">{sessionId}</span>
            <ConnectionStatusBadge />
            <span className={`text-sm font-mono ${expiryCount === 'Expired' ? 'text-red-500' : ''}`}>
              {expiryCount}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportHistory}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 text-sm"
              title="Export session history"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
            >
              <LogOut size={16} /> End
            </button>
          </div>
        </div>
      </div>

      {/* Device names */}
      <div className="max-w-6xl mx-auto w-full px-4 pt-4">
        <DeviceNames
          myName={deviceName || 'You'}
          peerName={peerName}
          isInitiator={isInitiator}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
        <div className="flex-1 min-h-0 border-r dark:border-gray-800 flex flex-col">
          <div className="p-2 border-b dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-500">Chat</h3>
          </div>
          <ChatPanel dataChannel={peerServiceRef.current?.dataChannel} />
        </div>
        <div className="w-full md:w-80 lg:w-96 min-h-0 flex flex-col">
          <div className="p-2 border-b dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-500">Files</h3>
          </div>
          <TransferPanel dataChannel={peerServiceRef.current?.dataChannel} />
        </div>
      </div>

      {/* End confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold">End Session?</h3>
            <p className="text-sm text-gray-500">This will close the session for both peers. All data will be lost.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowEndConfirm(false)} className="px-4 py-2 rounded-lg border dark:border-gray-600">
                Cancel
              </button>
              <button onClick={endSession} className="px-4 py-2 rounded-lg bg-red-600 text-white">
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}