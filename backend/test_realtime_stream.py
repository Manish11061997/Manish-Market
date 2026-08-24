import asyncio
import websockets
import json
import requests
import sys
import pytest

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/market-stream"

def _is_server_online():
    try:
        r = requests.get(f"{BASE_URL}/", timeout=0.3)
        return r.status_code == 200
    except Exception:
        return False

def test_rest_endpoints():
    if not _is_server_online():
        pytest.skip("Live server not running at http://localhost:8000 (integration test skipped in unit test run)")
    print("=== Testing REST Real-Time Endpoints ===")
    
    # 1. Session Status
    r = requests.get(f"{BASE_URL}/api/session-status?market=IN")
    assert r.status_code == 200, f"Session status failed: {r.status_code}"
    session_in = r.json()
    print(f"✓ Session Status IN: {session_in}")
    assert "status" in session_in and "label" in session_in

    r = requests.get(f"{BASE_URL}/api/session-status?market=US")
    assert r.status_code == 200, f"Session status US failed: {r.status_code}"
    session_us = r.json()
    print(f"✓ Session Status US: {session_us}")
    assert "status" in session_us

    # 2. Multi-Timeframe Chart Data
    for period, interval in [("1d", "1m"), ("5d", "5m"), ("1mo", "15m"), ("6mo", "1d")]:
        r = requests.get(f"{BASE_URL}/api/stock/RELIANCE.NS/chart?period={period}&interval={interval}")
        assert r.status_code == 200, f"Chart endpoint failed for {period}/{interval}: {r.status_code}"
        data = r.json()
        assert "data" in data and len(data["data"]) > 0
        first_candle = data["data"][0]
        assert all(k in first_candle for k in ["date", "open", "high", "low", "close", "volume"])
        print(f"✓ Chart ({period}/{interval}): {len(data['data'])} candles loaded, sample: {first_candle['date']} C:{first_candle['close']}")

    # 3. Price Alerts CRUD
    alert_payload = {
        "symbol": "TCS.NS",
        "condition": "ABOVE",
        "targetPrice": 4500.0
    }
    r = requests.post(f"{BASE_URL}/api/alerts", json=alert_payload)
    assert r.status_code == 200, f"Create alert failed: {r.text}"
    created_alert = r.json()
    alert_id = created_alert["alert"]["id"]
    print(f"✓ Alert Created: ID {alert_id} for {alert_payload['symbol']}")

    r = requests.get(f"{BASE_URL}/api/alerts")
    assert r.status_code == 200
    alerts_list = r.json().get("alerts", [])
    assert any(a["id"] == alert_id for a in alerts_list)
    print(f"✓ Alerts List Verified: {len(alerts_list)} active alerts")

    r = requests.delete(f"{BASE_URL}/api/alerts/{alert_id}")
    assert r.status_code == 200
    print(f"✓ Alert Deleted: ID {alert_id}")

def test_websocket_streaming():
    if not _is_server_online():
        pytest.skip("Live server not running at http://localhost:8000 (integration test skipped in unit test run)")
    asyncio.run(_async_test_websocket_streaming())

async def _async_test_websocket_streaming():
    print("\n=== Testing WebSocket Real-Time Tick Stream & Dynamic Subscriptions ===")
    async with websockets.connect(WS_URL) as ws:
        # Initial greeting / connection
        print("✓ Connected to WebSocket endpoint:", WS_URL)

        # Send subscription request
        sub_msg = {
            "action": "subscribe",
            "symbols": ["RELIANCE.NS", "NVDA", "^NSEI"]
        }
        await ws.send(json.dumps(sub_msg))
        print("✓ Sent dynamic subscription request for:", sub_msg["symbols"])

        # Receive confirmation or real-time tick stream message
        msg_raw = await asyncio.wait_for(ws.recv(), timeout=10.0)
        msg = json.loads(msg_raw)
        print(f"✓ Received WebSocket Message Type: {msg.get('type')}")
        if msg.get("type") == "SUBSCRIPTION_CONFIRMED":
            print(f"✓ Confirmed Subscription: {msg.get('symbols')}")
            msg_raw = await asyncio.wait_for(ws.recv(), timeout=10.0)
            msg = json.loads(msg_raw)
            print(f"✓ Received Next WebSocket Message Type: {msg.get('type')}")
        assert msg.get("type") == "TICK_STREAM", f"Expected TICK_STREAM, got {msg.get('type')}"
        assert "ticks" in msg, "Expected ticks map in payload"
        assert "session" in msg, "Expected session state in payload"
        
        ticks = msg["ticks"]
        print(f"✓ Real-time Ticks received for {len(ticks)} instruments:")
        for sym, tick in list(ticks.items())[:5]:
            print(f"   • [{sym}]: LTP={tick.get('price')} Chg={tick.get('change')} ({tick.get('changePercent')}%) Vol={tick.get('volume')} Source={tick.get('source')} Status={tick.get('status')}")
            assert all(k in tick for k in ["price", "change", "changePercent", "open", "high", "low", "volume", "status"])

        # Send Ping heartbeat
        await ws.send(json.dumps({"action": "ping"}))
        pong_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        pong = json.loads(pong_raw)
        assert pong.get("type") == "PONG", f"Expected PONG, got {pong}"
        print("✓ Ping/Pong Heartbeat verified successfully")

        # Send unsubscribe request
        unsub_msg = {
            "action": "unsubscribe",
            "symbols": ["NVDA"]
        }
        await ws.send(json.dumps(unsub_msg))
        print("✓ Sent unsubscribe request for NVDA")

    print("\n🎉 ALL REAL-TIME STREAMING TESTS PASSED 100%!")

if __name__ == "__main__":
    test_rest_endpoints()
    test_websocket_streaming()
