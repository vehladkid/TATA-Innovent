"""In-memory pub/sub broker for RiskEvents.

Subscribers get an asyncio.Queue; publish() fans out to all of them.
Swap this for a Redis Streams implementation when you need multi-instance fanout.
"""

import asyncio
from collections import deque


class EventBroker:
    def __init__(self, max_history: int = 100) -> None:
        self._subscribers: list[asyncio.Queue] = []
        self._history: deque[dict] = deque(maxlen=max_history)

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
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
            await q.put(message)

    def recent(self, n: int = 50) -> list[dict]:
        return list(self._history)[-n:]


# Module-level singleton shared across all routers
broker = EventBroker()
