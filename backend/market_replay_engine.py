import time
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ReplayState:
    is_active: bool = False
    is_paused: bool = False
    speed: float = 1.0 # 1x, 2x, 5x, 10x
    current_index: int = 0
    total_frames: int = 100
    session_name: str = "NSE_INTRADAY_VOLATILITY_SESSION"
    progress_pct: float = 0.0

class MarketReplayEngine:
    """
    Event-Driven Market Historical Replay Engine.
    Controls timeline playback, stepping, speed multipliers, and feeds recorded market events
    through the identical processing pipeline as live market data.
    """

    def __init__(self):
        self.state = ReplayState()
        self._recorded_timeline: List[Dict[str, dict]] = []
        self._generate_recorded_sessions()

    def _generate_recorded_sessions(self):
        """Build realistic multi-symbol tick sequences representing dynamic market action."""
        timeline = []
        base_profiles = {
            "RELIANCE.NS": 1308.0,
            "TCS.NS": 3140.0,
            "HDFCBANK.NS": 1675.0,
            "INFY.NS": 1445.0,
            "NIFTY50": 24350.0,
            "SENSEX": 77950.0,
            "NVDA": 224.0,
            "AAPL": 305.0,
            "MSFT": 414.0,
            "SP500": 5780.0
        }

        # Generate 120 sequential frames
        num_frames = 120
        curr_prices = dict(base_profiles)
        
        for i in range(num_frames):
            frame_ticks = {}
            for sym, base in base_profiles.items():
                # Trend with micro volatility
                drift = 0.0003 * (1 if i < 60 else -0.5)
                fluctuation = ((i * 17) % 7 - 3) * 0.0004
                new_price = round(curr_prices[sym] * (1.0 + drift + fluctuation), 2)
                curr_prices[sym] = new_price
                
                prev_close = base
                chg = round(new_price - prev_close, 2)
                p_chg = round((chg / prev_close) * 100.0, 2)

                frame_ticks[sym] = {
                    "symbol": sym,
                    "price": new_price,
                    "change": chg,
                    "changePercent": p_chg,
                    "open": round(base * 0.998, 2),
                    "high": round(max(base * 1.008, new_price), 2),
                    "low": round(min(base * 0.992, new_price), 2),
                    "prevClose": prev_close,
                    "volume": 2500000 + (i * 15000),
                    "bid": round(new_price - 0.05, 2),
                    "ask": round(new_price + 0.05, 2),
                    "bidSize": 500,
                    "askSize": 600,
                    "source": "historical-replay",
                    "status": "REPLAY"
                }
            timeline.append(frame_ticks)

        self._recorded_timeline = timeline
        self.state.total_frames = len(timeline)

    def start_replay(self, session_name: Optional[str] = None):
        self.state.is_active = True
        self.state.is_paused = False
        self.state.current_index = 0
        if session_name:
            self.state.session_name = session_name
        logger.info(f"Replay started: {self.state.session_name}")

    def pause_replay(self):
        self.state.is_paused = True
        logger.info("Replay paused")

    def resume_replay(self):
        self.state.is_paused = False
        logger.info("Replay resumed")

    def stop_replay(self):
        self.state.is_active = False
        self.state.is_paused = False
        self.state.current_index = 0
        logger.info("Replay stopped")

    def set_speed(self, speed: float):
        self.state.speed = max(0.5, min(20.0, speed))
        logger.info(f"Replay speed set to {self.state.speed}x")

    def step_forward(self) -> Dict[str, dict]:
        if not self._recorded_timeline:
            return {}
        self.state.current_index = (self.state.current_index + 1) % len(self._recorded_timeline)
        self.state.progress_pct = round((self.state.current_index / len(self._recorded_timeline)) * 100.0, 1)
        return self._recorded_timeline[self.state.current_index]

    def get_next_frame(self) -> Dict[str, dict]:
        if not self.state.is_active or self.state.is_paused:
            if self._recorded_timeline:
                return self._recorded_timeline[self.state.current_index]
            return {}

        return self.step_forward()

    def get_status(self) -> dict:
        return {
            "isActive": self.state.is_active,
            "isPaused": self.state.is_paused,
            "speed": self.state.speed,
            "currentIndex": self.state.current_index,
            "totalFrames": self.state.total_frames,
            "sessionName": self.state.session_name,
            "progressPct": self.state.progress_pct
        }

# Global Market Replay Engine Singleton
market_replay_engine = MarketReplayEngine()
