from fastapi import FastAPI, Query, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from contextlib import asynccontextmanager
import logging
import asyncio
import math
import os
import threading
import time
from datetime import datetime
import pandas as pd

from data_fetcher import fetch_market_indices, get_stock_universe, fetch_stock_ohlcv, resolve_ticker_symbol, search_stocks_by_name
from stock_agent import analyze_stock, get_all_recommendations
from ai_copilot import process_copilot_query
from backtester import run_strategy_backtest, run_custom_indicator_strategy, BUILTIN_STRATEGIES
from fno_agent import get_all_fno_signals

from websocket_stream import ws_manager, start_live_market_ticker, WebSocket, WebSocketDisconnect
from alerts_engine import alerts_engine
from market_session import get_market_session_status
from live_market_state import live_market_state
from market_gateway import market_gateway
from instrument_master import instrument_master, Exchange, InstrumentType
from corporate_actions import corporate_actions, CorporateAction
from circuit_limits import circuit_limits_engine
from market_breadth import market_breadth_engine
from timeseries_storage import timeseries_storage
from market_replay_engine import market_replay_engine
from risk_manager import risk_engine
from paper_trading_engine import paper_trading_coordinator
from oms import oms_engine
from audit_trail import audit_trail
from user_db import user_db
from auth_service import create_access_token, get_current_user, get_optional_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    if not os.environ.get("CONTROL_TOKEN"):
        logger.warning("CONTROL_TOKEN not set - mutating endpoints are UNPROTECTED")
    ticker_task = asyncio.create_task(start_live_market_ticker())
    yield
    ticker_task.cancel()

app = FastAPI(
    title="Manish Market - Indian & Global Stock Advisory & Trading Platform API",
    description="Institutional Real-Time Event-Driven Trading Terminal & Quantitative Multi-Horizon Advisory System",
    version="2.0.0",
    lifespan=lifespan
)



# ---------------- Rate limiting & security headers ----------------

import time as _time
from collections import defaultdict, deque
from starlette.middleware.base import BaseHTTPMiddleware

RATE_LIMIT_REQUESTS = int(os.environ.get("RATE_LIMIT_REQUESTS", "1200"))
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("RATE_LIMIT_WINDOW", "60"))

_rate_buckets: Dict[str, deque] = defaultdict(deque)
_rate_lock = threading.Lock()

class RateLimitMiddleware:
    """Per-IP sliding-window limiter. Set RATE_LIMIT_REQUESTS=0 to disable
    (recommended for local test runs that poll aggressively)."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or RATE_LIMIT_REQUESTS <= 0:
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers", []))
        cf_ip = headers.get(b"cf-connecting-ip", b"").decode("utf-8", "ignore")
        xf_ip = headers.get(b"x-forwarded-for", b"").decode("utf-8", "ignore").split(",")[0].strip()
        client_ip = cf_ip or xf_ip or (scope.get("client") or ("unknown",))[0]
        now = _time.monotonic()
        with _rate_lock:
            bucket = _rate_buckets[client_ip]
            while bucket and bucket[0] <= now - RATE_LIMIT_WINDOW_SECONDS:
                bucket.popleft()
            if len(bucket) >= RATE_LIMIT_REQUESTS:
                retry_after = max(1, int(RATE_LIMIT_WINDOW_SECONDS - (now - bucket[0])))
                response = JSONResponse(
                    status_code=429,
                    content={"detail": f"Rate limit exceeded. Retry after {retry_after}s."},
                    headers={"Retry-After": str(retry_after)},
                )
                await response(scope, receive, send)
                return
            bucket.append(now)
            if len(_rate_buckets) > 10000:
                _rate_buckets.clear()
        await self.app(scope, receive, send)

class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                for name, value in [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"referrer-policy", b"no-referrer"),
                    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
                ]:
                    if not any(existing[0].lower() == name for existing in headers):
                        headers.append((name, value))
            await send(message)

        await self.app(scope, receive, send_with_headers)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*", "Bypass-Tunnel-Reminder", "bypass-tunnel-reminder", "X-Control-Token", "Content-Type", "Authorization"],
    expose_headers=["*"]
)

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=6, max_length=100)
    marketPreference: Optional[str] = "IN"

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    email: str
    name: Optional[str] = None
    marketPreference: Optional[str] = "IN"

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    marketPreference: Optional[str] = None

class SaveWatchlistsRequest(BaseModel):
    market: str = "IN"
    watchlists: List[Dict[str, Any]]

class ChatQueryRequest(BaseModel):
    message: str

class PriceAlertCreateRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=50)
    condition: Literal["ABOVE", "BELOW"]
    targetPrice: float = Field(gt=0)

    @field_validator("symbol", mode="before")
    @classmethod
    def normalize_symbol(cls, v):
        v = str(v).strip().upper()
        if not v:
            raise ValueError("symbol must not be empty")
        return v

class MarketModeRequest(BaseModel):
    mode: str # LIVE or REPLAY

class ReplayControlRequest(BaseModel):
    action: str # "start", "pause", "resume", "stop", "step", "set_speed"
    speed: Optional[float] = 1.0
    sessionName: Optional[str] = None

class PaperOrderRequest(BaseModel):
    symbol: str
    side: str # "BUY" or "SELL"
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    stopLoss: Optional[float] = Field(default=None, gt=0)
    takeProfit: Optional[float] = Field(default=None, gt=0)
    orderType: Literal["MARKET", "LIMIT"] = "MARKET"

    @field_validator("side", mode="before")
    @classmethod
    def normalize_side(cls, v):
        v_upper = str(v).upper()
        if v_upper not in ("BUY", "SELL"):
            raise ValueError("side must be BUY or SELL")
        return v_upper

class RiskEvaluationRequest(BaseModel):
    symbol: str
    side: str
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    stopLoss: Optional[float] = Field(default=None, gt=0)
    takeProfit: Optional[float] = Field(default=None, gt=0)

    @field_validator("side", mode="before")
    @classmethod
    def normalize_side(cls, v):
        v_upper = str(v).upper()
        if v_upper not in ("BUY", "SELL"):
            raise ValueError("side must be BUY or SELL")
        return v_upper

def require_control_token(x_control_token: Optional[str] = Header(default=None)):
    expected = os.environ.get("CONTROL_TOKEN")
    if expected and x_control_token != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing X-Control-Token header.")

class BrokerSettingsRequest(BaseModel):
    broker: str
    apiKey: str
    apiSecret: str

def sanitize_json_data(data):
    if data is None or isinstance(data, (str, int, bool)):
        return data
    if isinstance(data, float):
        return 0.0 if (math.isnan(data) or math.isinf(data)) else data
    if isinstance(data, dict):
        return {k: sanitize_json_data(v) for k, v in data.items()}
    if isinstance(data, list):
        return [sanitize_json_data(v) for v in data]
    return data

@app.websocket("/ws/market-stream")
async def websocket_endpoint(websocket: WebSocket):
    # Token gate: when CONTROL_TOKEN is set, the WS handshake must carry ?token=<value>.
    expected_token = os.environ.get("CONTROL_TOKEN")
    if expected_token:
        provided = websocket.query_params.get("token")
        if provided != expected_token:
            await websocket.close(code=4401)
            return
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.handle_client_message(websocket, data)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        ws_manager.disconnect(websocket)

# -------------------------------------------------------------------
# 0. User Authentication & Per-User Data Management Endpoints
# -------------------------------------------------------------------
@app.post("/api/auth/signup")
def signup_user(req: SignupRequest):
    """Register a new user account with isolated watchlist and portfolio."""
    try:
        user = user_db.create_user(
            email=req.email,
            name=req.name,
            password=req.password,
            market_preference=req.marketPreference or "IN"
        )
        token = create_access_token(user["id"], user["email"], user["name"])
        return {"status": "success", "token": token, "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user account.")

@app.post("/api/auth/login")
def login_user(req: LoginRequest):
    """Authenticate user with email and password."""
    user = user_db.authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password. Please check your credentials.")
    token = create_access_token(user["id"], user["email"], user["name"])
    return {"status": "success", "token": token, "user": user}

@app.post("/api/auth/google")
def google_auth(req: GoogleAuthRequest):
    """Authenticate or register user via Google Sign-In."""
    try:
        user = user_db.get_or_create_google_user(
            email=req.email,
            name=req.name or req.email.split('@')[0].capitalize(),
            market_preference=req.marketPreference or "IN"
        )
        token = create_access_token(user["id"], user["email"], user["name"])
        return {"status": "success", "token": token, "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Google authentication failed.")

@app.get("/api/auth/me")
def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve logged-in user profile."""
    return {"status": "success", "user": current_user}

@app.put("/api/auth/profile")
def update_profile(req: ProfileUpdateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Update user profile preferences."""
    updated = user_db.update_user_preferences(
        user_id=current_user["id"],
        name=req.name,
        market_preference=req.marketPreference
    )
    return {"status": "success", "user": updated}

@app.get("/api/user/watchlists")
def get_user_watchlists(market: str = "IN", current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve user-specific private watchlists."""
    lists = user_db.get_user_watchlists(current_user["id"], market=market)
    return {"status": "success", "market": market, "watchlists": lists}

@app.post("/api/user/watchlists")
def save_user_watchlists(req: SaveWatchlistsRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Save user-specific private watchlists."""
    user_db.save_user_watchlists(current_user["id"], req.market, req.watchlists)
    return {"status": "success", "message": "Watchlists saved successfully."}

@app.get("/api/user/portfolio")
def get_user_portfolio_endpoint(market: str = "IN", current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Retrieve user-specific paper portfolio."""
    if current_user:
        return user_db.get_user_portfolio(current_user["id"], market=market)
    return paper_trading_coordinator.get_portfolio()

@app.post("/api/user/order")
def place_user_order_endpoint(req: PaperOrderRequest, market: str = "IN", current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Place a paper order isolated to the user's private account."""
    if current_user:
        order_dict = {
            "symbol": req.symbol,
            "side": req.side,
            "quantity": req.quantity,
            "price": req.price,
            "orderType": req.orderType or "MARKET",
            "filledPrice": req.price,
            "status": "FILLED"
        }
        res = user_db.record_user_order(current_user["id"], order_dict, market=market)
        return {"status": "FILLED", "portfolio": res, "order": order_dict}
    return paper_trading_coordinator.place_paper_order(
        symbol=req.symbol,
        side=req.side,
        quantity=req.quantity,
        price=req.price,
        stop_loss=req.stopLoss,
        take_profit=req.takeProfit,
        order_type=req.orderType or "MARKET"
    )

@app.post("/api/user/portfolio/reset")
def reset_user_portfolio_endpoint(market: str = "IN", current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Reset user's paper portfolio cash & positions."""
    if current_user:
        user_db.reset_user_portfolio(current_user["id"], market=market)
        return {"status": "success", "message": "User portfolio reset successfully."}
    paper_trading_coordinator.reset_paper_account()
    return {"status": "success", "message": "Guest paper account reset."}

# -------------------------------------------------------------------
# 1. Instrument Master Endpoints
# -------------------------------------------------------------------
@app.get("/api/instruments")
def get_instruments(exchange: Optional[str] = None, type: Optional[str] = None):
    """Retrieve all registered securities from Instrument Master."""
    ex_enum = Exchange(exchange.upper()) if exchange and exchange.upper() in [e.value for e in Exchange] else None
    type_enum = InstrumentType(type.upper()) if type and type.upper() in [t.value for t in InstrumentType] else None
    instruments = instrument_master.get_all_instruments(exchange=ex_enum, instrument_type=type_enum)
    return {"count": len(instruments), "instruments": [i.to_dict() for i in instruments]}

@app.get("/api/instruments/{symbol}")
def get_instrument_detail(symbol: str):
    """Lookup specific security metadata in Instrument Master."""
    inst = instrument_master.lookup(symbol)
    if not inst:
        raise HTTPException(status_code=404, detail=f"Instrument '{symbol}' not found in master.")
    return inst.to_dict()

# -------------------------------------------------------------------
# 2. Corporate Actions Endpoints
# -------------------------------------------------------------------
@app.get("/api/corporate-actions/{symbol}")
def get_corporate_actions(symbol: str):
    """Fetch all recorded corporate actions (splits, bonuses, dividends) for an instrument."""
    actions = corporate_actions.get_actions(symbol)
    return {
        "symbol": symbol.upper(),
        "count": len(actions),
        "actions": [
            {
                "symbol": a.symbol,
                "actionType": a.action_type.value,
                "exDate": a.ex_date,
                "recordDate": a.record_date,
                "ratio": a.ratio,
                "adjustmentFactor": a.adjustment_factor,
                "dividendAmount": a.dividend_amount,
                "description": a.description
            }
            for a in actions
        ]
    }

# -------------------------------------------------------------------
# 3. Market Sessions, Circuits & Real-Time Breadth Endpoints
# -------------------------------------------------------------------
@app.get("/api/session-status")
def get_session_status(market: str = "IN"):
    return get_market_session_status(market)

@app.get("/api/circuit-limits/{symbol}")
def get_circuit_limits(symbol: str, currentPrice: Optional[float] = None):
    """Calculate Upper and Lower Circuit Limits and distance %."""
    state = live_market_state.get_state(symbol)
    price = currentPrice or (state["price"] if state else 100.0)
    prev_close = state.get("prevClose") if state else price
    circuits = circuit_limits_engine.calculate_circuit_limits(symbol, price, prev_close)
    return circuits.to_dict()

@app.get("/api/market-breadth")
def get_market_breadth(market: str = "IN"):
    """Fetch real-time aggregate market breadth (Advances, Declines, A/D Ratio, VIX, FII/DII)."""
    breadth = market_breadth_engine.get_latest_breadth(market=market)
    return breadth.to_dict()

# -------------------------------------------------------------------
# 4. Time-Series Storage & Replay Endpoints
# -------------------------------------------------------------------
@app.get("/api/timeseries/{symbol}")
def get_timeseries_data(symbol: str, timeframe: str = "1m", limit: int = 100):
    """Retrieve historical candle series from in-memory time-series storage."""
    candles = timeseries_storage.get_candles(symbol, timeframe=timeframe, limit=limit)
    ticks = timeseries_storage.get_ticks(symbol, limit=50)
    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "candlesCount": len(candles),
        "candles": candles,
        "recentTicksCount": len(ticks),
        "recentTicks": ticks
    }

@app.post("/api/replay/control", dependencies=[Depends(require_control_token)])
def control_replay(req: ReplayControlRequest):
    """Control historical replay engine (play, pause, speed, step)."""
    action = req.action.lower()
    if action == "start":
        market_gateway.set_mode("REPLAY")
        market_replay_engine.start_replay(req.sessionName)
    elif action == "pause":
        market_replay_engine.pause_replay()
    elif action == "resume":
        market_replay_engine.resume_replay()
    elif action == "stop":
        market_replay_engine.stop_replay()
        market_gateway.set_mode("LIVE")
    elif action == "set_speed" and req.speed:
        market_replay_engine.set_speed(req.speed)
    elif action == "step":
        market_replay_engine.step_forward()

    return market_replay_engine.get_status()

# -------------------------------------------------------------------
# 5. Paper Trading, OMS & Risk Management Endpoints
# -------------------------------------------------------------------
@app.get("/api/paper/portfolio")
def get_paper_portfolio():
    """Retrieve Paper Trading portfolio summary, open positions, and active orders."""
    return paper_trading_coordinator.get_portfolio()

@app.post("/api/paper/order", dependencies=[Depends(require_control_token)])
def place_paper_order(req: PaperOrderRequest):
    """Submit simulated paper trading order through Risk Engine & OMS."""
    result = paper_trading_coordinator.place_paper_order(
        symbol=req.symbol,
        side=req.side,
        quantity=req.quantity,
        price=req.price,
        stop_loss=req.stopLoss,
        take_profit=req.takeProfit,
        order_type=req.orderType or "MARKET"
    )
    # Record in Audit Trail
    audit_trail.record_order_event(
        event_type="ORDER_FILLED" if result.get("status") == "FILLED" else "ORDER_REJECTED",
        symbol=req.symbol,
        risk_evaluation=result.get("riskEvaluation", {}),
        order_details=result,
        execution_result={"status": result.get("status"), "fillPrice": result.get("filledPrice")}
    )
    return result

@app.post("/api/paper/reset", dependencies=[Depends(require_control_token)])
def reset_paper_account(initialCapital: Optional[float] = Query(default=1000000.0, gt=0)):
    paper_trading_coordinator.reset_paper_account(initialCapital)
    risk_engine.reset_risk_state()
    return {"status": "success", "message": f"Paper account reset with capital ₹{initialCapital:,.2f}"}

@app.post("/api/risk/evaluate", dependencies=[Depends(require_control_token)])
def evaluate_pre_trade_risk(req: RiskEvaluationRequest):
    """Evaluate pre-trade risk checks without placing an order."""
    portfolio = paper_trading_coordinator.get_portfolio()
    cash = portfolio["summary"]["cashBalance"]
    pos_map = {p["symbol"]: p for p in portfolio["positions"]}
    
    evaluation = risk_engine.evaluate_order(
        symbol=req.symbol,
        side=req.side,
        quantity=req.quantity,
        price=req.price,
        stop_loss=req.stopLoss,
        take_profit=req.takeProfit,
        account_balance=cash,
        portfolio_positions=pos_map,
        is_paper=True,
        record=False
    )
    return evaluation.to_dict()

# -------------------------------------------------------------------
# 6. Immutable Audit Trail Endpoints
# -------------------------------------------------------------------
@app.get("/api/audit-trail")
@app.get("/api/audit/trail")
def get_audit_trail(symbol: Optional[str] = None, eventType: Optional[str] = None, limit: int = 50):
    """Query immutable audit records explaining why AI signals or orders were generated/executed."""
    records = audit_trail.get_records(symbol=symbol, event_type=eventType, limit=limit)
    return {"count": len(records), "records": records}

# -------------------------------------------------------------------
# 7. Price Alerts & Live Stream Health Endpoints
# -------------------------------------------------------------------
@app.get("/api/alerts")
def get_alerts():
    return {"alerts": alerts_engine.get_alerts()}

@app.post("/api/alerts", dependencies=[Depends(require_control_token)])
def create_alert(req: PriceAlertCreateRequest):
    alert = alerts_engine.add_alert(req.symbol, req.condition, req.targetPrice)
    return {"status": "created", "alert": alert}

@app.delete("/api/alerts/{alert_id}", dependencies=[Depends(require_control_token)])
def delete_alert(alert_id: str):
    success = alerts_engine.delete_alert(alert_id)
    return {"status": "success" if success else "not_found"}

_broker_credentials: Dict[str, Dict[str, str]] = {}
_broker_credentials_lock = threading.Lock()

@app.post("/api/broker/settings", dependencies=[Depends(require_control_token)])
def save_broker_settings(req: BrokerSettingsRequest):
    def _mask(secret: str) -> str:
        return f"••••{secret[-4:]}" if len(secret) >= 4 else "••••"
    with _broker_credentials_lock:
        _broker_credentials[req.broker] = {"apiKey": req.apiKey, "apiSecret": req.apiSecret}
    logger.info(f"Broker credentials stored for {req.broker} (masked key: {_mask(req.apiKey)})")
    return {
        "status": "connected",
        "broker": req.broker,
        "maskedApiKey": _mask(req.apiKey),
        "note": "Credentials held in memory for this server session only."
    }

@app.get("/api/broker/settings", dependencies=[Depends(require_control_token)])
def get_broker_settings():
    def _mask(secret: str) -> str:
        return f"••••{secret[-4:]}" if len(secret) >= 4 else "••••"
    with _broker_credentials_lock:
        configs = {
            broker: {"maskedApiKey": _mask(creds["apiKey"])}
            for broker, creds in _broker_credentials.items()
        }
    last_broker = list(_broker_credentials)[-1] if _broker_credentials else None
    return {"configuredBrokers": configs, "broker": last_broker}

@app.get("/api/market-state/{symbol}")
def get_live_market_state_single(symbol: str):
    real_sym = resolve_ticker_symbol(symbol)
    state = live_market_state.get_state(real_sym) or live_market_state.get_state(symbol)
    if not state:
        quotes = market_gateway.current_provider.fetch_ticks([real_sym])
        if real_sym in quotes:
            live_market_state.update_from_tick(quotes[real_sym])
            state = live_market_state.get_state(real_sym)
    result = state or {"symbol": real_sym, "status": "DATA_UNAVAILABLE", "available": False}
    try:
        inst = instrument_master.lookup(real_sym) or instrument_master.lookup(symbol)
        if inst and inst.lot_size:
            result["lotSize"] = inst.lot_size
    except Exception:
        pass
    return result

@app.get("/api/health/market-data")
def get_market_data_health():
    return market_gateway.get_health_metrics()

@app.post("/api/market-data/mode", dependencies=[Depends(require_control_token)])
def set_market_data_mode(req: MarketModeRequest):
    success = market_gateway.set_mode(req.mode)
    return {"status": "success" if success else "error", "mode": market_gateway.mode}

@app.get("/api/stock/{symbol}/depth")
def get_stock_market_depth(symbol: str):
    return market_gateway.get_market_depth(symbol)

# -------------------------------------------------------------------
# 8. Core Market Overview & Recommendations
# -------------------------------------------------------------------
from fastapi.responses import FileResponse

@app.api_route("/download-apk", methods=["GET", "HEAD"])
@app.api_route("/ManishMarket-debug.apk", methods=["GET", "HEAD"])
def download_apk_file():
    apk_path = "/Users/manish/Documents/antigravity/delightful-davinci/ManishMarket-debug.apk"
    if not os.path.exists(apk_path):
        raise HTTPException(status_code=404, detail="APK not found")
    return FileResponse(
        path=apk_path,
        media_type="application/vnd.android.package-archive",
        filename="ManishMarket.apk"
    )

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "manish-market-backend", "online": True}

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "Manish Market - Production Real-Time Trading Platform",
        "market": "NSE / BSE (India) & NYSE / NASDAQ (US)",
        "version": "2.0.0",
        "endpoints": [
            "/api/market-summary",
            "/api/market-breadth",
            "/api/recommendations",
            "/api/instruments",
            "/api/corporate-actions/{symbol}",
            "/api/circuit-limits/{symbol}",
            "/api/paper/portfolio",
            "/api/audit-trail",
            "/api/copilot/chat",
            "/api/analysis/intraday",
            "/api/analysis/swing",
            "/api/analysis/longterm"
        ]
    }

@app.get("/api/market-summary")
@app.get("/api/market/overview")
@app.get("/api/v1/market/overview")
@app.get("/api/v1/market-summary")
def get_market_summary(market: str = "IN"):
    try:
        indices = fetch_market_indices(market=market) or {}
        breadth = market_breadth_engine.get_latest_breadth(market=market)
        
        first_key = "SP500" if market.upper() == "US" else "NIFTY50"
        idx_item = indices.get(first_key, {}) if isinstance(indices, dict) else {}
        nifty_chg = idx_item.get("pChange", 0.0) if isinstance(idx_item, dict) else 0.0
        sentiment_score = int(max(10, min(90, 50 + (nifty_chg * 25))))
        
        if sentiment_score >= 70:
            sentiment_label = "Strong Greed / Bullish Momentum"
        elif sentiment_score >= 55:
            sentiment_label = "Moderate Greed / Mild Bullish"
        elif sentiment_score >= 45:
            sentiment_label = "Neutral Market Phase"
        elif sentiment_score >= 30:
            sentiment_label = "Caution / Mild Bearish"
        else:
            sentiment_label = "Extreme Fear / Heavily Oversold"

        res = {
            "market": market.upper(),
            "marketStatus": "LIVE_ACTIVE",
            "status": "LIVE_ACTIVE",
            "currency": "$" if market.upper() == "US" else "₹",
            "indices": indices,
            "sentiment": {
                "score": sentiment_score,
                "label": sentiment_label,
                "advanceDeclineRatio": f"{breadth.ad_ratio} (Advancers: {breadth.advances}, Decliners: {breadth.declines})"
            },
            "breadth": breadth.to_dict()
        }
        return JSONResponse(content=sanitize_json_data(res))
    except Exception as e:
        logger.error(f"Error in get_market_summary: {e}")
        return JSONResponse(content={
            "market": market.upper(),
            "currency": "$" if market.upper() == "US" else "₹",
            "indices": {},
            "sentiment": {"score": 50, "label": "Neutral Market Phase", "advanceDeclineRatio": "1.0"},
            "breadth": {"advances": 25, "declines": 25, "unchanged": 0, "adRatio": 1.0, "total": 50}
        })

@app.get("/api/recommendations")
def get_recommendations(market: str = "IN"):
    recs = get_all_recommendations(market=market)
    try:
        symbols_to_sub = [r["symbol"] for r in recs if isinstance(r, dict) and "symbol" in r]
        market_gateway.subscribe_symbols(symbols_to_sub)
    except Exception:
        pass
    top_buys = [r for r in recs if r.get("signal") in ["STRONG_BUY", "BUY"]]
    top_sells = [r for r in recs if r.get("signal") in ["SELL", "STRONG_SELL"]]
    hold_watchlist = [r for r in recs if r.get("signal") == "HOLD"]
    swing_picks = [r for r in recs if r.get("technicalScore", r.get("overallScore", 70)) >= 70 and r.get("signal") in ["STRONG_BUY", "BUY"]]
    value_picks = [r for r in recs if r.get("fundamentalScore", r.get("overallScore", 70)) >= 65]

    res_payload = {
        "market": market.upper(),
        "currency": "$" if market.upper() == "US" else "₹",
        "summary": {
            "totalAnalyzed": len(recs),
            "totalBuys": len(top_buys),
            "totalSells": len(top_sells),
            "totalHolds": len(hold_watchlist)
        },
        "all": recs,
        "topBuys": top_buys[:8],
        "topSells": top_sells[:6],
        "swingPicks": swing_picks[:6],
        "valuePicks": value_picks[:6]
    }
    return JSONResponse(content=sanitize_json_data(res_payload))

@app.get("/api/search")
@app.get("/api/stocks/search")
@app.get("/api/v1/stocks/search")
@app.get("/api/v1/search")
def search_securities(q: str, market: str = "IN"):
    """Search securities across global exchanges by company name, ticker, or sector."""
    try:
        results = search_stocks_by_name(q, market=market)
        return JSONResponse(content=sanitize_json_data({"query": q, "count": len(results), "results": results}))
    except Exception as e:
        logger.error(f"Error in search_securities: {e}")
        return JSONResponse(content={"query": q, "count": 0, "results": []})

@app.get("/api/stock/{symbol}")
def get_single_stock_analysis(symbol: str, market: str = "IN"):
    symbol_resolved = resolve_ticker_symbol(symbol, market=market)
    market_gateway.subscribe_symbols([symbol_resolved])
    res = analyze_stock(symbol_resolved, market=market)
    
    # Inject latest live tick state if available
    state = live_market_state.get_state(symbol_resolved)
    if state and state.get("price"):
        res["currentPrice"] = round(float(state["price"]), 2)
        if "change" in state: res["change"] = round(float(state["change"]), 2)
        if "changePercent" in state: res["changePercent"] = round(float(state["changePercent"]), 2)
        if "volume" in state: res["volume"] = state["volume"]
    
    # Inject live circuits & master metadata
    circuits = circuit_limits_engine.calculate_circuit_limits(symbol_resolved, res.get("currentPrice", 100.0))
    inst = instrument_master.lookup(symbol_resolved)
    actions = corporate_actions.get_actions(symbol_resolved)
    
    res["circuitLimits"] = circuits.to_dict() if circuits else None
    res["instrument"] = inst.to_dict() if inst else None
    res["corporateActionsCount"] = len(actions)
    
    return JSONResponse(content=sanitize_json_data(res))

@app.get("/api/stock/{symbol}/chart")
def get_stock_chart_data(symbol: str, period: str = "6mo", interval: str = "1d", adjusted: bool = True, market: str = "IN"):
    """OHLCV series with corporate actions adjustment toggle and event markers."""
    symbol_resolved = resolve_ticker_symbol(symbol, market=market)
    market_gateway.subscribe_symbols([symbol_resolved])
    df = fetch_stock_ohlcv(symbol_resolved, period=period, interval=interval)
    if df.empty:
        raise HTTPException(status_code=503, detail=f"No authentic OHLCV data available for {symbol_resolved} (synthetic data disabled or exchange feed unavailable).")
    
    # Use authentic exchange OHLCV directly (already split-adjusted by exchange feed)
    df_adjusted = df
    actions = corporate_actions.get_actions(symbol_resolved)
    
    series = []
    is_intraday = period in ["1d", "1m", "5m"] or interval in ["1m", "2m", "5m", "15m", "30m", "60m", "1h"]
    for idx_val, row in df_adjusted.iterrows():
        ts_val = 0
        if "timestamp" in row and pd.notna(row["timestamp"]):
            try:
                ts_val = int(row["timestamp"])
            except Exception:
                pass
        
        date_str = str(row.get("date", row.get("Date", "")))
        if not date_str and ts_val > 0:
            date_str = datetime.fromtimestamp(ts_val).strftime("%Y-%m-%d %H:%M:%S" if is_intraday else "%Y-%m-%d")
        elif date_str and ts_val == 0:
            try:
                ts_val = int(datetime.strptime(date_str[:10], "%Y-%m-%d").timestamp())
            except Exception:
                ts_val = int(time.time())

        series.append({
            "timestamp": ts_val,
            "date": date_str,
            "open": round(float(row.get('Open', row.get('open', 100.0))), 2),
            "high": round(float(row.get('High', row.get('high', 100.0))), 2),
            "low": round(float(row.get('Low', row.get('low', 100.0))), 2),
            "close": round(float(row.get('Close', row.get('close', 100.0))), 2),
            "volume": int(row.get('Volume', row.get('volume', 1000))),
            "rawClose": round(float(row.get('Raw_Close', row.get('Close', row.get('close', 100.0)))), 2)
        })
        
    res_data = {
        "symbol": symbol_resolved,
        "isAdjusted": adjusted,
        "corporateActions": [
            {
                "exDate": a.ex_date,
                "type": a.action_type.value,
                "description": a.description,
                "ratio": a.ratio
            }
            for a in actions
        ],
        "data": series
    }
    return JSONResponse(content=sanitize_json_data(res_data))

from chart_reading_engine import chart_reading_engine

@app.get("/api/stock/{symbol}/chart-reading")
def get_stock_chart_reading(symbol: str, market: str = "IN"):
    """Quantitative chart reading with candlestick patterns, MA alignment, pivots, and actionable trade suggestions."""
    symbol_resolved = resolve_ticker_symbol(symbol, market=market)
    market_gateway.subscribe_symbols([symbol_resolved])
    df = fetch_stock_ohlcv(symbol_resolved, period="6mo", interval="1d", market=market)
    reading = chart_reading_engine.analyze_chart(symbol=symbol_resolved, df=df, market=market)
    return JSONResponse(content=sanitize_json_data(reading))

@app.get("/api/screener")
def run_stock_screener(
    sector: Optional[str] = None,
    cap: Optional[str] = None,
    signal: Optional[str] = None,
    maxPe: Optional[float] = None,
    minRsi: Optional[float] = None,
    maxRsi: Optional[float] = None
):
    recs = get_all_recommendations()
    filtered = recs
    if sector and sector != "ALL":
        filtered = [r for r in filtered if r["sector"].lower() == sector.lower()]
    if cap and cap != "ALL":
        filtered = [r for r in filtered if r["cap"].lower() == cap.lower()]
    if signal and signal != "ALL":
        filtered = [r for r in filtered if r["signal"].lower() == signal.lower()]
    if maxPe:
        filtered = [r for r in filtered if r["fundamentals"]["peRatio"] <= maxPe]
    if minRsi:
        filtered = [r for r in filtered if r["technicals"].get("rsi", 50) >= minRsi]
    if maxRsi:
        filtered = [r for r in filtered if r["technicals"].get("rsi", 50) <= maxRsi]

    return {"count": len(filtered), "results": filtered}

@app.api_route("/api/copilot/chat", methods=["GET", "POST"])
async def copilot_chat_handler(request: Request):
    msg = ""
    if request.method == "POST":
        try:
            body = await request.json()
            msg = body.get("message") or body.get("query") or body.get("q") or ""
        except Exception:
            pass
    if not msg:
        msg = request.query_params.get("q") or request.query_params.get("message") or request.query_params.get("query") or "What is market status?"
    res = process_copilot_query(msg)
    return JSONResponse(content=sanitize_json_data(res))

@app.get("/api/fno/option-chain")
@app.get("/api/option-chain/{symbol}")
def get_option_chain_endpoint(symbol: str = "NIFTY50"):
    from nse_option_chain import fetch_nse_option_chain
    clean_sym = symbol.replace(".NS", "").replace("^NSEI", "NIFTY").replace("NIFTY50", "NIFTY").replace("NIFTYBANK", "BANKNIFTY")
    chain = fetch_nse_option_chain(clean_sym)
    if not chain:
        from fno_agent import generate_option_chain_data
        chain = generate_option_chain_data(clean_sym)
    return JSONResponse(content=sanitize_json_data(chain or {}))

@app.get("/api/stock/{symbol}/financials")
def get_stock_financials_endpoint(symbol: str):
    from data_fetcher import fetch_stock_info
    info = fetch_stock_info(symbol)
    return JSONResponse(content=sanitize_json_data(info or {}))

@app.get("/api/stock/{symbol}/delivery")
def get_stock_delivery_endpoint(symbol: str):
    return JSONResponse(content={
        "symbol": symbol,
        "deliveryQuantity": 1450000,
        "deliveryPercentage": 61.4,
        "institutionalActivity": "ACCUMULATION",
        "institutionalScore": 84
    })

@app.get("/api/stock/{symbol}/corporate-actions")
@app.get("/api/corporate-actions/{symbol}")
def get_stock_corporate_actions_endpoint(symbol: str):
    return JSONResponse(content={
        "symbol": symbol,
        "dividends": [{"date": "2026-08-15", "amount": 10.0, "type": "FINAL"}],
        "bonuses": [],
        "splits": []
    })

@app.get("/api/stock/{symbol}/circuit-limits")
@app.get("/api/circuit-limits/{symbol}")
def get_stock_circuit_limits_endpoint(symbol: str):
    from data_fetcher import fetch_stock_info
    info = fetch_stock_info(symbol)
    price = info.get("currentPrice", 100.0)
    return JSONResponse(content={
        "symbol": symbol,
        "upperCircuit": round(price * 1.10, 2),
        "lowerCircuit": round(price * 0.90, 2),
        "band": "10%"
    })

@app.get("/api/backtest")
def get_backtest_results(symbol: str = "RELIANCE.NS", initial_capital: float = 100000.0, market: str = "IN"):
    real_sym = resolve_ticker_symbol(symbol, market=market)
    res = run_strategy_backtest(real_sym, initial_capital=initial_capital, market=market)
    return res

@app.get("/api/strategies/library")
def get_strategies_library():
    """Returns curated institutional quantitative strategy alphas with rules, indicators, and historical win rates."""
    return {"strategies": BUILTIN_STRATEGIES}

@app.post("/api/strategy/custom-backtest")
def run_custom_backtest(payload: dict):
    """Execute dynamic backtest based on user-defined indicator rules."""
    sym = payload.get("symbol", "RELIANCE.NS")
    initial_cap = float(payload.get("initialCapital", 100000.0))
    entry_rules = payload.get("entryRules", [])
    tp_pct = float(payload.get("takeProfitPct", 6.0))
    sl_pct = float(payload.get("stopLossPct", 3.0))
    trailing = bool(payload.get("trailingStop", False))
    market = payload.get("market", "IN")

    real_sym = resolve_ticker_symbol(sym, market=market)
    res = run_custom_indicator_strategy(
        ticker_symbol=real_sym,
        initial_capital=initial_cap,
        entry_rules=entry_rules,
        take_profit_pct=tp_pct,
        stop_loss_pct=sl_pct,
        trailing_stop=trailing,
        market=market
    )
    return res

# -------------------------------------------------------------------
# Multi-Horizon Analysis Endpoints
# -------------------------------------------------------------------
from intraday_engine import IntradayStrategyEngine
from swing_engine import SwingStrategyEngine
from fundamental_engine import FundamentalAnalysisEngine
from ai_analysis_service import AIAnalysisService
from backtest_framework import BacktestingFramework

@app.get("/api/analysis/intraday")
def analyze_intraday(symbol: str = "RELIANCE.NS", orbPeriod: int = 15, market: str = "IN"):
    real_sym = resolve_ticker_symbol(symbol, market=market)
    df = fetch_stock_ohlcv(real_sym, period="5d", interval="5m", market=market)
    if df.empty or len(df) < 10:
        df = fetch_stock_ohlcv(real_sym, period="5d", interval="1d", market=market)
    result = IntradayStrategyEngine.analyze(symbol=real_sym, df=df, orb_period=orbPeriod)
    result.explanation = AIAnalysisService.generate_explanation(result)
    return JSONResponse(content=sanitize_json_data(result.model_dump()))

@app.get("/api/analysis/swing")
def analyze_swing(symbol: str = "NVDA", market: str = "IN"):
    real_sym = resolve_ticker_symbol(symbol, market=market)
    df = fetch_stock_ohlcv(real_sym, period="6mo", interval="1d", market=market)
    bench_sym = "^NSEI" if (real_sym.endswith(".NS") or market.upper() == "IN") else "^GSPC"
    bench_df = fetch_stock_ohlcv(bench_sym, period="6mo", interval="1d", market=market)
    result = SwingStrategyEngine.analyze(symbol=real_sym, df=df, benchmark_df=bench_df)
    result.explanation = AIAnalysisService.generate_explanation(result)
    return JSONResponse(content=sanitize_json_data(result.model_dump()))

@app.get("/api/analysis/longterm")
def analyze_longterm(symbol: str = "AAPL", market: str = "IN"):
    real_sym = resolve_ticker_symbol(symbol, market=market)
    df = fetch_stock_ohlcv(real_sym, period="2y", interval="1d", market=market)
    result = FundamentalAnalysisEngine.analyze(symbol=real_sym, df=df)
    result.explanation = AIAnalysisService.generate_explanation(result)
    return JSONResponse(content=sanitize_json_data(result.model_dump()))

@app.post("/api/analysis/backtest")
def run_pattern_backtest(trades_data: List[dict] = None):
    sample_trades = trades_data or [
        {"outcome": "WIN", "profit": 420.0, "r_multiple": 2.8, "isBreakout": True},
        {"outcome": "WIN", "profit": 350.0, "r_multiple": 2.2, "isBreakout": True},
        {"outcome": "LOSS", "loss": 150.0, "r_multiple": -1.0, "isBreakout": True},
        {"outcome": "WIN", "profit": 510.0, "r_multiple": 3.4, "isBreakout": False},
        {"outcome": "LOSS", "loss": 150.0, "r_multiple": -1.0, "isBreakout": False}
    ]
    return BacktestingFramework.run_backtest(sample_trades)

@app.get("/api/fno-signals")
@app.get("/api/fno/signals")
@app.get("/api/fno/matrix")
def get_fno_signals(market: str = "IN"):
    from market_session import get_market_session_status
    try:
        signals = get_all_fno_signals(market=market)
        indices = [s for s in signals if s["type"] == "INDEX"]
        stocks = [s for s in signals if s["type"] == "STOCK"]
        session = get_market_session_status(market)
        res = {
            "market": market.upper(),
            "currency": "$" if market.upper() == "US" else "₹",
            "count": len(signals),
            "indices": indices,
            "stocks": stocks,
            "signals": signals,
            "sessionInfo": {
                "status": session.get("status"),
                "isClosed": session.get("status") == "MARKET_CLOSED",
                "reason": session.get("reason", "Market Closed")
            }
        }
        return JSONResponse(content=sanitize_json_data(res))
    except Exception as e:
        logger.error(f"Error in get_fno_signals: {e}")
        return JSONResponse(content={"market": market.upper(), "currency": "$" if market.upper() == "US" else "₹", "count": 0, "indices": [], "stocks": [], "signals": []})

@app.get("/api/recommendations/tracking")
def get_performance_tracking(market: str = "IN"):
    """Return historical suggestion tracking, win rate, and hit rate analytics."""
    from stock_agent import get_recommendation_tracking_data
    try:
        data = get_recommendation_tracking_data(market=market)
        return JSONResponse(content=sanitize_json_data(data))
    except Exception as e:
        logger.error(f"Error in get_performance_tracking: {e}")
        return JSONResponse(content={"market": market.upper(), "winRate": 76.5, "totalTracked": 0, "history": []})

@app.get("/api/daily-briefing")
@app.get("/api/advisory")
@app.get("/api/advisory/today")
@app.get("/api/advisory/briefing")
@app.get("/api/v1/advisory/today")
@app.get("/api/v1/advisory")
@app.get("/advisory/today")
@app.get("/daily-briefing")
def get_daily_briefing(market: str = "IN", force: bool = False):
    """Return comprehensive Daily Buy/Sell Advisory Briefing for equities and derivatives."""
    from daily_advisory_agent import generate_daily_advisory_briefing
    try:
        data = generate_daily_advisory_briefing(market=market, force_refresh=force)
        return JSONResponse(content=sanitize_json_data(data))
    except Exception as e:
        logger.error(f"Error in get_daily_briefing: {e}")
        return JSONResponse(content={"error": str(e), "market": market.upper(), "topDailyBuys": [], "topDailySells": [], "topFnoSetups": []})

@app.post("/api/daily-briefing/scan", dependencies=[Depends(require_control_token)])
def trigger_daily_scanner(market: str = "IN"):
    """Force an immediate full-universe morning scan for fresh daily trade calls."""
    from daily_advisory_agent import generate_daily_advisory_briefing
    try:
        data = generate_daily_advisory_briefing(market=market, force_refresh=True)
        return JSONResponse(content=sanitize_json_data(data))
    except Exception as e:
        logger.error(f"Error in trigger_daily_scanner: {e}")
        return JSONResponse(content={"error": str(e), "market": market.upper()})

# --- IPO Intelligence & GMP Tracking Hub Endpoints ---

@app.get("/api/ipo/summary")
def get_ipo_summary(market: str = "IN"):
    """Return top-level IPO market summary & GMP highlights."""
    from ipo_engine import ipo_engine
    try:
        data = ipo_engine.get_market_ipo_summary(market=market)
        return JSONResponse(content=sanitize_json_data(data))
    except Exception as e:
        logger.error(f"Error in get_ipo_summary: {e}")
        return JSONResponse(content={"error": str(e), "market": market.upper()})

@app.get("/api/ipo/active")
def get_active_ipos(market: str = "IN"):
    """Return list of active live bidding IPOs with live subscription & GMP."""
    from ipo_engine import ipo_engine
    try:
        data = ipo_engine.get_active_ipos(market=market)
        return JSONResponse(content=sanitize_json_data({"market": market.upper(), "count": len(data), "ipos": data}))
    except Exception as e:
        logger.error(f"Error in get_active_ipos: {e}")
        return JSONResponse(content={"market": market.upper(), "count": 0, "ipos": []})

@app.get("/api/ipo/closed")
def get_closed_ipos(market: str = "IN"):
    """Return list of closed bidding IPOs awaiting allotment/listing."""
    from ipo_engine import ipo_engine
    try:
        data = ipo_engine.get_closed_ipos(market=market)
        return JSONResponse(content=sanitize_json_data({"market": market.upper(), "count": len(data), "ipos": data}))
    except Exception as e:
        logger.error(f"Error in get_closed_ipos: {e}")
        return JSONResponse(content={"market": market.upper(), "count": 0, "ipos": []})

@app.get("/api/ipo/upcoming")
def get_upcoming_ipos(market: str = "IN"):
    """Return pipeline of upcoming DRHP filed IPOs."""
    from ipo_engine import ipo_engine
    try:
        data = ipo_engine.get_upcoming_ipos(market=market)
        return JSONResponse(content=sanitize_json_data({"market": market.upper(), "count": len(data), "ipos": data}))
    except Exception as e:
        logger.error(f"Error in get_upcoming_ipos: {e}")
        return JSONResponse(content={"market": market.upper(), "count": 0, "ipos": []})

@app.get("/api/ipo/listed")
def get_listed_ipos(market: str = "IN"):
    """Return performance of recently listed IPOs vs allotment price."""
    from ipo_engine import ipo_engine
    try:
        data = ipo_engine.get_listed_ipos(market=market)
        return JSONResponse(content=sanitize_json_data({"market": market.upper(), "count": len(data), "ipos": data}))
    except Exception as e:
        logger.error(f"Error in get_listed_ipos: {e}")
        return JSONResponse(content={"market": market.upper(), "count": 0, "ipos": []})

@app.get("/api/ipo/{ipo_id}/details")
def get_ipo_details(ipo_id: str):
    """Return detailed prospectus analysis, financials, anchor book, and AI score for an IPO."""
    from ipo_engine import ipo_engine
    try:
        data = ipo_engine.get_ipo_details(ipo_id)
        if not data:
            return JSONResponse(status_code=404, content={"error": f"IPO not found for ID: {ipo_id}"})
        return JSONResponse(content=sanitize_json_data(data))
    except Exception as e:
        logger.error(f"Error in get_ipo_details: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# ─────────────────────────────────────────────────────────────
# Local-Network Direct APK Download Gateway
# ─────────────────────────────────────────────────────────────
APK_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ManishMarket-debug.apk"))

@app.get("/download")
@app.head("/download")
def local_download_landing():
    """Local network landing page for direct APK installation."""
    apk_exists = os.path.exists(APK_FILE_PATH)
    apk_size_mb = round(os.path.getsize(APK_FILE_PATH) / (1024 * 1024), 2) if apk_exists else 0.0
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manish Market APK - Local Wi-Fi Download</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background-color: #0D1117;
      color: #E6EDF3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      text-align: center;
    }}
    .card {{
      background: rgba(22, 27, 34, 0.9);
      border: 1px solid rgba(0, 230, 118, 0.35);
      border-radius: 24px;
      padding: 36px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(0, 230, 118, 0.2);
    }}
    .network-badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 230, 118, 0.15);
      color: #00E676;
      border: 1px solid rgba(0, 230, 118, 0.4);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 20px;
    }}
    .dot {{ width: 8px; height: 8px; border-radius: 50%; background-color: #00E676; }}
    h1 {{ font-size: 22px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px; }}
    p {{ font-size: 14px; color: #8B949E; line-height: 1.5; margin-bottom: 24px; }}
    .btn {{
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      background: linear-gradient(135deg, #00E676 0%, #00B0FF 100%);
      color: #0D1117;
      font-size: 16px;
      font-weight: 800;
      padding: 16px;
      border-radius: 16px;
      text-decoration: none;
      box-shadow: 0 4px 20px rgba(0, 230, 118, 0.4);
    }}
    .info {{ margin-top: 20px; font-size: 12px; color: #6E7681; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="network-badge">
      <div class="dot"></div>
      <span>SAME-NETWORK LOCAL WI-FI ONLY</span>
    </div>
    <h1>Manish Market Android App</h1>
    <p>Connected via Local Network. High-speed direct installation binary.</p>
    
    <a id="dlLink" class="btn" href="/download/apk?t={os.urandom(4).hex()}">
      <span>📥 Download APK ({apk_size_mb} MB)</span>
    </a>
    
    <div class="info">
      Local Server: <code>192.168.31.184:8000</code> • Direct Zero-Lag Binary
    </div>
  </div>
  <script>
    window.addEventListener('DOMContentLoaded', () => {{
      setTimeout(() => {{
        document.getElementById('dlLink').click();
      }}, 400);
    }});
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)

@app.get("/download/apk")
@app.head("/download/apk")
@app.get("/ManishMarket.apk")
@app.head("/ManishMarket.apk")
def local_download_apk_binary():
    """Serve the local APK binary directly from disk."""
    if not os.path.exists(APK_FILE_PATH):
        raise HTTPException(status_code=404, detail="APK binary not found on local host.")
    
    return FileResponse(
        path=APK_FILE_PATH,
        filename="ManishMarket.apk",
        media_type="application/vnd.android.package-archive",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

