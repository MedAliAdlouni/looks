"""API configuration."""

from pydantic_settings import BaseSettings


class APIConfig(BaseSettings):
    """API settings."""

    # File upload settings
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB default
    UPLOAD_DIR: str = "uploads"

    # CORS settings (if needed)
    CORS_ORIGINS: list = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


api_config = APIConfig()

