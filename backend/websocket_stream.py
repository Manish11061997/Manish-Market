import asyncio
import json
import time
import logging
import os
from typing import List, Dict, Set
from fastapi import WebSocket, WebSocketDisconnect

from market_gateway import market_gateway

logger = logging.getLogger(__name__)

# Global default universe tickers
DEFAULT_SYMBOLS = [
    "NIFTY50", "SENSEX", "NIFTYBANK", "NIFTYIT", "RELIANCE.NS", "TCS.NS",
    "HDFCBANK.NS", "INFY.NS", "VIDYAWIRES.NS", "SBIN.NS", "ITC.NS",
    "SP500", "NASDAQ", "DOW", "NVDA", "AAPL", "MSFT", "TSLA", "AMZN"
]

class ConnectionManager:
    """
    WebSocket Connection Manager with dynamic symbol subscription routing,
    heartbeat monitoring, health broadcast, and replay mode controls.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.client_subscriptions: Dict[WebSocket, Set[str]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_subscriptions[websocket] = set(DEFAULT_SYMBOLS)
        market_gateway.subscribe_symbols(DEFAULT_SYMBOLS)
        logger.info(f"WebSocket Client connected. Active streams: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.client_subscriptions:
            del self.client_subscriptions[websocket]
        logger.info("WebSocket Client disconnected.")

    async def handle_client_message(self, websocket: WebSocket, raw_msg: str):
        try:
            payload = json.loads(raw_msg)
            action = payload.get("action")
            symbols = payload.get("symbols", [])

            if action == "ping":
                await websocket.send_json({
                    "type": "PONG",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "ms": int(time.time() * 1000)
                })

            elif action == "subscribe" and isinstance(symbols, list):
                if websocket in self.client_subscriptions:
                    for s in symbols:
                        self.client_subscriptions[websocket].add(s.upper())
                    market_gateway.subscribe_symbols([s.upper() for s in symbols])
                    logger.info(f"Client dynamic subscribe: {symbols}")
                    await websocket.send_json({
                        "type": "SUBSCRIPTION_CONFIRMED",
                        "action": "subscribe",
                        "symbols": [s.upper() for s in symbols],
                        "timestamp": time.strftime("%H:%M:%S")
                    })

            elif action == "unsubscribe" and isinstance(symbols, list):
                if websocket in self.client_subscriptions:
                    for s in symbols:
                        self.client_subscriptions[websocket].discard(s.upper())
                    market_gateway.unsubscribe_symbols([s.upper() for s in symbols])
                    logger.info(f"Client dynamic unsubscribe: {symbols}")
                    await websocket.send_json({
                        "type": "SUBSCRIPTION_CONFIRMED",
                        "action": "unsubscribe",
                        "symbols": [s.upper() for s in symbols],
                        "timestamp": time.strftime("%H:%M:%S")
                    })

            elif action == "set_mode":
                expected_token = os.environ.get("CONTROL_TOKEN")
                provided_token = payload.get("token", "")
                if expected_token and provided_token != expected_token:
                    logger.warning("Rejected set_mode: missing or invalid control token.")
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": "Invalid or missing control token for set_mode."
                    })
                    return
                mode = payload.get("mode", "LIVE")
                market_gateway.set_mode(mode)
                await self.broadcast({
                    "type": "MODE_CHANGED",
                    "mode": mode,
                    "timestamp": time.strftime("%H:%M:%S")
                })

        except Exception as e:
            logger.debug(f"Non-JSON or invalid client message: {e}")

    async def broadcast(self, payload: dict):
        if not self.active_connections:
            return
        msg_text = json.dumps(payload)
        connections = list(self.active_connections)

        async def _send(conn: WebSocket):
            try:
                await conn.send_text(msg_text)
                return None
            except Exception:
                return conn

        results = await asyncio.gather(*(_send(c) for c in connections), return_exceptions=False)
        for dead in results:
            if dead is not None:
                self.disconnect(dead)

ws_manager = ConnectionManager()

async def start_live_market_ticker():
    """Continuous 100% genuine real-time market data streaming loop via Gateway."""
    logger.info("Starting Live Market Data Gateway Ticker Loop...")
    # Initialize gateway with default universe
    market_gateway.subscribe_symbols(DEFAULT_SYMBOLS)

    while True:
        try:
            payload = await market_gateway.poll_and_dispatch()
            if payload and ws_manager.active_connections:
                await ws_manager.broadcast(payload)

            await asyncio.sleep(0.15) # High-frequency sub-second real-time pulse (150ms)

        except Exception as e:
            logger.error(f"Error in WebSocket ticker loop: {e}")
            await asyncio.sleep(0.5)
