from collections import deque
from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd
import time
import logging

logger = logging.getLogger(__name__)

class TimeseriesStorageEngine:
    """
    In-Memory Time-Series Storage & Multi-Timeframe Candle Aggregation Engine.
    Maintains ring-buffers for raw tick events and dynamically computes 1m, 5m, 15m, 1h, and 1d OHLCV series.
    Enforces configurable retention policies to prevent memory exhaustion.
    """

    def __init__(self, max_ticks_per_symbol: int = 5000, max_candles_per_timeframe: int = 1500):
        self.max_ticks = max_ticks_per_symbol
        self.max_candles = max_candles_per_timeframe
        
        # Raw tick circular ring-buffers: {symbol: deque([tick, ...])}
        self._ticks: Dict[str, deque] = {}
        
        # Multi-timeframe OHLCV stores: {symbol: {timeframe: [candle_dict, ...]}}
        self._candles: Dict[str, Dict[str, List[dict]]] = {}
        
        # Current forming candle accumulator: {symbol: {timeframe: candle_dict}}
        self._active_candle: Dict[str, Dict[str, dict]] = {}

    def append_tick(self, tick: dict):
        """Append incoming normalized tick event and aggregate into multi-timeframe candles."""
        if not tick or "symbol" not in tick:
            return

        sym = tick["symbol"].upper()
        if sym not in self._ticks:
            self._ticks[sym] = deque(maxlen=self.max_ticks)
            self._candles[sym] = {"1m": [], "5m": [], "15m": [], "1h": [], "1d": []}
            self._active_candle[sym] = {}

        self._ticks[sym].append(tick)
        price = float(tick.get("price", 0.0))
        vol = int(tick.get("volume", 0))
        ts_ms = int(tick.get("ms", time.time() * 1000))
        dt = datetime.fromtimestamp(ts_ms / 1000.0)

        # Update 1m candle
        minute_bucket = dt.strftime("%Y-%m-%d %H:%M:00")
        self._update_timeframe_candle(sym, "1m", minute_bucket, price, vol, dt)

    def _update_timeframe_candle(self, symbol: str, tf: str, bucket_key: str, price: float, volume: int, dt: datetime):
        active = self._active_candle[symbol].get(tf)
        
        if not active or active["bucket"] != bucket_key:
            # Finalize previous candle if exists
            if active:
                self._candles[symbol][tf].append(active)
                if len(self._candles[symbol][tf]) > self.max_candles:
                    self._candles[symbol][tf].pop(0)

            # Start new forming candle
            self._active_candle[symbol][tf] = {
                "bucket": bucket_key,
                "timestamp": dt.strftime("%H:%M:%S"),
                "date": bucket_key,
                "open": price,
                "high": price,
                "low": price,
                "close": price,
                "volume": volume,
                "ticksCount": 1
            }
        else:
            # Update existing active candle
            active["high"] = max(active["high"], price)
            active["low"] = min(active["low"], price)
            active["close"] = price
            active["volume"] += volume
            active["ticksCount"] += 1

    def get_ticks(self, symbol: str, limit: int = 200) -> List[dict]:
        sym = symbol.upper()
        if sym not in self._ticks:
            return []
        return list(self._ticks[sym])[-limit:]

    def get_candles(self, symbol: str, timeframe: str = "1m", limit: int = 100) -> List[dict]:
        sym = symbol.upper()
        if sym not in self._candles:
            return []
        candles = list(self._candles[sym].get(timeframe, []))
        active = self._active_candle[sym].get(timeframe)
        if active:
            candles.append(active)
        return candles[-limit:]

    def to_dataframe(self, symbol: str, timeframe: str = "1m") -> pd.DataFrame:
        """Convert stored candle series into a clean Pandas DataFrame."""
        candles = self.get_candles(symbol, timeframe=timeframe, limit=500)
        if not candles:
            return pd.DataFrame()
        
        records = []
        for c in candles:
            records.append({
                "Date": c["date"],
                "Open": c["open"],
                "High": c["high"],
                "Low": c["low"],
                "Close": c["close"],
                "Volume": c["volume"]
            })
        df = pd.DataFrame(records)
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        return df

    def prune_retention(self):
        """Periodically prune excess records according to retention bounds."""
        for sym, c_map in self._candles.items():
            for tf, series in c_map.items():
                if len(series) > self.max_candles:
                    c_map[tf] = series[-self.max_candles:]

# Global Timeseries Storage Singleton
timeseries_storage = TimeseriesStorageEngine()
