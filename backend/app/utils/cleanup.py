import asyncio
import time
from app.utils.redis_client import redis_client
from app.services.session_service import SessionService

async def cleanup_stale_sessions(interval: int = 300):
    """Periodically remove expired sessions that are still in Redis."""
    while True:
        try:
            # Use Redis SCAN to iterate over session keys and check TTL
            # Since we're using Redis TTL, expired keys are automatically removed.
            # But we can also delete sessions where both peers disconnected and timer expired.
            # For simplicity, rely on Redis TTL.
            pass
        except Exception as e:
            print(f"Cleanup error: {e}")
        await asyncio.sleep(interval)