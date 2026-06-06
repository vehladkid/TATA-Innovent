"""SQLAlchemy ORM models. Tables are NOT auto-created on startup.
Use Alembic migrations: alembic revision --autogenerate && alembic upgrade head.
"""

from sqlalchemy import BigInteger, Column, Integer, JSON, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String, unique=True, nullable=False, index=True)
    track_id = Column(Integer, nullable=False)
    risk_score = Column(Integer, nullable=False)
    band = Column(String, nullable=False)
    zone_id = Column(String, nullable=True)
    payload = Column(JSON, nullable=False)   # full RiskEvent serialised as camelCase JSON
    timestamp = Column(BigInteger, nullable=False, index=True)
