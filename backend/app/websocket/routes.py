import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket.connection_manager import manager
from app.websocket.signaling import SignalingService
from app.services.session_service import SessionService

router = APIRouter()

@router.websocket("/signal")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str = Query(...),
    peer_id: str = Query(...),
    token: str = Query(...),
    is_reconnect: bool = Query(False)
):
    # Verify peer
    if is_reconnect:
        peer = await SessionService.reconnect_peer(session_id, peer_id, token)
        if not peer:
            await websocket.close(code=4001)
            return
    else:
        valid = await SessionService.verify_peer(session_id, peer_id, token)
        if not valid:
            await websocket.close(code=4001)
            return

    await manager.connect(session_id, peer_id, websocket)
    try:
        # Small delay to ensure the initiator's WebSocket handler is ready
        await asyncio.sleep(0.3)
        await SignalingService.notify_peer_joined(session_id, peer_id, manager)

        while True:
            data = await websocket.receive_json()
            response = await SignalingService.handle_message(data, session_id, peer_id, manager)
            if response:
                await manager.send_to_peer(session_id, peer_id, response)
    except WebSocketDisconnect:
        await SessionService.disconnect_peer(session_id, peer_id)
        manager.disconnect(session_id, peer_id)
        await SignalingService.notify_peer_left(session_id, peer_id, manager)
    except Exception:
        await SessionService.disconnect_peer(session_id, peer_id)
        manager.disconnect(session_id, peer_id)