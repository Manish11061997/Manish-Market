from datetime import datetime, time, date, timedelta
import pytz
from typing import Dict, Optional, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class SessionPhase(str, Enum):
    PRE_OPEN = "PRE_OPEN"               # 09:00 - 09:08 IST / 04:00 - 09:30 EST
    OPENING_AUCTION = "OPENING_AUCTION" # 09:08 - 09:15 IST
    NORMAL_TRADING = "NORMAL_TRADING"   # 09:15 - 15:30 IST / 09:30 - 16:00 EST
    CLOSING_AUCTION = "CLOSING_AUCTION" # 15:30 - 15:40 IST / 15:50 - 16:00 EST
    POST_MARKET = "POST_MARKET"         # 15:40 - 16:00 IST / 16:00 - 20:00 EST
    MARKET_CLOSED = "MARKET_CLOSED"
    HALTED = "HALTED"
    SPECIAL_SESSION = "SPECIAL_SESSION" # e.g., Diwali Muhurat Trading

# 2024 - 2026 Exchange Holiday Calendars
NSE_BSE_HOLIDAYS = {
    "2024-01-22", "2024-01-26", "2024-03-08", "2024-03-25", "2024-03-29",
    "2024-04-11", "2024-04-17", "2024-05-01", "2024-05-20", "2024-06-17",
    "2024-07-17", "2024-08-15", "2024-10-02", "2024-11-01", "2024-11-15",
    "2024-12-25",
    # 2025
    "2025-01-26", "2025-02-26", "2025-03-14", "2025-03-31", "2025-04-10",
    "2025-04-14", "2025-04-18", "2025-05-01", "2025-08-15", "2025-08-27",
    "2025-10-02", "2025-10-21", "2025-10-22", "2025-11-05", "2025-12-25",
    # 2026
    "2026-01-26", "2026-03-04", "2026-03-20", "2026-04-03", "2026-04-14",
    "2026-05-01", "2026-08-15", "2026-10-02", "2026-11-09", "2026-12-25"
}

US_MARKET_HOLIDAYS = {
    "2024-01-01", "2024-01-15", "2024-02-19", "2024-03-29", "2024-05-27",
    "2024-06-19", "2024-07-04", "2024-09-02", "2024-11-28", "2024-12-25",
    # 2025
    "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26",
    "2025-06-19", "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25",
    # 2026
    "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
    "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25"
}

# Special Trading Sessions (e.g. Diwali Muhurat Trading on Nov 1, 2024 / Oct 21, 2025)
SPECIAL_SESSIONS = {
    "2024-11-01": {"start": time(18, 0), "end": time(19, 0), "name": "Diwali Muhurat Trading"},
    "2025-10-21": {"start": time(18, 15), "end": time(19, 15), "name": "Diwali Muhurat Trading 2025"}
}

def get_market_session_status(market: str = "IN", custom_now_utc: Optional[datetime] = None) -> dict:
    """
    Evaluate exact live exchange session status, active phase, trading eligibility,
    holiday checks, and time to next phase for Indian (NSE/BSE) and US (NYSE/NASDAQ) markets.
    """
    market = market.upper()
    now_utc = custom_now_utc or datetime.now(pytz.utc)

    if market == "IN":
        tz = pytz.timezone("Asia/Kolkata")
        now_local = now_utc.astimezone(tz)
        today_str = now_local.strftime("%Y-%m-%d")
        current_t = now_local.time()
        weekday = now_local.weekday() # 0 = Mon, 6 = Sun

        # 1. Special Trading Session Check (e.g. Muhurat)
        if today_str in SPECIAL_SESSIONS:
            spec = SPECIAL_SESSIONS[today_str]
            if spec["start"] <= current_t <= spec["end"]:
                return {
                    "market": "IN",
                    "status": "LIVE",
                    "phase": SessionPhase.SPECIAL_SESSION.value,
                    "label": f"● {spec['name'].upper()} LIVE",
                    "reason": spec["name"],
                    "isTradingActive": True,
                    "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                    "timezone": "Asia/Kolkata"
                }

        # 2. Holiday Check
        if today_str in NSE_BSE_HOLIDAYS:
            return {
                "market": "IN",
                "status": "MARKET_CLOSED",
                "phase": SessionPhase.MARKET_CLOSED.value,
                "label": "MARKET CLOSED (EXCHANGE HOLIDAY)",
                "reason": "NSE/BSE Official Holiday",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                "timezone": "Asia/Kolkata"
            }

        # 3. Weekend Check
        if weekday in (5, 6):
            return {
                "market": "IN",
                "status": "MARKET_CLOSED",
                "phase": SessionPhase.MARKET_CLOSED.value,
                "label": "MARKET CLOSED (WEEKEND)",
                "reason": "Saturday / Sunday",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                "timezone": "Asia/Kolkata"
            }

        # 4. Indian Intraday Session Phases
        t_pre_open = time(9, 0)
        t_open_auction = time(9, 8)
        t_market_open = time(9, 15)
        t_closing_auction = time(15, 30)
        t_post_market = time(15, 40)
        t_market_close = time(16, 0)

        if t_pre_open <= current_t < t_open_auction:
            return {
                "market": "IN",
                "status": "PRE_MARKET",
                "phase": SessionPhase.PRE_OPEN.value,
                "label": "● PRE-OPEN DISCOVERY (09:00-09:08)",
                "reason": "Order entry, modification and cancellation phase",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                "timezone": "Asia/Kolkata"
            }
        elif t_open_auction <= current_t < t_market_open:
            return {
                "market": "IN",
                "status": "PRE_MARKET",
                "phase": SessionPhase.OPENING_AUCTION.value,
                "label": "● OPENING AUCTION MATCHING (09:08-09:15)",
                "reason": "Price discovery equilibrium & order matching",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                "timezone": "Asia/Kolkata"
            }
        elif t_market_open <= current_t < t_closing_auction:
            return {
                "market": "IN",
                "status": "LIVE",
                "phase": SessionPhase.NORMAL_TRADING.value,
                "label": "● LIVE MARKET DATA (REGULAR SESSION)",
                "reason": "Continuous order matching on NSE/BSE",
                "isTradingActive": True,
                "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                "timezone": "Asia/Kolkata"
            }
        elif t_closing_auction <= current_t < t_post_market:
            return {
                "market": "IN",
                "status": "CLOSING_SESSION",
                "phase": SessionPhase.CLOSING_AUCTION.value,
                "label": "● CLOSING AUCTION SESSION (15:30-15:40)",
                "reason": "Weighted average closing price determination",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                "timezone": "Asia/Kolkata"
            }
        elif t_post_market <= current_t <= t_market_close:
            return {
                "market": "IN",
                "status": "POST_MARKET",
                "phase": SessionPhase.POST_MARKET.value,
                "label": "● POST-MARKET SESSION (15:40-16:00)",
                "reason": "Trades at closing price",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                "timezone": "Asia/Kolkata"
            }
        else:
            return {
                "market": "IN",
                "status": "MARKET_CLOSED",
                "phase": SessionPhase.MARKET_CLOSED.value,
                "label": "MARKET CLOSED (LAST TRADED PRICE)",
                "reason": "Outside Regular Trading Hours",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S IST"),
                "timezone": "Asia/Kolkata"
            }

    else: # US Markets (NYSE / NASDAQ)
        tz = pytz.timezone("America/New_York")
        now_local = now_utc.astimezone(tz)
        today_str = now_local.strftime("%Y-%m-%d")
        current_t = now_local.time()
        weekday = now_local.weekday()

        if today_str in US_MARKET_HOLIDAYS:
            return {
                "market": "US",
                "status": "MARKET_CLOSED",
                "phase": SessionPhase.MARKET_CLOSED.value,
                "label": "MARKET CLOSED (US FEDERAL HOLIDAY)",
                "reason": "NYSE / NASDAQ Official Holiday",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S EST"),
                "timezone": "America/New_York"
            }

        if weekday in (5, 6):
            return {
                "market": "US",
                "status": "MARKET_CLOSED",
                "phase": SessionPhase.MARKET_CLOSED.value,
                "label": "MARKET CLOSED (WEEKEND)",
                "reason": "Saturday / Sunday",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S EST"),
                "timezone": "America/New_York"
            }

        t_pre = time(4, 0)
        t_open = time(9, 30)
        t_close = time(16, 0)
        t_post = time(20, 0)

        if t_pre <= current_t < t_open:
            return {
                "market": "US",
                "status": "PRE_MARKET",
                "phase": SessionPhase.PRE_OPEN.value,
                "label": "● US PRE-MARKET SESSION",
                "reason": "Early morning extended hours trading",
                "isTradingActive": True,
                "exchangeTime": now_local.strftime("%H:%M:%S EST"),
                "timezone": "America/New_York"
            }
        elif t_open <= current_t <= t_close:
            return {
                "market": "US",
                "status": "LIVE",
                "phase": SessionPhase.NORMAL_TRADING.value,
                "label": "● LIVE MARKET DATA (REGULAR SESSION)",
                "reason": "Regular Trading Hours (NYSE/NASDAQ)",
                "isTradingActive": True,
                "exchangeTime": now_local.strftime("%H:%M:%S EST"),
                "timezone": "America/New_York"
            }
        elif t_close < current_t <= t_post:
            return {
                "market": "US",
                "status": "POST_MARKET",
                "phase": SessionPhase.POST_MARKET.value,
                "label": "● US AFTER-HOURS SESSION",
                "reason": "Evening extended hours trading",
                "isTradingActive": True,
                "exchangeTime": now_local.strftime("%H:%M:%S EST"),
                "timezone": "America/New_York"
            }
        else:
            return {
                "market": "US",
                "status": "MARKET_CLOSED",
                "phase": SessionPhase.MARKET_CLOSED.value,
                "label": "MARKET CLOSED (LAST TRADED PRICE)",
                "reason": "Outside US Trading Hours",
                "isTradingActive": False,
                "exchangeTime": now_local.strftime("%H:%M:%S EST"),
                "timezone": "America/New_York"
            }
