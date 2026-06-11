import React from 'react';
import usePeerStore from '../store/peerStore';
import useSessionStore from '../store/sessionStore';

export default function ConnectionStatusBadge() {
  const connectionState = usePeerStore((s) => s.connectionState);
  const iceState = usePeerStore((s) => s.iceConnectionState);
  const dataChannelState = usePeerStore((s) => s.dataChannelState);
  const peerCount = useSessionStore((s) => s.peerCount);

  const statusConfig = {
    new: { text: 'Initialising', color: 'bg-gray-400', icon: '◌' },
    connecting: { text: 'Connecting...', color: 'bg-yellow-400', icon: '⟳' },
    connected: { text: 'Connected', color: 'bg-green-500', icon: '●' },
    failed: { text: 'Connection failed', color: 'bg-red-500', icon: '✗' },
    closed: { text: 'Closed', color: 'bg-gray-500', icon: '✗' },
  };

  const config = statusConfig[connectionState] || statusConfig.new;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2.5 h-2.5 rounded-full ${config.color} animate-pulse`} />
      <span className="text-gray-700 dark:text-gray-300">
        {config.icon} {config.text}
      </span>
      <span className="text-gray-400">| Peers: {peerCount}/2</span>
      <span className="text-xs text-gray-400">
        ICE: {iceState} | DC: {dataChannelState}
      </span>
    </div>
  );
}