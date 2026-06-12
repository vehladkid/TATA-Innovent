"""In-memory pub/sub broker for RiskEvents.

Subscribers get an asyncio.Queue; publish() fans out to all of them.
Swap this for a Redis Streams implementation when you need multi-instance fanout.
"""

import asyncio
import logging
from collections import deque

_log = logging.getLogger(__name__)

_QUEUE_MAXSIZE = 256


class EventBroker:
    def __init__(self, max_history: int = 100) -> None:
        self._subscribers: list[asyncio.Queue] = []
        self._history: deque[dict] = deque(maxlen=max_history)

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=_QUEUE_MAXSIZE)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass  # already removed; safe to ignore

    async def publish(self, message: dict) -> None:
        self._history.append(message)
        for q in self._subscribers:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                # Slow/frozen subscriber: drop oldest item to make room, then re-try.
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                _log.warning(
                    "EventBroker: subscriber queue full (maxsize=%d) — oldest item dropped.",
                    _QUEUE_MAXSIZE,
                )
                try:
                    q.put_nowait(message)
                except asyncio.QueueFull:
                    _log.warning("EventBroker: subscriber queue still full after drop — message lost.")

    def recent(self, n: int = 50) -> list[dict]:
        return list(self._history)[-n:]

    @property
    def subscriber_count(self) -> int:
        """Number of active WebSocket subscribers."""
        return len(self._subscribers)


# Module-level singleton shared across all routers
broker = EventBroker()
