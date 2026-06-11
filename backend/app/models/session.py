import time
from dataclasses import dataclass, field
from app.core.constants import SESSION_WAITING, SESSION_CONNECTED, SESSION_EXPIRED, SESSION_CLOSED

@dataclass
class Peer:
    peer_id: str
    token: str
    connected: bool = True
    connected_at: float = field(default_factory=time.time)
    disconnected_at: float = 0.0

    def disconnect(self):
        self.connected = False
        self.disconnected_at = time.time()

    def reconnect(self):
        self.connected = True
        self.disconnected_at = 0.0

@dataclass
class Session:
    session_id: str
    otp: str
    state: str = SESSION_WAITING
    created_at: float = field(default_factory=time.time)
    expires_at: float = 0.0
    peers: list = field(default_factory=list)

    def __post_init__(self):
        if not self.expires_at:
            self.expires_at = self.created_at + 3600

    def add_peer(self, peer: Peer):
        if len(self.peers) >= 2:
            raise ValueError("Session is full")
        self.peers.append(peer)
        if len(self.peers) == 2:
            self.state = SESSION_CONNECTED

    def remove_peer(self, peer_id: str):
        self.peers = [p for p in self.peers if p.peer_id != peer_id]
        if len(self.peers) == 0:
            self.state = SESSION_CLOSED
        elif self.state == SESSION_CONNECTED and len(self.peers) < 2:
            self.state = SESSION_WAITING

    def get_peer(self, peer_id: str) -> Peer | None:
        for p in self.peers:
            if p.peer_id == peer_id:
                return p
        return None

    def to_dict(self):
        """Serialise for Redis storage (including peers)."""
        return {
            "session_id": self.session_id,
            "otp": self.otp,
            "state": self.state,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "peers": [{"peer_id": p.peer_id, "token": p.token, "connected": p.connected,
                       "connected_at": p.connected_at, "disconnected_at": p.disconnected_at}
                      for p in self.peers],
        }

    @classmethod
    def from_dict(cls, data):
        """Reconstruct a Session from a dict (used by Redis deserialization)."""
        peers_data = data.pop('peers', [])
        # Remove any extra keys that might have snuck in
        data.pop('peer_count', None)
        session = cls(**data)
        session.peers = [Peer(**p) for p in peers_data]
        return session

    def api_status_dict(self):
        """For REST API responses (includes peer count and connected info)."""
        return {
            "session_id": self.session_id,
            "otp": self.otp,
            "state": self.state,
            "peer_count": len(self.peers),
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "peers": [{"peer_id": p.peer_id, "connected": p.connected} for p in self.peers],
        }