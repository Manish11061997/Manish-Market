"""Live NSE option-chain fetcher.

Fetches genuine strike-wise option-chain data from nseindia.com's public endpoint.
Returns None on ANY failure — this module never fabricates market data.

Note: NSE sits behind Akamai bot-protection. From some environments (datacenter IPs,
non-browser clients) requests are rejected regardless of headers/cookies. Callers must
treat None as DATA UNAVAILABLE, not as an error condition.
"""
import json
import logging
import threading
import time

import requests

logger = logging.getLogger(__name__)

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

_CHAIN_CACHE: dict = {}
_CACHE_LOCK = threading.Lock()
_CACHE_TTL_SECONDS = 60  # chain data moves fast; do not serve stale chains


def _cache_get(key):
    with _CACHE_LOCK:
        entry = _CHAIN_CACHE.get(key)
        if not entry:
            return None
        expires, value = entry
        if time.monotonic() > expires:
            del _CHAIN_CACHE[key]
            return None
        return value


def _cache_set(key, value):
    with _CACHE_LOCK:
        if len(_CHAIN_CACHE) > 50:
            now = time.monotonic()
            for k in [k for k, (exp, _) in _CHAIN_CACHE.items() if exp <= now]:
                del _CHAIN_CACHE[k]
        _CHAIN_CACHE[key] = (time.monotonic() + _CACHE_TTL_SECONDS, value)


def _build_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    })
    return s


def _parse_chain(raw: dict) -> dict | None:
    """Parse NSE option-chain JSON into our normalized structure. Never invents values."""
    try:
        records = raw.get("records", {})
        underlying = records.get("underlyingValue")
        expiries = records.get("expiryDates") or []
        filtered = raw.get("filtered", {}).get("data", [])
        nearest_expiry = expiries[0] if expiries else None
        if not underlying or not nearest_expiry or not filtered:
            return None

        strikes = []
        total_call_oi = 0
        total_put_oi = 0
        for row in filtered:
            if row.get("expiryDate") != nearest_expiry:
                continue
            ce = row.get("CE") or {}
            pe = row.get("PE") or {}
            call_oi = ce.get("openInterest") or 0
            put_oi = pe.get("openInterest") or 0
            total_call_oi += call_oi
            total_put_oi += put_oi
            strikes.append({
                "strike": row.get("strikePrice"),
                "callOI": call_oi,
                "callChangeOI": ce.get("changeinOpenInterest"),
                "callIV": ce.get("impliedVolatility"),
                "callLTP": ce.get("lastPrice"),
                "callVolume": ce.get("totalTradedVolume"),
                "putOI": put_oi,
                "putChangeOI": pe.get("changeinOpenInterest"),
                "putIV": pe.get("impliedVolatility"),
                "putLTP": pe.get("lastPrice"),
                "putVolume": pe.get("totalTradedVolume"),
            })

        if not strikes:
            return None

        # PCR from summed OI of nearest expiry
        pcr = round(total_put_oi / total_call_oi, 2) if total_call_oi > 0 else None

        # Max pain: strike minimizing total writer payout
        all_strikes = sorted({s["strike"] for s in strikes if s["strike"] is not None})
        max_pain = None
        min_pain = None
        for candidate in all_strikes:
            pain = 0
            for s in strikes:
                k = s["strike"]
                if s["callOI"] and k < candidate:
                    pain += s["callOI"] * (candidate - k)
                if s["putOI"] and k > candidate:
                    pain += s["putOI"] * (k - candidate)
            if min_pain is None or pain < min_pain:
                min_pain = pain
                max_pain = candidate

        # ATM row = strike closest to underlying
        atm_strike = min(all_strikes, key=lambda k: abs(k - underlying)) if all_strikes else None
        atm_row = next((s for s in strikes if s["strike"] == atm_strike), None)
        ivs = [s["callIV"] for s in strikes if isinstance(s.get("callIV"), (int, float)) and s["callIV"] > 0]
        atm_iv = round(atm_row["callIV"], 1) if atm_row and isinstance(atm_row.get("callIV"), (int, float)) else (
            round(sum(ivs) / len(ivs), 1) if ivs else None)

        # Nearest call/put walls (highest OI)
        call_wall = max((s for s in strikes if s["callOI"]), key=lambda s: s["callOI"], default=None)
        put_wall = max((s for s in strikes if s["putOI"]), key=lambda s: s["putOI"], default=None)

        return {
            "source": "nse-option-chain",
            "isLiveChainData": True,
            "underlyingValue": underlying,
            "nearestExpiry": nearest_expiry,
            "allExpiries": expiries[:5],
            "atmStrike": atm_strike,
            "pcr": pcr,
            "maxPain": max_pain,
            "atmIV": atm_iv,
            "callResistanceStrike": call_wall["strike"] if call_wall else None,
            "callResistanceOI": call_wall["callOI"] if call_wall else None,
            "putSupportStrike": put_wall["strike"] if put_wall else None,
            "putSupportOI": put_wall["putOI"] if put_wall else None,
            "strikes": strikes,
            "fetchedAtEpoch": int(time.time()),
        }
    except Exception as e:
        logger.warning(f"NSE chain parse error: {e}")
        return None


def fetch_nse_option_chain(symbol: str, force_refresh: bool = False) -> dict | None:
    """Fetch live option chain for an index or equity symbol ('NIFTY', 'BANKNIFTY', 'RELIANCE', ...).

    Returns the parsed chain dict, or None when unavailable. Caches 60s per symbol.
    """
    key = symbol.upper().strip()
    if not force_refresh:
        cached = _cache_get(key)
        if cached is not None:
            # If negative cache sentinel was stored
            return None if cached == "__UNAVAILABLE__" else cached

    endpoint = "option-chain-indices" if key in ("NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY") else "option-chain-equities"
    url = f"https://www.nseindia.com/api/{endpoint}?symbol={key}"
    s = _build_session()
    try:
        # Fast cookie acquisition
        s.get("https://www.nseindia.com/option-chain", timeout=1.8)
        r = s.get(url, timeout=2.2, headers={
            "Referer": "https://www.nseindia.com/option-chain",
            "Accept": "application/json",
        })
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and "json" in ct:
            parsed = _parse_chain(r.json())
            if parsed:
                _cache_set(key, parsed)
                logger.info(f"NSE live chain fetched for {key}: {len(parsed['strikes'])} strikes, PCR={parsed['pcr']}")
                return parsed
        # Negative cache for 45s if blocked or unavailable to avoid hammering/blocking
        _cache_set(key, "__UNAVAILABLE__")
        return None
    except Exception as e:
        logger.debug(f"NSE chain fetch fast fallback for {key}: {e}")
        _cache_set(key, "__UNAVAILABLE__")
        return None
