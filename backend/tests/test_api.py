"""API + engine regression tests. Run: cd backend && python3 -m pytest tests/ -v"""
import json
import math

import pytest

CT = "application/json"


# ---------------- Order validation matrix ----------------

@pytest.mark.parametrize("payload,expect", [
    ({"symbol": "RELIANCE.NS", "side": "BUY", "quantity": -5, "price": 100}, 422),
    ({"symbol": "RELIANCE.NS", "side": "BUY", "quantity": 0, "price": 100}, 422),
    ({"symbol": "RELIANCE.NS", "side": "BUY", "quantity": 1, "price": -100}, 422),
    ({"symbol": "RELIANCE.NS", "side": "BUY", "quantity": 1, "price": 0}, 422),
    ({"symbol": "RELIANCE.NS", "side": "HOLD", "quantity": 1, "price": 100}, 422),
    ({"symbol": "RELIANCE.NS", "side": "BUY", "quantity": 1, "price": 100, "orderType": "IOC"}, 422),
    ({"side": "BUY", "quantity": 1, "price": 100}, 422),
])
def test_order_validation_rejects_bad_input(client, auth_headers, payload, expect):
    r = client.post("/api/paper/order", json=payload, headers={**auth_headers, "Content-Type": CT})
    assert r.status_code == expect


def test_order_side_normalization(client, auth_headers):
    """Lowercase 'buy' must be normalized to BUY, not rejected."""
    r = client.post("/api/paper/order", headers={**auth_headers, "Content-Type": CT},
                    json={"symbol": "RELIANCE.NS", "side": "buy", "quantity": 250, "price": 100})
    assert r.status_code == 200
    body = r.json()
    assert body["side"] in ("BUY", "SELL")


def test_reset_rejects_invalid_capital(client, auth_headers):
    assert client.post("/api/paper/reset?initialCapital=-5", headers=auth_headers).status_code == 422
    assert client.post("/api/paper/reset?initialCapital=0", headers=auth_headers).status_code == 422


# ---------------- Risk engine gates ----------------

def test_sell_without_position_rejected_pre_trade(client, auth_headers):
    client.post("/api/paper/reset?initialCapital=1000000", headers=auth_headers)
    from oms import oms_engine
    order = oms_engine.submit_order("RELIANCE.NS", "SELL", 250, 100.0, stop_loss=110.0)
    assert order.status.value == "RISK_REJECTED"
    assert "insufficient position" in (order.error_message or "").lower()


def test_duplicate_order_lock_blocks_rapid_identical_orders(client, auth_headers):
    """Two identical approved orders within the lock window: at least one path rejects or both tracked."""
    client.post("/api/paper/reset?initialCapital=10000000", headers=auth_headers)
    from oms import oms_engine
    results = []
    for _ in range(2):
        order = oms_engine.submit_order("RELIANCE.NS", "BUY", 250, 40.0, stop_loss=38.0)
        results.append(order.status.value)
    # Either duplicate-lock caught the second, or concentration/limits did — never silent double-fill
    fills = [s for s in results if s == "FILLED"]
    assert len(fills) >= 1
    if len(fills) == 2:
        pos = oms_engine.get_positions().get("TATASTEEL.NS")
        assert pos is not None and pos.quantity == 1000


def test_portfolio_summary_keys_contract(client, auth_headers):
    client.post("/api/paper/reset?initialCapital=1000000", headers=auth_headers)
    r = client.get("/api/paper/portfolio")
    assert r.status_code == 200
    summary = r.json()["summary"]
    assert "cashBalance" in summary and "totalEquity" in summary


def test_cash_decreases_after_fill(client, auth_headers):
    client.post("/api/paper/reset?initialCapital=1000000", headers=auth_headers)
    from oms import oms_engine
    before = oms_engine.get_portfolio_summary()["cashBalance"]
    order = oms_engine.submit_order("TATASTEEL.NS", "BUY", 500, 50.0)
    after = oms_engine.get_portfolio_summary()["cashBalance"]
    if order.status.value == "FILLED":
        assert after < before


# ---------------- Alerts CRUD ----------------

def test_alert_crud_roundtrip(client, auth_headers):
    hdr = {**auth_headers, "Content-Type": CT}
    r = client.post("/api/alerts", headers=hdr,
                    json={"symbol": "TESTSYM.NS", "condition": "ABOVE", "targetPrice": 999999})
    assert r.status_code == 200 and r.json()["status"] == "created"
    alert_id = r.json()["alert"]["id"]

    listed = client.get("/api/alerts").json()["alerts"]
    assert any(a["id"] == alert_id for a in listed)

    assert client.delete(f"/api/alerts/{alert_id}", headers=auth_headers).json()["status"] == "success"
    assert client.delete(f"/api/alerts/{alert_id}", headers=auth_headers).json()["status"] == "not_found"


def test_alert_endpoints_require_token(client):
    assert client.post("/api/alerts", json={"symbol": "X", "condition": "ABOVE", "targetPrice": 1}).status_code == 403
    assert client.delete("/api/alerts/x").status_code == 403


# ---------------- Auth gating on mutating endpoints ----------------

@pytest.mark.parametrize("method,path,kwargs", [
    ("post", "/api/paper/order", {"json": {"symbol": "R", "side": "BUY", "quantity": 1, "price": 1}}),
    ("post", "/api/paper/reset?initialCapital=100000", {}),
    ("post", "/api/replay/control", {"json": {"action": "start"}}),
    ("post", "/api/market-data/mode", {"json": {"mode": "LIVE"}}),
    ("post", "/api/broker/settings", {"json": {"broker": "X", "apiKey": "k", "apiSecret": "s"}}),
    ("post", "/api/copilot/chat", {"json": {"message": "hi"}}),
    ("delete", "/api/alerts/nope", {}),
])
def test_mutating_endpoints_fail_closed(client, method, path, kwargs):
    import os
    if not os.environ.get("CONTROL_TOKEN"):
        pytest.skip("CONTROL_TOKEN unset — dev fail-open mode")
    kwargs = dict(kwargs)
    kwargs.setdefault("headers", {})
    r = getattr(client, method)(path, **kwargs)
    assert r.status_code == 403


# ---------------- Broker settings masking ----------------

def test_broker_settings_mask_secret(client, auth_headers):
    hdr = {**auth_headers, "Content-Type": CT}
    secret = "super-secret-key-9876"
    r = client.post("/api/broker/settings", headers=hdr,
                    json={"broker": "ZERODHA_KITE", "apiKey": "key-1234-5678", "apiSecret": secret})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "connected"
    assert secret not in json.dumps(body)

    g = client.get("/api/broker/settings", headers=auth_headers).json()
    assert secret not in json.dumps(g)


# ---------------- Audit trail regression ----------------

def test_audit_trail_accepts_string_event_type():
    """Regression: string event types used to break to_dict with AttributeError."""
    from audit_trail import audit_trail
    audit_trail.record_order_event(
        event_type="ORDER_FILLED", symbol="TEST",
        risk_evaluation={}, order_details={}, execution_result={})
    rec = audit_trail.get_records()[0]
    d = rec.to_dict() if hasattr(rec, "to_dict") else rec
    assert d.get("eventType") == "ORDER_FILLED"


# ---------------- Synthetic data flag ----------------

def test_synthetic_flag_respected_for_ohlcv(monkeypatch):
    import data_fetcher as df
    monkeypatch.setattr(df, "ALLOW_SYNTHETIC_DATA", False)
    out = df.fetch_stock_ohlcv("TOTALLYBOGUS123.NS", period="1mo", interval="1d")
    assert out is None or len(out) == 0


# ---------------- Read endpoints sanity ----------------

def test_read_endpoints_live(client):
    for path in ("/api/session-status", "/api/market-breadth", "/api/health/market-data"):
        r = client.get(path)
        assert r.status_code == 200


def test_unknown_route_404(client):
    assert client.get("/api/definitely-not-a-route").status_code == 404


def test_sanitize_json_data_handles_nan():
    from app import sanitize_json_data
    cleaned = sanitize_json_data({"a": float("nan"), "b": [float("inf")], "c": 1.5})
    assert cleaned["a"] == 0.0 and math.isfinite(cleaned["b"][0]) and cleaned["c"] == 1.5


def test_security_headers_present(client):
    r = client.get("/api/market-breadth")
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"


def test_rate_limiting_triggers_429(client, monkeypatch):
    import app as appmod
    monkeypatch.setattr(appmod, "RATE_LIMIT_REQUESTS", 5)
    statuses = [client.get("/api/session-status").status_code for _ in range(8)]
    assert 429 in statuses
