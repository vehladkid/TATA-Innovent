"""Async SQLAlchemy engine — initialised lazily when DATABASE_URL is set.

To enable: set DATABASE_URL in .env, then call init_db() at startup.
Driver: asyncpg (not in requirements.txt yet — add asyncpg==0.30.0 when wiring DB).
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

engine = None
AsyncSessionLocal: sessionmaker | None = None


def init_db(database_url: str) -> None:
    global engine, AsyncSessionLocal
    # Supabase gives a postgres:// URL; SQLAlchemy async needs postgresql+asyncpg://
    url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(url, echo=False, pool_pre_ping=True)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
