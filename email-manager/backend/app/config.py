from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://user:password@localhost/emailmanager"
    
    # IMAP Configuration
    imap_host: str = "imap.example.com"
    imap_port: int = 993
    imap_username: str = "catchall@example.com"
    imap_password: str = "password"
    imap_use_ssl: bool = True
    
    # Security
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Admin
    admin_email: str = "admin@example.com"
    admin_password: str = "changeme"
    
    class Config:
        env_file = ".env"


settings = Settings()