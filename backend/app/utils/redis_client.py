import redis.asyncio as redis
import json
from app.core.config import settings
from app.models.session import Session

class RedisClient:
    def __init__(self):
        self.client: redis.Redis = None

    async def connect(self):
        self.client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await self.client.ping()

    async def disconnect(self):
        if self.client:
            await self.client.close()

    async def ping(self):
        return await self.client.ping()

    async def set_session(self, session: Session):
        key = f"session:{session.session_id}"
        data = json.dumps(session.to_dict())
        await self.client.setex(key, settings.SESSION_TTL_SECONDS, data)

    async def get_session(self, session_id: str) -> Session | None:
        key = f"session:{session_id}"
        data = await self.client.get(key)
        if not data:
            return None
        raw = json.loads(data)
        return Session.from_dict(raw)

redis_client = RedisClient()