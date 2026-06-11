from app.core.constants import (
    WS_JOIN, WS_PEER_JOINED, WS_OFFER, WS_ANSWER, WS_ICE_CANDIDATE,
    WS_PEER_LEFT, WS_HEARTBEAT, WS_ERROR
)
from app.schemas.websocket import WSMessage, JoinPayload, SDPPayload, ICECandidatePayload
from pydantic import ValidationError

class SignalingService:
    @staticmethod
    async def handle_message(data: dict, session_id: str, peer_id: str, manager) -> dict | None:
        try:
            msg = WSMessage(**data)
            event_type = msg.type
            payload = msg.payload

            if event_type == WS_JOIN:
                # Already authenticated, just acknowledge
                return {"type": WS_JOIN, "payload": {"peer_id": peer_id}}
            elif event_type == WS_OFFER:
                await manager.broadcast_to_session(session_id, {"type": WS_OFFER, "payload": payload}, exclude_peer=peer_id)
            elif event_type == WS_ANSWER:
                await manager.broadcast_to_session(session_id, {"type": WS_ANSWER, "payload": payload}, exclude_peer=peer_id)
            elif event_type == WS_ICE_CANDIDATE:
                await manager.broadcast_to_session(session_id, {"type": WS_ICE_CANDIDATE, "payload": payload}, exclude_peer=peer_id)
            elif event_type == WS_HEARTBEAT:
                return {"type": WS_HEARTBEAT, "payload": {"timestamp": payload.get("timestamp")}}
            else:
                return {"type": WS_ERROR, "payload": {"message": "Unknown event"}}
        except ValidationError as e:
            return {"type": WS_ERROR, "payload": {"message": str(e)}}

    @staticmethod
    async def notify_peer_joined(session_id: str, new_peer_id: str, manager):
        await manager.broadcast_to_session(session_id, {
            "type": WS_PEER_JOINED,
            "payload": {"peer_id": new_peer_id}
        }, exclude_peer=new_peer_id)

    @staticmethod
    async def notify_peer_left(session_id: str, left_peer_id: str, manager):
        await manager.broadcast_to_session(session_id, {
            "type": WS_PEER_LEFT,
            "payload": {"peer_id": left_peer_id}
        }, exclude_peer=left_peer_id)