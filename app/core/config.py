from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://admin:secret123@localhost:5432/kpi_system"

    # JWT
    SECRET_KEY: str = "change-this-to-a-very-long-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60        # 1 giờ (PB012)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Email (PB007, PB024, PB034)
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_FROM: str = "noreply@kpinoibo.com"
    MAIL_FROM_NAME: str = "KPI Nội Bộ"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # Security
    MAX_LOGIN_ATTEMPTS: int = 5              # PB003
    LOCKOUT_MINUTES: int = 15               # PB003
    OTP_EXPIRE_MINUTES: int = 5             # PB011
    RESET_TOKEN_EXPIRE_MINUTES: int = 5     # PB007
    SESSION_EXPIRE_HOURS: int = 8           # PB004

    # AES encryption key (32 bytes for AES-256) - PB015
    AES_KEY: str = "12345678901234567890123456789012"

    # App
    APP_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
