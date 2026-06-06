import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import init_db
from app.routers import events, fake_events, health

logging.basicConfig(level=settings.log_level.upper())
_log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.database_url:
        init_db(settings.database_url)
        _log.info("Database engine initialised.")
    else:
        _log.warning("DATABASE_URL not set — running without database.")
    yield


app = FastAPI(
    title="Suraksha AI",
    description="Real-time edge AI safety backend for industrial workers.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — open for now, tighten before demo
origins = ["*"] if settings.cors_origins.strip() == "*" else [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(fake_events.router)
app.include_router(events.router)
