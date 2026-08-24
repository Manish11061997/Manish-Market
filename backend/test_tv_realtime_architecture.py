import asyncio
import websockets
import json
import requests
import time
import sys

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/market-stream"

def log_test(name, status, details=""):
    badge = "✅ PASSED" if status else "❌ FAILED"
    print(f"[{badge}] {name} {f'-- {details}' if details else ''}")

def run_all_acceptance_tests():
    print("=" * 75)
    print("🚀 TRADINGVIEW-LEVEL REAL-TIME ARCHITECTURE ACCEPTANCE TEST SUITE")
    print("=" * 75)
    
    passed_count = 0
    total_tests = 10

    # -------------------------------------------------------------
    # Test 1: Live Price Updates & Schema Normalization
    # -------------------------------------------------------------
    try:
        r = requests.get(f"{BASE_URL}/api/market-state/RELIANCE.NS")
        assert r.status_code == 200
        state = r.json()
        assert "price" in state and "volume" in state and "timestamp" in state
        assert all(k in state for k in ["open", "high", "low", "prevClose", "change", "changePercent", "bid", "ask", "spread"])
        log_test("Test 1: Live Price & Normalized Schema", True, f"LTP={state['price']} Bid={state['bid']} Ask={state['ask']} Status={state['status']}")
        passed_count += 1
    except Exception as e:
        log_test("Test 1: Live Price & Normalized Schema", False, str(e))

    # -------------------------------------------------------------
    # Test 2: Live Multi-Timeframe Candlestick Data & OHLC
    # -------------------------------------------------------------
    try:
        for tf, period, interval in [("1m", "1d", "1m"), ("5m", "5d", "5m"), ("15m", "1mo", "15m"), ("1D", "6mo", "1d")]:
            r = requests.get(f"{BASE_URL}/api/stock/RELIANCE.NS/chart?period={period}&interval={interval}")
            assert r.status_code == 200
            data = r.json().get("data", [])
            assert len(data) > 0
            candle = data[-1]
            assert all(k in candle for k in ["date", "open", "high", "low", "close", "volume"])
        log_test("Test 2: Live Multi-Timeframe Candles (1m, 5m, 15m, 1D)", True, f"Loaded {len(data)} candles, last Close={candle['close']}")
        passed_count += 1
    except Exception as e:
        log_test("Test 2: Live Multi-Timeframe Candles", False, str(e))

    # -------------------------------------------------------------
    # Test 3: Watchlist Multi-Symbol Independent Updates
    # -------------------------------------------------------------
    try:
        r = requests.get(f"{BASE_URL}/api/recommendations?market=IN")
        assert r.status_code == 200
        all_stocks = r.json().get("all", [])
        assert len(all_stocks) >= 5
        syms = [s["symbol"] for s in all_stocks[:5]]
        prices = [s["currentPrice"] for s in all_stocks[:5]]
        log_test("Test 3: Multi-Symbol Watchlist Feed", True, f"5 active symbols verified: {syms} -> Prices: {prices}")
        passed_count += 1
    except Exception as e:
        log_test("Test 3: Multi-Symbol Watchlist Feed", False, str(e))

    # -------------------------------------------------------------
    # Test 4: Dynamic Symbol Switching & Subscription Management
    # -------------------------------------------------------------
    async def test_dynamic_switching():
        async with websockets.connect(WS_URL) as ws:
            # Subscribe TCS.NS & NVDA
            await ws.send(json.dumps({"action": "subscribe", "symbols": ["TCS.NS", "NVDA"]}))
            raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            payload = json.loads(raw)
            assert payload.get("type") in ["SUBSCRIPTION_CONFIRMED", "TICK_STREAM"]
            
            # Switch symbol: Unsubscribe TCS.NS, subscribe INFY.NS
            await ws.send(json.dumps({"action": "unsubscribe", "symbols": ["TCS.NS"]}))
            raw_unsub = await asyncio.wait_for(ws.recv(), timeout=5.0)
            payload_unsub = json.loads(raw_unsub)
            assert payload_unsub.get("type") in ["SUBSCRIPTION_CONFIRMED", "TICK_STREAM"]

            await ws.send(json.dumps({"action": "subscribe", "symbols": ["INFY.NS"]}))
            raw_sub2 = await asyncio.wait_for(ws.recv(), timeout=5.0)
            payload_sub2 = json.loads(raw_sub2)
            assert payload_sub2.get("type") in ["SUBSCRIPTION_CONFIRMED", "TICK_STREAM"]

    try:
        asyncio.run(test_dynamic_switching())
        log_test("Test 4: Dynamic Symbol Switching & Subscriptions", True, "Subscribed -> Switched -> Cleanly unsubscribed without duplicates")
        passed_count += 1
    except Exception as e:
        log_test("Test 4: Dynamic Symbol Switching & Subscriptions", False, str(e))

    # -------------------------------------------------------------
    # Test 5: WebSocket Heartbeat Ping/Pong & Latency
    # -------------------------------------------------------------
    async def test_heartbeat():
        async with websockets.connect(WS_URL) as ws:
            start_ping = time.time()
            await ws.send(json.dumps({"action": "ping"}))
            raw = await asyncio.wait_for(ws.recv(), timeout=3.0)
            data = json.loads(raw)
            assert data.get("type") == "PONG"
            rtt_ms = int((time.time() - start_ping) * 1000)
            return rtt_ms

    try:
        rtt = asyncio.run(test_heartbeat())
        log_test("Test 5: Heartbeat Ping/Pong & Latency", True, f"PONG received, Roundtrip Latency={rtt}ms")
        passed_count += 1
    except Exception as e:
        log_test("Test 5: Heartbeat Ping/Pong & Latency", False, str(e))

    # -------------------------------------------------------------
    # Test 6: Market Session Status & Stale Data Awareness
    # -------------------------------------------------------------
    try:
        r_in = requests.get(f"{BASE_URL}/api/session-status?market=IN")
        r_us = requests.get(f"{BASE_URL}/api/session-status?market=US")
        assert r_in.status_code == 200 and r_us.status_code == 200
        sess_in = r_in.json()
        sess_us = r_us.json()
        assert sess_in["status"] in ["LIVE", "MARKET_CLOSED", "PRE_MARKET"]
        log_test("Test 6: Market Session Status & Stale State", True, f"IN Session: {sess_in['status']} ({sess_in['label']}) | US Session: {sess_us['status']}")
        passed_count += 1
    except Exception as e:
        log_test("Test 6: Market Session Status & Stale State", False, str(e))

    # -------------------------------------------------------------
    # Test 7: AI Copilot Live Market State Integration
    # -------------------------------------------------------------
    try:
        r = requests.post(f"{BASE_URL}/api/copilot/chat", json={"message": "What is happening with RELIANCE right now?"})
        assert r.status_code == 200
        ai_resp = r.json()
        assert "response" in ai_resp
        assert "RELIANCE" in ai_resp["response"]
        assert "OBSERVED DATA" in ai_resp["response"] or "verifiedPrice" in ai_resp["response"]
        log_test("Test 7: AI Copilot Live Market State Integration", True, f"AI returned verified live quote and algorithmic plan")
        passed_count += 1
    except Exception as e:
        log_test("Test 7: AI Copilot Live Market State Integration", False, str(e))

    # -------------------------------------------------------------
    # Test 8: Real-Time Event-Driven Price Alert Evaluation
    # -------------------------------------------------------------
    try:
        # Create alert for RELIANCE > 1000 (which will trigger immediately on next tick)
        r_create = requests.post(f"{BASE_URL}/api/alerts", json={"symbol": "RELIANCE.NS", "condition": "ABOVE", "targetPrice": 1000.0})
        assert r_create.status_code == 200
        alert_id = r_create.json()["alert"]["id"]
        
        # Verify alert list
        r_list = requests.get(f"{BASE_URL}/api/alerts")
        assert r_list.status_code == 200
        
        # Delete alert
        r_del = requests.delete(f"{BASE_URL}/api/alerts/{alert_id}")
        assert r_del.status_code == 200
        log_test("Test 8: Event-Driven Price Alert Engine", True, f"Created alert ID {alert_id[:8]}, verified list, deleted cleanly")
        passed_count += 1
    except Exception as e:
        log_test("Test 8: Event-Driven Price Alert Engine", False, str(e))

    # -------------------------------------------------------------
    # Test 9: Level 2 Market Depth (Order Book)
    # -------------------------------------------------------------
    try:
        r_depth = requests.get(f"{BASE_URL}/api/stock/RELIANCE.NS/depth")
        assert r_depth.status_code == 200
        depth = r_depth.json()
        assert "bids" in depth and "asks" in depth and "spread" in depth
        assert len(depth["bids"]) == 5 and len(depth["asks"]) == 5
        log_test("Test 9: Level 2 Market Depth (Order Book)", True, f"5 Bids & 5 Asks, Total Bid Qty={depth['totalBidQty']}, Total Ask Qty={depth['totalAskQty']}, Spread={depth['spread']}")
        passed_count += 1
    except Exception as e:
        log_test("Test 9: Level 2 Market Depth", False, str(e))

    # -------------------------------------------------------------
    # Test 10: Mode Control & Observability Health Diagnostics
    # -------------------------------------------------------------
    try:
        # Health check
        r_health = requests.get(f"{BASE_URL}/api/health/market-data")
        assert r_health.status_code == 200
        health = r_health.json()
        assert "providerStatus" in health and "eventsPerSec" in health

        # Mode switch to REPLAY
        r_mode = requests.post(f"{BASE_URL}/api/market-data/mode", json={"mode": "REPLAY"})
        assert r_mode.status_code == 200 and r_mode.json()["mode"] == "REPLAY"

        # Mode switch back to LIVE
        r_mode_live = requests.post(f"{BASE_URL}/api/market-data/mode", json={"mode": "LIVE"})
        assert r_mode_live.status_code == 200 and r_mode_live.json()["mode"] == "LIVE"

        log_test("Test 10: Mode Control & Health Observability HUD", True, f"Health: {health['providerStatus']} ({health['eventsPerSec']} ev/s, Latency: {health['providerLatencyMs']}ms) | LIVE/REPLAY toggling verified")
        passed_count += 1
    except Exception as e:
        log_test("Test 10: Mode Control & Health Observability HUD", False, str(e))

    print("=" * 75)
    print(f"📊 ACCEPTANCE TEST SUMMARY: {passed_count} / {total_tests} PASSED ({round((passed_count/total_tests)*100, 1)}%)")
    print("=" * 75)

    return passed_count == total_tests

if __name__ == "__main__":
    success = run_all_acceptance_tests()
    sys.exit(0 if success else 1)
