from __future__ import annotations
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # IMAP connection
    IMAP_HOST: str = ""
    IMAP_PORT: int = 993
    IMAP_USER: str = ""
    IMAP_PASSWORD: str = ""
    IMAP_SSL: bool = True

    # Domain filter (optional). If set, only recipients in this domain are stored
    ALLOWED_DOMAIN: Optional[str] = None

    # Polling
    POLL_INTERVAL_SEC: int = 60

    # Storage
    DB_URL: str = "sqlite:///./data.db"

    # Auth
    JWT_SECRET: str = "change-me-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ADMIN_TOKEN: str = "change-me-admin"

    # Server
    # Default to the package's web folder
    STATIC_DIR: str = "imap_prefix_mail/web"


settings = Settings()