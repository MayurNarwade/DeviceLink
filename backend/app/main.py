import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.core.config import settings
from app.api.session_routes import router as session_router
from app.websocket.routes import router as ws_router
from app.utils.redis_client import redis_client
from app.utils.cleanup import cleanup_stale_sessions
from app.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware

# Add this import for the new webrtc router
from app.api.webrtc import router as webrtc_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await redis_client.connect()
    asyncio.create_task(cleanup_stale_sessions())
    print("✅ Backend started, Redis connected")
    print(f"✅ TURN configured: {settings.TURN_USERNAME is not None}")
    yield
    # Shutdown
    await redis_client.disconnect()
    print("✅ Backend shut down")

app = FastAPI(title="AetherLink", version="0.1.0", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Routes
app.include_router(session_router, prefix="/api")
app.include_router(ws_router, prefix="/ws")
app.include_router(webrtc_router, prefix="/api")  # Add this line

@app.get("/health")
async def health():
    return {"status": "ok", "redis": await redis_client.ping()}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)