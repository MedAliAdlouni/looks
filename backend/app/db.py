"""Database connection and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config.database import db_config

if not db_config.DATABASE_URL:
    raise ValueError("DATABASE_URL is not configured")

# Create async engine
engine = create_async_engine(
    db_config.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    echo=db_config.DB_ECHO,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
