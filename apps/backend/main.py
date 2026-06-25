import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
<<<<<<< HEAD
from app.db.session import init_db
from app.routers import events, fake_events, health, shifts, zones, copilot, reports
=======
from app.routers import fake_events, health
>>>>>>> origin/vanshika/dev

logging.basicConfig(level=settings.log_level.upper())
_log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
<<<<<<< HEAD
    # Legacy SQLAlchemy path (kept for Alembic migrations)
    if settings.database_url:
        init_db(settings.database_url)
        _log.info("SQLAlchemy engine initialised.")
    else:
        _log.warning("DATABASE_URL not set — SQLAlchemy engine skipped.")

    # Supabase async client (primary persistence path)
    from app.services.database import init_supabase
    await init_supabase()

=======
    _log.info("Vigil Edge dummy data server started.")
>>>>>>> origin/vanshika/dev
    yield


app = FastAPI(
<<<<<<< HEAD
    title="Suraksha AI",
    description="Real-time edge AI safety backend for industrial workers.",
    version="1.0.0",
=======
    title="Suraksha AI - Dummy Data Server",
    description="Real-time fake event generator for testing.",
    version="0.1.0",
>>>>>>> origin/vanshika/dev
    lifespan=lifespan,
)

# CORS — open for now; tighten before demo by listing exact Vercel origins
origins = (
    ["*"]
    if settings.cors_origins.strip() == "*"
    else [o.strip() for o in settings.cors_origins.split(",")]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=(origins != ["*"]),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(fake_events.router)
<<<<<<< HEAD
app.include_router(events.router)
app.include_router(shifts.router)
app.include_router(zones.router)
app.include_router(copilot.router)
app.include_router(reports.router)
=======
>>>>>>> origin/vanshika/dev
