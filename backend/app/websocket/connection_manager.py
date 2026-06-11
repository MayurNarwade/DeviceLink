from fastapi import WebSocket
from collections import defaultdict
from typing import Dict, List
import asyncio
from app.core.constants import PEER_DISCONNECT_TIMEOUT
from app.services.session_service import SessionService

class ConnectionManager:
    def __init__(self):
        # session_id -> list of (peer_id, websocket)
        self.active_connections: Dict[str, List[tuple]] = defaultdict(list)
        # Disconnect timers for delayed cleanup
        self.disconnect_timers: Dict[tuple, asyncio.Task] = {}

    async def connect(self, session_id: str, peer_id: str, websocket: WebSocket):
        await websocket.accept()
        # Remove any existing connection for this peer (reconnect case)
        self._remove_peer_ws(session_id, peer_id)
        self.active_connections[session_id].append((peer_id, websocket))
        # Cancel any pending disconnect timer
        timer_key = (session_id, peer_id)
        if timer_key in self.disconnect_timers:
            self.disconnect_timers[timer_key].cancel()
            del self.disconnect_timers[timer_key]

    def disconnect(self, session_id: str, peer_id: str):
        self._remove_peer_ws(session_id, peer_id)
        # Schedule permanent removal after timeout
        timer_key = (session_id, peer_id)
        if timer_key in self.disconnect_timers:
            self.disconnect_timers[timer_key].cancel()
        task = asyncio.create_task(self._delayed_cleanup(session_id, peer_id))
        self.disconnect_timers[timer_key] = task

    async def _delayed_cleanup(self, session_id: str, peer_id: str):
        await asyncio.sleep(PEER_DISCONNECT_TIMEOUT)
        # Check if peer reconnected in the meantime; if not, permanently remove
        session = await SessionService.get_session(session_id)
        if session:
            peer = session.get_peer(peer_id)
            if peer and not peer.connected:
                await SessionService.remove_peer(session_id, peer_id)
        timer_key = (session_id, peer_id)
        if timer_key in self.disconnect_timers:
            del self.disconnect_timers[timer_key]

    def _remove_peer_ws(self, session_id: str, peer_id: str):
        self.active_connections[session_id] = [
            (p, ws) for (p, ws) in self.active_connections[session_id] if p != peer_id
        ]
        if not self.active_connections[session_id]:
            del self.active_connections[session_id]

    async def broadcast_to_session(self, session_id: str, message: dict, exclude_peer: str = None):
        for peer_id, ws in self.active_connections.get(session_id, []):
            if peer_id != exclude_peer:
                try:
                    await ws.send_json(message)
                except:
                    pass

    async def send_to_peer(self, session_id: str, peer_id: str, message: dict):
        for p, ws in self.active_connections.get(session_id, []):
            if p == peer_id:
                await ws.send_json(message)
                break

manager = ConnectionManager()