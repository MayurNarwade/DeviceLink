from fastapi import APIRouter, HTTPException
from app.services.session_service import SessionService
from app.schemas.session import CreateSessionResponse, JoinSessionRequest, JoinSessionResponse, SessionStatusResponse
from app.core.constants import ERR_SESSION_NOT_FOUND, ERR_SESSION_FULL, ERR_INVALID_OTP

router = APIRouter()

@router.post("/session", response_model=CreateSessionResponse)
async def create_session():
    session = await SessionService.create_session()
    join_url = f"/join?session={session.session_id}"
    return CreateSessionResponse(
        session_id=session.session_id,
        otp=session.otp,
        join_url=join_url,
        expires_at=int(session.expires_at)
    )

@router.post("/session/join", response_model=JoinSessionResponse)
async def join_session(body: JoinSessionRequest):
    peer = await SessionService.join_session(body.session_id, body.otp)
    if not peer:
        raise HTTPException(status_code=400, detail=ERR_INVALID_OTP)
    ws_url = f"/ws/signal?session_id={body.session_id}&peer_id={peer.peer_id}&token={peer.token}"
    return JoinSessionResponse(peer_id=peer.peer_id, token=peer.token, ws_url=ws_url)

@router.get("/session/{session_id}/status")
async def session_status(session_id: str):
    session = await SessionService.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=ERR_SESSION_NOT_FOUND)
    return session.api_status_dict()

@router.delete("/session/{session_id}")
async def close_session(session_id: str):
    await SessionService.close_session(session_id)
    return {"status": "closed"}