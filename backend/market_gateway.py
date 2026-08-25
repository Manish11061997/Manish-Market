import asyncio
import time
import logging
from typing import List, Dict, Optional

from market_data_provider import (
    BaseMarketDataProvider,
    primary_provider,
    failover_provider,
    replay_provider
)
from event_bus import event_bus
from live_market_state import live_market_state
from alerts_engine import alerts_engine
from market_session import get_market_session_status
from circuit_limits import circuit_limits_engine
from market_breadth import market_breadth_engine
from timeseries_storage import timeseries_storage
from data_reconciler import data_reconciler
from instrument_master import instrument_master

logger = logging.getLogger(__name__)

class MarketDataGateway:
    """
    Central Multi-Provider Market Data Gateway.
    Normalizes provider feeds, executes data reconciliation, updates time-series storage,
    evaluates circuit limits & breadth, dispatches through the Event Bus, and manages automatic failover.
    """

    def __init__(self):
        self.primary_provider = primary_provider
        self.failover_provider = failover_provider
        self.replay_provider = replay_provider
        
        self.current_provider: BaseMarketDataProvider = self.primary_provider
        self.mode = "LIVE" # "LIVE" or "REPLAY"
        self.is_failover_active = False
        
        self.active_symbols = set()
        self.events_count = 0
        self.last_event_time = time.time()
        self.start_time = time.time()
        self.avg_latency_ms = 0
        self.consecutive_failures = 0
        self.max_failures_before_failover = 3

    def start(self):
        self.current_provider.connect()
        try:
            from data_fetcher import INDIAN_STOCKS_UNIVERSE, US_STOCKS_UNIVERSE, INDEX_TICKERS, US_INDEX_TICKERS
            initial_syms = (
                [s["symbol"] for s in INDIAN_STOCKS_UNIVERSE] +
                [s["symbol"] for s in US_STOCKS_UNIVERSE] +
                list(INDEX_TICKERS.keys()) +
                list(US_INDEX_TICKERS.keys())
            )
            self.subscribe_symbols(initial_syms)
        except Exception as e:
            logger.warning(f"Error subscribing default symbols in market_gateway: {e}")
        logger.info(f"MarketDataGateway started with Provider: '{self.current_provider.name}' in {self.mode} mode.")

    def set_mode(self, new_mode: str) -> bool:
        if new_mode.upper() == "REPLAY":
            self.mode = "REPLAY"
            self.current_provider = self.replay_provider
            self.is_failover_active = False
        else:
            self.mode = "LIVE"
            self.current_provider = self.primary_provider
            self.is_failover_active = False

        data_reconciler.reconcile_on_provider_switch(self.active_symbols, "previous", self.current_provider.name)
        self.current_provider.connect()
        self.current_provider.subscribe(list(self.active_symbols))
        logger.info(f"MarketDataGateway mode switched to {self.mode} ({self.current_provider.name})")
        return True

    def trigger_failover(self):
        """Engage standby backup provider upon primary feed disruption."""
        if not self.is_failover_active and self.mode == "LIVE":
            old_name = self.current_provider.name
            self.current_provider = self.failover_provider
            self.is_failover_active = True
            data_reconciler.reconcile_on_provider_switch(self.active_symbols, old_name, self.current_provider.name)
            self.current_provider.connect()
            self.current_provider.subscribe(list(self.active_symbols))
            logger.warning(f"🚨 PROVIDER FAILOVER ENGAGED: Switched to {self.current_provider.name}")

    def restore_primary(self):
        """Restore primary feed once connection recovers."""
        if self.is_failover_active and self.mode == "LIVE":
            old_name = self.current_provider.name
            self.current_provider = self.primary_provider
            self.is_failover_active = False
            self.consecutive_failures = 0
            data_reconciler.reconcile_on_provider_switch(self.active_symbols, old_name, self.current_provider.name)
            self.current_provider.connect()
            self.current_provider.subscribe(list(self.active_symbols))
            logger.info(f"Primary feed restored: {self.current_provider.name}")

    def subscribe_symbols(self, symbols: List[str]):
        for s in symbols:
            self.active_symbols.add(s.upper())
        self.current_provider.subscribe(symbols)

    def unsubscribe_symbols(self, symbols: List[str]):
        for s in symbols:
            self.active_symbols.discard(s.upper())
        self.current_provider.unsubscribe(symbols)

    async def poll_and_dispatch(self) -> dict:
        """Fetch real-time ticks, reconcile data, update context, and dispatch to Event Bus."""
        symbols = list(self.active_symbols)
        if not symbols:
            return {}

        start_fetch = time.time()
        try:
            ticks = await asyncio.to_thread(self.current_provider.fetch_ticks, symbols)
            fetch_latency = int((time.time() - start_fetch) * 1000)
            self.avg_latency_ms = fetch_latency

            if not ticks:
                self.consecutive_failures += 1
                if self.consecutive_failures >= self.max_failures_before_failover:
                    self.trigger_failover()
                return {}
            else:
                self.consecutive_failures = 0
                if self.is_failover_active and fetch_latency < 800:
                    # Potential primary recovery
                    pass

        except Exception as e:
            logger.error(f"Error fetching ticks from {self.current_provider.name}: {e}")
            self.consecutive_failures += 1
            if self.consecutive_failures >= self.max_failures_before_failover:
                self.trigger_failover()
            return {}

        if ticks:
            valid_ticks = {}
            for sym, tick in ticks.items():
                is_valid, reason = data_reconciler.validate_and_reconcile_tick(tick)
                if is_valid:
                    # 1. Append to Time-Series Storage
                    timeseries_storage.append_tick(tick)

                    # 2. Compute dynamic Circuit Limits
                    circuit = circuit_limits_engine.calculate_circuit_limits(sym, tick["price"], tick.get("prevClose"))
                    tick["circuitLimits"] = circuit.to_dict()

                    # 3. Update Live Market State Store
                    live_market_state.update_from_tick(tick)
                    valid_ticks[sym] = tick

            self.events_count += len(valid_ticks)
            self.last_event_time = time.time()

            # 4. Compute Live Market Breadth
            breadth_in = market_breadth_engine.compute_breadth(valid_ticks, market="IN")
            breadth_us = market_breadth_engine.compute_breadth(valid_ticks, market="US")

            # 5. Evaluate Price Alerts
            triggered_alerts = alerts_engine.evaluate_ticks(valid_ticks)

            # 6. Publish to Event Bus
            await event_bus.publish("TICK_STREAM", valid_ticks)
            if triggered_alerts:
                await event_bus.publish("ALERTS_TRIGGERED", triggered_alerts)

            # 7. Session Phase Info
            session_in = get_market_session_status("IN")
            session_us = get_market_session_status("US")

            from datetime import datetime
            return {
                "type": "TICK_STREAM",
                "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
                "ms": int(time.time() * 1000),
                "mode": self.mode,
                "provider": self.current_provider.name,
                "isFailover": self.is_failover_active,
                "ticks": valid_ticks,
                "breadth": {
                    "IN": breadth_in.to_dict(),
                    "US": breadth_us.to_dict()
                },
                "session": {
                    "IN": session_in,
                    "US": session_us
                },
                "triggeredAlerts": triggered_alerts,
                "health": self.get_health_metrics()
            }

        # Periodic Heartbeat Broadcast when market is static or after-hours
        if getattr(self, "_last_heartbeat_time", 0) < time.time() - 1.5:
            self._last_heartbeat_time = time.time()
            cached_ticks = {
                sym: {
                    "symbol": sym,
                    "price": state.get("price", 0.0),
                    "change": state.get("change", 0.0),
                    "changePercent": state.get("changePercent", 0.0),
                    "prevClose": state.get("prevClose", 0.0),
                    "high": state.get("high", 0.0),
                    "low": state.get("low", 0.0),
                    "volume": state.get("volume", 0),
                    "timestamp": time.strftime("%H:%M:%S")
                }
                for sym, state in live_market_state._states.items()
            }
            session_in = get_market_session_status("IN")
            session_us = get_market_session_status("US")
            breadth_in = market_breadth_engine.get_latest_breadth(market="IN")
            breadth_us = market_breadth_engine.get_latest_breadth(market="US")
            from datetime import datetime
            return {
                "type": "TICK_STREAM",
                "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
                "ms": int(time.time() * 1000),
                "mode": self.mode,
                "provider": self.current_provider.name,
                "isFailover": self.is_failover_active,
                "ticks": cached_ticks,
                "breadth": {
                    "IN": breadth_in.to_dict(),
                    "US": breadth_us.to_dict()
                },
                "session": {
                    "IN": session_in,
                    "US": session_us
                },
                "triggeredAlerts": [],
                "health": self.get_health_metrics()
            }

        return {}

    def get_market_depth(self, symbol: str) -> dict:
        return self.current_provider.get_market_depth(symbol)

    def get_health_metrics(self) -> dict:
        elapsed = max(time.time() - self.start_time, 1.0)
        events_per_sec = round(self.events_count / elapsed, 1)
        event_stats = event_bus.get_stats()
        recon_stats = data_reconciler.get_stats()

        return {
            "mode": self.mode,
            "currentProvider": self.current_provider.name,
            "providerStatus": "CONNECTED" if self.current_provider else "DISCONNECTED",
            "isFailoverActive": self.is_failover_active,
            "activeSubscriptions": len(self.active_symbols),
            "eventsPerSec": events_per_sec,
            "totalEvents": self.events_count,
            "providerLatencyMs": self.avg_latency_ms,
            "droppedEvents": event_stats["droppedEvents"],
            "sequenceGaps": recon_stats["detectedGaps"],
            "rejectedStaleEvents": recon_stats["rejectedStaleEvents"],
            "lastEventTimestamp": time.strftime("%H:%M:%S", time.localtime(self.last_event_time))
        }

# Global Market Data Gateway Singleton
market_gateway = MarketDataGateway()
market_gateway.start()
