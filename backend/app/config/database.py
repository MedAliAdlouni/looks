"""Database configuration."""

from pydantic_settings import BaseSettings


class DatabaseConfig(BaseSettings):
    """Database connection settings."""

    DATABASE_URL: str = ""
    DB_ECHO: bool = False  # SQLAlchemy echo mode (set to True for SQL logging)

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


db_config = DatabaseConfig()

