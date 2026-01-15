"""JWT configuration."""

from pydantic_settings import BaseSettings


class JWTConfig(BaseSettings):
    """JWT token settings."""

    SECRET_KEY: str = "your-secret-key-change-this-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


jwt_config = JWTConfig()

