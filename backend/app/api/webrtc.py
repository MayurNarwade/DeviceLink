from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/webrtc", tags=["webrtc"])

@router.get("/ice-servers")
async def get_ice_servers():
    """Return ICE server configuration for WebRTC clients"""
    return {"iceServers": settings.ice_servers}