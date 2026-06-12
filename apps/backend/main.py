import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import fake_events, health

logging.basicConfig(level=settings.log_level.upper())
_log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _log.info("Vigil Edge dummy data server started.")
    yield


app = FastAPI(
    title="Suraksha AI - Dummy Data Server",
    description="Real-time fake event generator for testing.",
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
