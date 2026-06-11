from fastapi import HTTPException, Depends, Header
from app.services.session_service import SessionService

async def get_session_from_id(session_id: str):
    """Dependency that fetches a session or raises 404."""
    session = await SessionService.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

async def verify_peer_token(
    session_id: str,
    peer_id: str = Header(None),
    token: str = Header(None)
):
    """Dependency for verifying peer credentials from headers (for REST endpoints if needed)."""
    if not peer_id or not token:
        raise HTTPException(status_code=401, detail="Missing peer credentials")
    valid = await SessionService.verify_peer(session_id, peer_id, token)
    if not valid:
        raise HTTPException(status_code=403, detail="Invalid peer token")
    return peer_id