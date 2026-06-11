from pydantic import BaseModel, Field

class CreateSessionResponse(BaseModel):
    session_id: str
    otp: str
    join_url: str
    expires_at: int

class JoinSessionRequest(BaseModel):
    session_id: str
    otp: str

class JoinSessionResponse(BaseModel):
    peer_id: str
    token: str
    ws_url: str

class SessionStatusResponse(BaseModel):
    session_id: str
    state: str
    peer_count: int
    expires_at: float