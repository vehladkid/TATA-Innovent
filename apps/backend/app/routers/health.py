from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def root() -> dict:
    return {"service": "suraksha-ai", "status": "ok", "version": "0.1.0"}


@router.get("/health")
async def health() -> dict:
    """Used by Render health checks and the keep-alive cron job."""
    return {"status": "ok"}
