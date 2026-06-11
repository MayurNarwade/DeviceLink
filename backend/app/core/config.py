import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Session
    SESSION_SECRET: str = "change-me-in-production"
    SESSION_TTL_SECONDS: int = 3600
    
    # CORS - Store as string, we'll parse it manually
    ALLOWED_ORIGINS_STR: str = "http://localhost:5173"
    
    # ICE Servers (Metered.ca)
    STUN_URL: str = "stun:stun.relay.metered.ca:80"
    TURN_URL_UDP: str = "turn:global.relay.metered.ca:80"
    TURN_URL_TCP: str = "turn:global.relay.metered.ca:80?transport=tcp"
    TURN_URL_TLS: str = "turn:global.relay.metered.ca:443"
    TURNS_URL_TLS: str = "turns:global.relay.metered.ca:443?transport=tcp"
    TURN_USERNAME: str = ""
    TURN_PASSWORD: str = ""

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Parse comma-separated origins string into list"""
        if not self.ALLOWED_ORIGINS_STR:
            return ["http://localhost:5173"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",") if origin.strip()]

    @property
    def ice_servers(self) -> list:
        """Return complete ICE servers configuration for WebRTC"""
        servers = [
            {"urls": [self.STUN_URL]}
        ]
        
        # Add TURN servers only if credentials are provided
        if self.TURN_USERNAME and self.TURN_PASSWORD:
            # UDP TURN (best performance)
            if self.TURN_URL_UDP:
                servers.append({
                    "urls": [self.TURN_URL_UDP],
                    "username": self.TURN_USERNAME,
                    "credential": self.TURN_PASSWORD,
                })
            
            # TCP TURN (for strict firewalls)
            if self.TURN_URL_TCP:
                servers.append({
                    "urls": [self.TURN_URL_TCP],
                    "username": self.TURN_USERNAME,
                    "credential": self.TURN_PASSWORD,
                })
            
            # TLS TURN (secure, port 443)
            if self.TURN_URL_TLS:
                servers.append({
                    "urls": [self.TURN_URL_TLS],
                    "username": self.TURN_USERNAME,
                    "credential": self.TURN_PASSWORD,
                })
            
            # TURNS with TCP (most compatible)
            if self.TURNS_URL_TLS:
                servers.append({
                    "urls": [self.TURNS_URL_TLS],
                    "username": self.TURN_USERNAME,
                    "credential": self.TURN_PASSWORD,
                })
        
        return servers

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = 'ignore'  # Ignore extra fields from .env

settings = Settings()