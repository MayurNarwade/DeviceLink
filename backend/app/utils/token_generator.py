import secrets
import string
from app.core.config import settings

def generate_session_id(length=16) -> str:
    return ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(length))

def generate_otp(length=6) -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def generate_peer_token(length=32) -> str:
    return secrets.token_hex(length)