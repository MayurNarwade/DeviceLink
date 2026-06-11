# Session states
SESSION_WAITING = "waiting"
SESSION_CONNECTED = "connected"
SESSION_EXPIRED = "expired"
SESSION_CLOSED = "closed"

# WebSocket events
WS_JOIN = "join"
WS_PEER_JOINED = "peer_joined"
WS_OFFER = "offer"
WS_ANSWER = "answer"
WS_ICE_CANDIDATE = "ice_candidate"
WS_PEER_LEFT = "peer_left"
WS_HEARTBEAT = "heartbeat"
WS_ERROR = "error"
WS_RECONNECT = "reconnect"          # new event

# Redis key patterns
REDIS_SESSION_KEY = "session:{session_id}"
REDIS_SESSION_TTL = 3600

# Error codes
ERR_SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
ERR_SESSION_FULL = "SESSION_FULL"
ERR_SESSION_EXPIRED = "SESSION_EXPIRED"
ERR_INVALID_OTP = "INVALID_OTP"
ERR_INVALID_TOKEN = "INVALID_TOKEN"
ERR_INVALID_MESSAGE = "INVALID_MESSAGE"
ERR_PEER_NOT_RECONNECTABLE = "PEER_NOT_RECONNECTABLE"

# Peer disconnect timeout (seconds) before permanent removal
PEER_DISCONNECT_TIMEOUT = 30