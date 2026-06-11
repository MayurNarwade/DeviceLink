from pydantic import BaseModel, Field
from typing import Any, Optional

class WSMessage(BaseModel):
    type: str
    payload: Optional[Any] = None

class JoinPayload(BaseModel):
    session_id: str
    peer_id: str
    token: str

class SDPPayload(BaseModel):
    sdp: str

class ICECandidatePayload(BaseModel):
    candidate: str
    sdpMid: Optional[str] = None
    sdpMLineIndex: Optional[int] = None