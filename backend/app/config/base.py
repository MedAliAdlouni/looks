"""Base configuration settings."""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Base application settings."""

    # Environment
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env


settings = Settings()

