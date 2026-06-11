import time
from app.models.session import Session, Peer
from app.utils.token_generator import generate_session_id, generate_otp, generate_peer_token
from app.utils.redis_client import redis_client
from app.core.constants import (
    SESSION_WAITING, SESSION_EXPIRED, SESSION_CLOSED,
    ERR_SESSION_NOT_FOUND, ERR_SESSION_FULL, ERR_INVALID_OTP, ERR_INVALID_TOKEN,
    ERR_PEER_NOT_RECONNECTABLE, PEER_DISCONNECT_TIMEOUT
)

class SessionService:
    @staticmethod
    async def create_session() -> Session:
        session_id = generate_session_id()
        otp = generate_otp()
        session = Session(session_id=session_id, otp=otp)
        await redis_client.set_session(session)
        return session

    @staticmethod
    async def get_session(session_id: str) -> Session | None:
        return await redis_client.get_session(session_id)

    @staticmethod
    async def join_session(session_id: str, otp: str) -> Peer | None:
        session = await redis_client.get_session(session_id)
        if not session:
            return None
        if session.state == SESSION_EXPIRED or session.expires_at < time.time():
            session.state = SESSION_EXPIRED
            await redis_client.set_session(session)
            return None
        if session.otp != otp:
            return None
        if len(session.peers) >= 2:
            return None  # full
        peer_id = generate_peer_token()[:12]
        token = generate_peer_token()
        peer = Peer(peer_id=peer_id, token=token)
        session.add_peer(peer)
        await redis_client.set_session(session)
        return peer

    @staticmethod
    async def reconnect_peer(session_id: str, peer_id: str, token: str) -> Peer | None:
        """Attempt to reconnect a previously disconnected peer."""
        session = await redis_client.get_session(session_id)
        if not session or session.expires_at < time.time():
            return None
        peer = session.get_peer(peer_id)
        if not peer or peer.token != token:
            return None
        if not peer.connected:
            # Allow reconnection if still within timeout
            if time.time() - peer.disconnected_at > PEER_DISCONNECT_TIMEOUT:
                return None  # too late
            peer.reconnect()
        # If already connected, still allow reconnection (duplicate, but close old WS)
        await redis_client.set_session(session)
        return peer

    @staticmethod
    async def disconnect_peer(session_id: str, peer_id: str):
        """Mark peer as disconnected but keep in session for potential reconnection."""
        session = await redis_client.get_session(session_id)
        if session:
            peer = session.get_peer(peer_id)
            if peer:
                peer.disconnect()
                await redis_client.set_session(session)

    @staticmethod
    async def remove_peer(session_id: str, peer_id: str):
        """Permanently remove a peer (after timeout)."""
        session = await redis_client.get_session(session_id)
        if session:
            session.remove_peer(peer_id)
            await redis_client.set_session(session)

    @staticmethod
    async def close_session(session_id: str):
        session = await redis_client.get_session(session_id)
        if session:
            session.state = SESSION_CLOSED
            await redis_client.set_session(session)

    @staticmethod
    async def verify_peer(session_id: str, peer_id: str, token: str) -> bool:
        session = await redis_client.get_session(session_id)
        if not session:
            return False
        peer = session.get_peer(peer_id)
        return peer is not None and peer.token == token