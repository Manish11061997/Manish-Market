"""
full_system_test_suite.py
Automated End-to-End Test Suite for Delightful-Davinci Financial Platform
"""

import sys
import time
import json
import requests
import websocket
from typing import Dict, Any, List

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/market-stream"

results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "details": []
}

def log_test(name: str, passed: bool, latency_ms: float, message: str = ""):
    results["total"] += 1
    if passed:
        results["passed"] += 1
        print(f"  ✅ [PASS] {name:<55} ({latency_ms:.1f}ms) {message}")
    else:
        results["failed"] += 1
        print(f"  ❌ [FAIL] {name:<55} ({latency_ms:.1f}ms) {message}")
    results["details"].append({
        "name": name,
        "passed": passed,
        "latency_ms": latency_ms,
        "message": message
    })

def test_rest_endpoint(name: str, url: str, method: str = "GET", payload: dict = None, expected_keys: list = None, timeout: float = 8.0):
    t0 = time.time()
    try:
        if method == "GET":
            res = requests.get(url, timeout=timeout)
        else:
            res = requests.post(url, json=payload, timeout=timeout)
        lat = (time.time() - t0) * 1000.0

        if res.status_code != 200:
            log_test(name, False, lat, f"HTTP {res.status_code}")
            return False, None

        data = res.json()
        if expected_keys:
            missing = [k for k in expected_keys if k not in data]
            if missing:
                log_test(name, False, lat, f"Missing keys: {missing}")
                return False, data

        log_test(name, True, lat, f"200 OK")
        return True, data
    except Exception as e:
        lat = (time.time() - t0) * 1000.0
        log_test(name, False, lat, f"Exception: {str(e)[:45]}")
        return False, None

def run_suite():
    print("=" * 80)
    print("🚀 STARTING FULL END-TO-END PLATFORM TEST SUITE")
    print(f"Target Base URL: {BASE_URL}")
    print(f"Target WebSocket: {WS_URL}")
    print("=" * 80)

    # 1. CORE MARKET DATA APIS
    print("\n--- 1. CORE MARKET DATA & DISCOVERY ENDPOINTS ---")
    test_rest_endpoint("GET /api/market-summary (Indian Market)", f"{BASE_URL}/api/market-summary?market=IN", expected_keys=["indices", "market", "currency", "sentiment"])
    test_rest_endpoint("GET /api/market-summary (US Market)", f"{BASE_URL}/api/market-summary?market=US", expected_keys=["indices", "market", "currency", "sentiment"])
    test_rest_endpoint("GET /api/market-breadth (Indian Market)", f"{BASE_URL}/api/market-breadth?market=IN", expected_keys=["advances", "declines", "adRatio"])
    test_rest_endpoint("GET /api/recommendations (Indian Market)", f"{BASE_URL}/api/recommendations?market=IN", expected_keys=["all", "topBuys", "summary"])
    test_rest_endpoint("GET /api/recommendations (US Market)", f"{BASE_URL}/api/recommendations?market=US", expected_keys=["all", "topBuys", "summary"])
    test_rest_endpoint("GET /api/screener", f"{BASE_URL}/api/screener?sector=ALL&cap=ALL", expected_keys=["results"])

    # 2. STOCK ANALYSIS, CHARTS & LEVEL 2 DEPTH
    print("\n--- 2. SINGLE STOCK ANALYSIS, CHARTS & ORDER DEPTH ---")
    test_rest_endpoint("GET /api/stock/HAL.NS (Indian Defense)", f"{BASE_URL}/api/stock/HAL.NS?market=IN", expected_keys=["symbol", "currentPrice", "technicals"])
    test_rest_endpoint("GET /api/stock/RELIANCE.NS (Indian Bluechip)", f"{BASE_URL}/api/stock/RELIANCE.NS?market=IN", expected_keys=["symbol", "currentPrice"])
    test_rest_endpoint("GET /api/stock/NVDA (US AI Chipmaker)", f"{BASE_URL}/api/stock/NVDA?market=US", expected_keys=["symbol", "currentPrice"])
    test_rest_endpoint("GET /api/stock/HAL.NS/chart (1D adjusted)", f"{BASE_URL}/api/stock/HAL.NS/chart?period=6mo&interval=1d&adjusted=true&market=IN", expected_keys=["data", "symbol"])
    test_rest_endpoint("GET /api/stock/HAL.NS/depth (Level 2 Book)", f"{BASE_URL}/api/stock/HAL.NS/depth", expected_keys=["bids", "asks", "spread"])
    test_rest_endpoint("GET /api/corporate-actions/HAL.NS", f"{BASE_URL}/api/corporate-actions/HAL.NS?market=IN", expected_keys=["symbol", "actions"])

    # 3. CHART READING & FORWARD PREDICTIONS ENGINE
    print("\n--- 3. CHART READING & FORWARD PREDICTIONS ENGINE ---")
    test_rest_endpoint("GET /api/stock/HAL.NS/chart-reading (Indian)", f"{BASE_URL}/api/stock/HAL.NS/chart-reading?market=IN", expected_keys=["bias", "candlestickPatterns", "movingAverages", "pivots", "tradeSuggestion", "forwardPredictions", "chartNarrative"])
    test_rest_endpoint("GET /api/stock/NVDA/chart-reading (US)", f"{BASE_URL}/api/stock/NVDA/chart-reading?market=US", expected_keys=["bias", "candlestickPatterns", "pivots", "forwardPredictions"])

    # 4. QUANTITATIVE PATTERN ENGINE (MULTI-HORIZON)
    print("\n--- 4. QUANTITATIVE PATTERN ENGINE (MULTI-HORIZON) ---")
    test_rest_endpoint("GET /api/analysis/intraday (HAL.NS ORB 15m)", f"{BASE_URL}/api/analysis/intraday?symbol=HAL.NS&orbPeriod=15&market=IN", expected_keys=["signal", "score", "marketRegime", "entryZone", "targets", "stopLoss"])
    test_rest_endpoint("GET /api/analysis/swing (HAL.NS Swing Model)", f"{BASE_URL}/api/analysis/swing?symbol=HAL.NS&market=IN", expected_keys=["signal", "score", "riskReward"])
    test_rest_endpoint("GET /api/analysis/longterm (HAL.NS 3-Yr Moats)", f"{BASE_URL}/api/analysis/longterm?symbol=HAL.NS&market=IN", expected_keys=["signal", "score"])
    test_rest_endpoint("POST /api/analysis/backtest", f"{BASE_URL}/api/analysis/backtest", method="POST", payload=[{"outcome": "WIN", "profit": 500, "r_multiple": 2.5}], expected_keys=["winRate", "profitFactor"])

    # 5. INSTITUTIONAL IPO INTELLIGENCE HUB
    print("\n--- 5. INSTITUTIONAL IPO INTELLIGENCE HUB ---")
    test_rest_endpoint("GET /api/ipo/summary (Indian Market)", f"{BASE_URL}/api/ipo/summary?market=IN", expected_keys=["activeCount", "averageGmpPercent", "totalActiveCapital"])
    test_rest_endpoint("GET /api/ipo/active (Indian Active Bidding)", f"{BASE_URL}/api/ipo/active?market=IN", expected_keys=["ipos"])
    test_rest_endpoint("GET /api/ipo/closed (Indian Closed Bidding)", f"{BASE_URL}/api/ipo/closed?market=IN", expected_keys=["ipos"])
    test_rest_endpoint("GET /api/ipo/upcoming (Indian Pipeline)", f"{BASE_URL}/api/ipo/upcoming?market=IN", expected_keys=["ipos"])
    test_rest_endpoint("GET /api/ipo/listed (Indian Track Record)", f"{BASE_URL}/api/ipo/listed?market=IN", expected_keys=["ipos"])
    test_rest_endpoint("GET /api/ipo/IPO-SYMBIOTEC/details", f"{BASE_URL}/api/ipo/IPO-SYMBIOTEC/details", expected_keys=["companyName", "subscription", "recommendation"])
    test_rest_endpoint("GET /api/ipo/IPO-SKYWAYS/details", f"{BASE_URL}/api/ipo/IPO-SKYWAYS/details", expected_keys=["companyName", "subscription", "recommendation"])
    test_rest_endpoint("GET /api/ipo/CLOSED-GAJA/details", f"{BASE_URL}/api/ipo/CLOSED-GAJA/details", expected_keys=["companyName", "subscription", "recommendation"])

    # 6. DAILY ADVISORY, F&O DERIVATIVES & OMS
    print("\n--- 6. DAILY ADVISORY, F&O DERIVATIVES & OMS ---")
    test_rest_endpoint("GET /api/daily-briefing (Advisory Report)", f"{BASE_URL}/api/daily-briefing?market=IN", expected_keys=["market", "formattedDate", "marketStatus", "topDailyBuys", "topDailySells", "topFnoSetups", "statistics"], timeout=10.0)
    test_rest_endpoint("GET /api/fno-signals (Derivatives)", f"{BASE_URL}/api/fno-signals?market=IN", timeout=10.0)
    test_rest_endpoint("GET /api/paper/portfolio (OMS Paper Portfolio)", f"{BASE_URL}/api/paper/portfolio", expected_keys=["mode", "summary", "positions", "orders"])
    test_rest_endpoint("GET /api/alerts (Price Alerts)", f"{BASE_URL}/api/alerts", expected_keys=["alerts"])

    # 7. WEBSOCKET STREAMING GATEWAY TEST
    print("\n--- 7. HIGH-FREQUENCY WEBSOCKET STREAMING GATEWAY ---")
    t_ws_start = time.time()
    ws_received_ticks = []
    ws_connected = False

    def on_message(ws, msg):
        nonlocal ws_received_ticks
        try:
            payload = json.loads(msg)
            if payload.get("type") == "TICK_STREAM" and "ticks" in payload:
                ws_received_ticks.extend(payload["ticks"])
                if len(ws_received_ticks) >= 3:
                    ws.close()
        except Exception:
            pass

    def on_open(ws):
        nonlocal ws_connected
        ws_connected = True
        # Subscribe to active symbols
        sub_msg = json.dumps({"action": "subscribe", "symbols": ["HAL.NS", "RELIANCE.NS", "NIFTY50"]})
        ws.send(sub_msg)

    try:
        ws_app = websocket.WebSocketApp(WS_URL, on_message=on_message, on_open=on_open)
        ws_app.run_forever(ping_timeout=3)
        ws_lat = (time.time() - t_ws_start) * 1000.0
        if ws_connected and len(ws_received_ticks) > 0:
            log_test("WebSocket Live Market Stream (/ws/market-stream)", True, ws_lat, f"Received {len(ws_received_ticks)} real-time ticks successfully")
        else:
            log_test("WebSocket Live Market Stream (/ws/market-stream)", False, ws_lat, "No ticks received")
    except Exception as e:
        ws_lat = (time.time() - t_ws_start) * 1000.0
        log_test("WebSocket Live Market Stream (/ws/market-stream)", False, ws_lat, f"Error: {e}")

    # SUMMARY REPORT
    print("\n" + "=" * 80)
    print(f"📊 FULL PLATFORM TEST SUMMARY REPORT")
    print(f"Total Tests Executed : {results['total']}")
    print(f"Passed               : {results['passed']} ({(results['passed']/results['total'])*100:.1f}%)")
    print(f"Failed               : {results['failed']}")
    print("=" * 80)

    if results["failed"] == 0:
        print("🎉 ALL SYSTEMS OPERATIONAL: 100% PASS RATE!")
        sys.exit(0)
    else:
        print(f"⚠️ {results['failed']} test(s) failed.")
        sys.exit(1)

if __name__ == "__main__":
    run_suite()
