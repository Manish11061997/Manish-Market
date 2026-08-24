import asyncio
import logging
from typing import Dict, List, Callable, Any

logger = logging.getLogger(__name__)

class EventBus:
    """
    High-Throughput Asynchronous In-Memory Event Bus.
    Connects Market Data Gateway to downstream Tick, Candle, Indicator, Alert, and AI Engines.
    """

    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._events_processed = 0
        self._dropped_events = 0

    def subscribe(self, event_type: str, callback: Callable):
        """Register a handler for a specific event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        if callback not in self._subscribers[event_type]:
            self._subscribers[event_type].append(callback)

    def unsubscribe(self, event_type: str, callback: Callable):
        """Unregister a handler."""
        if event_type in self._subscribers and callback in self._subscribers[event_type]:
            self._subscribers[event_type].remove(callback)

    async def publish(self, event_type: str, data: Any):
        """Dispatch an event asynchronously to all subscribed listeners."""
        handlers = self._subscribers.get(event_type, [])
        if not handlers:
            return

        self._events_processed += 1

        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                self._dropped_events += 1
                logger.error(f"Error handling event '{event_type}' in handler {handler}: {e}")

    def get_stats(self) -> dict:
        return {
            "eventsProcessed": self._events_processed,
            "droppedEvents": self._dropped_events,
            "subscribersCount": {k: len(v) for k, v in self._subscribers.items()}
        }

# Global Event Bus Singleton
event_bus = EventBus()
