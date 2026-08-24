import requests
import json
import time
import math
import websocket
from datetime import datetime

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/market-stream"

class QASuiteResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []

    def record(self, category: str, test_name: str, passed: bool, detail: str = "", response_time_ms: float = 0.0):
        if passed:
            self.passed += 1
            status_str = "PASSED"
        else:
            self.failed += 1
            status_str = "FAILED"
        
        self.tests.append({
            "category": category,
            "name": test_name,
            "status": status_str,
            "detail": detail,
            "responseTimeMs": round(response_time_ms, 2)
        })
        print(f"[{status_str:6s}] [{category:15s}] {test_name} ({response_time_ms:.1f}ms) - {detail}")

results = QASuiteResults()

def run_suite():
    print("==================================================================")
    print("🧪 MANISH MARKET - SENIOR QA PRINCIPAL TEST SUITE EXECUTION")
    print(f"   Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("==================================================================\n")

    # -------------------------------------------------------------------
    # CATEGORY 1: CORE REST ENDPOINTS & REGIONAL MARKETS
    # -------------------------------------------------------------------
    print("--- CATEGORY 1: Core REST Endpoints & Regional Markets ---")
    
    # 1.1 Root Status Endpoint
    t0 = time.time()
    try:
        r = requests.get(f"{BASE_URL}/")
        t1 = time.time()
        d = r.json()
        assert r.status_code == 200 and d.get("status") == "online"
        results.record("REST_CORE", "Root Status Endpoint (/)", True, "Server online and healthy", (t1 - t0)*1000)
    except Exception as e:
        results.record("REST_CORE", "Root Status Endpoint (/)", False, str(e), (time.time() - t0)*1000)

    # 1.2 Market Summary - IN Market
    t0 = time.time()
    try:
        r = requests.get(f"{BASE_URL}/api/market-summary?market=IN")
        t1 = time.time()
        d = r.json()
        assert r.status_code == 200 and "NIFTY50" in d.get("indices", {})
        results.record("REST_CORE", "Market Summary (IN)", True, f"NIFTY 50: {d['indices']['NIFTY50']['price']}", (t1 - t0)*1000)
    except Exception as e:
        results.record("REST_CORE", "Market Summary (IN)", False, str(e), (time.time() - t0)*1000)

    # 1.3 Market Summary - US Market
    t0 = time.time()
    try:
        r = requests.get(f"{BASE_URL}/api/market-summary?market=US")
        t1 = time.time()
        d = r.json()
        assert r.status_code == 200 and "SP500" in d.get("indices", {})
        results.record("REST_CORE", "Market Summary (US)", True, f"S&P 500: {d['indices']['SP500']['price']}", (t1 - t0)*1000)
    except Exception as e:
        results.record("REST_CORE", "Market Summary (US)", False, str(e), (time.time() - t0)*1000)

    # 1.4 Recommendations - IN Market
    t0 = time.time()
    try:
        r = requests.get(f"{BASE_URL}/api/recommendations?market=IN")
        t1 = time.time()
        d = r.json()
        assert r.status_code == 200 and len(d.get("all", [])) > 0
        first = d["all"][0]
        assert "targetTimeframe" in first or "tradePlan" in first
        results.record("REST_CORE", "Recommendations (IN)", True, f"Total Analyzed: {len(d['all'])} stocks", (t1 - t0)*1000)
    except Exception as e:
        results.record("REST_CORE", "Recommendations (IN)", False, str(e), (time.time() - t0)*1000)

    # 1.5 Recommendations - US Market
    t0 = time.time()
    try:
        r = requests.get(f"{BASE_URL}/api/recommendations?market=US")
        t1 = time.time()
        d = r.json()
        assert r.status_code == 200 and len(d.get("all", [])) > 0
        results.record("REST_CORE", "Recommendations (US)", True, f"Total Analyzed: {len(d['all'])} stocks", (t1 - t0)*1000)
    except Exception as e:
        results.record("REST_CORE", "Recommendations (US)", False, str(e), (time.time() - t0)*1000)

    # -------------------------------------------------------------------
    # CATEGORY 2: MULTI-HORIZON AI ANALYSIS ENGINES
    # -------------------------------------------------------------------
    print("\n--- CATEGORY 2: Multi-Horizon AI Analysis Engines ---")
    
    test_symbols = [("RELIANCE.NS", "India Heavyweight"), ("VIDYAWIRES.NS", "India Smallcap"), ("NVDA", "US Tech Leader")]

    for sym, desc in test_symbols:
        # Intraday Engine
        t0 = time.time()
        try:
            r = requests.get(f"{BASE_URL}/api/analysis/intraday?symbol={sym}&orbPeriod=15")
            t1 = time.time()
            d = r.json()
            assert r.status_code == 200
            assert d.get("analysisType") == "INTRADAY"
            assert "suggestedEntryPoint" in d
            assert "suggestedExitPoints" in d
            assert "targetTimeframes" in d
            assert len(d["targetTimeframes"]) == 3
            results.record("ENGINE_INTRADAY", f"Intraday Analysis ({sym})", True, f"Signal: {d['signal']} | Score: {d['score']}", (t1 - t0)*1000)
        except Exception as e:
            results.record("ENGINE_INTRADAY", f"Intraday Analysis ({sym})", False, str(e), (time.time() - t0)*1000)

        # Swing Engine
        t0 = time.time()
        try:
            r = requests.get(f"{BASE_URL}/api/analysis/swing?symbol={sym}")
            t1 = time.time()
            d = r.json()
            assert r.status_code == 200
            assert d.get("analysisType") == "SWING"
            assert "suggestedEntryPoint" in d
            assert "suggestedExitPoints" in d
            assert "targetTimeframes" in d
            results.record("ENGINE_SWING", f"Swing Analysis ({sym})", True, f"Signal: {d['signal']} | Score: {d['score']}", (t1 - t0)*1000)
        except Exception as e:
            results.record("ENGINE_SWING", f"Swing Analysis ({sym})", False, str(e), (time.time() - t0)*1000)

        # Long-Term Engine
        t0 = time.time()
        try:
            r = requests.get(f"{BASE_URL}/api/analysis/longterm?symbol={sym}")
            t1 = time.time()
            d = r.json()
            assert r.status_code == 200
            assert d.get("analysisType") == "LONG_TERM"
            assert "suggestedEntryPoint" in d
            assert "suggestedExitPoints" in d
            assert "targetTimeframes" in d
            results.record("ENGINE_LONGTERM", f"Long-Term Analysis ({sym})", True, f"Signal: {d['signal']} | Score: {d['score']}", (t1 - t0)*1000)
        except Exception as e:
            results.record("ENGINE_LONGTERM", f"Long-Term Analysis ({sym})", False, str(e), (time.time() - t0)*1000)

    # -------------------------------------------------------------------
    # CATEGORY 3: PRICE ACCURACY & CALCULATION SANITY AUDIT
    # -------------------------------------------------------------------
    print("\n--- CATEGORY 3: Price Accuracy & Calculation Sanity ---")
    
    price_checks = [
        ("RELIANCE.NS", 1000.0, 4000.0),
        ("VIDYAWIRES.NS", 50.0, 200.0),
        ("NVDA", 100.0, 400.0),
        ("AAPL", 150.0, 500.0)
    ]

    for sym, min_p, max_p in price_checks:
        t0 = time.time()
        try:
            r = requests.get(f"{BASE_URL}/api/stock/{sym}")
            t1 = time.time()
            d = r.json()
            assert r.status_code == 200
            price = d.get("currentPrice", 0.0)
            assert min_p <= price <= max_p, f"Price {price} out of expected range [{min_p}, {max_p}]"
            
            # Check Risk/Reward Plan sanity
            tp1 = d.get("tradePlan", {}).get("target1", 0.0)
            sl = d.get("tradePlan", {}).get("stopLoss", 0.0)
            assert tp1 > 0 and sl > 0, "Target or Stop Loss is invalid/zero"
            results.record("CALC_SANITY", f"Stock Price Accuracy ({sym})", True, f"Real Price: ₹/${price} (Valid Range)", (t1 - t0)*1000)
        except Exception as e:
            results.record("CALC_SANITY", f"Stock Price Accuracy ({sym})", False, str(e), (time.time() - t0)*1000)

    # -------------------------------------------------------------------
    # CATEGORY 4: FUZZY SEARCH & TICKER RESOLUTION
    # -------------------------------------------------------------------
    print("\n--- CATEGORY 4: Fuzzy Search & Ticker Resolution ---")
    
    queries = [
        ("tcs", "TCS.NS"),
        ("infy", "INFY.NS"),
        ("sbin", "SBIN.NS"),
        ("vidya", "VIDYAWIRES.NS"),
        ("apple", "AAPL"),
        ("nifty", "NIFTY50")
    ]

    for q, expected in queries:
        t0 = time.time()
        try:
            r = requests.get(f"{BASE_URL}/api/analysis/intraday?symbol={q}")
            t1 = time.time()
            d = r.json()
            assert r.status_code == 200
            res_sym = d.get("symbol", "")
            assert res_sym == expected or (q == "nifty" and res_sym in ["^NSEI", "NIFTY50"]) or res_sym.startswith(q.upper())
            results.record("FUZZY_SEARCH", f"Search Query '{q}'", True, f"Resolved -> {res_sym}", (t1 - t0)*1000)
        except Exception as e:
            results.record("FUZZY_SEARCH", f"Search Query '{q}'", False, str(e), (time.time() - t0)*1000)

    # -------------------------------------------------------------------
    # CATEGORY 5: EDGE CASES, MALICIOUS INPUTS & BOUNDARY STRESS
    # -------------------------------------------------------------------
    print("\n--- CATEGORY 5: Edge Cases, Malicious Inputs & Boundary Stress ---")

    edge_cases = [
        ("INVALID_TICKER_99999", "Non-existent ticker"),
        ("!@#$%^&*()", "Special characters"),
        ("SELECT * FROM stocks;", "SQL Injection attempt"),
        ("<script>alert(1)</script>", "XSS Payload attempt"),
        ("A" * 250, "Extremely long symbol string")
    ]

    for ec_input, desc in edge_cases:
        t0 = time.time()
        try:
            r = requests.get(f"{BASE_URL}/api/analysis/intraday?symbol={requests.utils.quote(ec_input)}")
            t1 = time.time()
            # Must return 200 with fallback or 400 clean error, NEVER 500
            assert r.status_code in [200, 400, 404], f"Server returned status {r.status_code}"
            results.record("EDGE_CASE", f"Input: {desc}", True, f"Graceful Response Code: {r.status_code}", (t1 - t0)*1000)
        except Exception as e:
            results.record("EDGE_CASE", f"Input: {desc}", False, str(e), (time.time() - t0)*1000)

    # Screener Filter Boundaries
    t0 = time.time()
    try:
        r = requests.get(f"{BASE_URL}/api/screener?maxPe=0.1&minRsi=95")
        t1 = time.time()
        d = r.json()
        assert r.status_code == 200
        results.record("EDGE_CASE", "Screener Extreme Boundaries (RSI>95, PE<0.1)", True, f"Returned {d.get('count')} items cleanly", (t1 - t0)*1000)
    except Exception as e:
        results.record("EDGE_CASE", "Screener Extreme Boundaries", False, str(e), (time.time() - t0)*1000)

    # -------------------------------------------------------------------
    # CATEGORY 6: WEBSOCKET REAL-TIME TICK STREAM AUDIT
    # -------------------------------------------------------------------
    print("\n--- CATEGORY 6: WebSocket Real-Time Tick Stream Audit ---")
    t0 = time.time()
    try:
        ws = websocket.create_connection(WS_URL, timeout=10)
        ws.send(json.dumps({"action": "ping"}))
        msg = ws.recv()
        t1 = time.time()
        payload = json.loads(msg)
        assert payload.get("type") in ["TICK_STREAM", "PONG", "SUBSCRIPTION_CONFIRMED"]
        if payload.get("type") == "PONG":
            ws.close()
            results.record("WEBSOCKET", "Native Tick Stream (ws://)", True, "PONG received immediately", (t1 - t0)*1000)
        else:
            assert "ticks" in payload and len(payload["ticks"]) > 0
            ws.close()
            results.record("WEBSOCKET", "Native Tick Stream (ws://)", True, f"Received {len(payload['ticks'])} live ticks", (t1 - t0)*1000)
    except Exception as e:
        results.record("WEBSOCKET", "Native Tick Stream (ws://)", False, str(e), (time.time() - t0)*1000)

    # -------------------------------------------------------------------
    # FINAL SUMMARY
    # -------------------------------------------------------------------
    total = results.passed + results.failed
    pass_pct = (results.passed / total) * 100.0 if total > 0 else 0.0

    print("\n==================================================================")
    print(f"📊 QA AUDIT COMPLETE: {results.passed} / {total} PASSED ({pass_pct:.1f}%)")
    print("==================================================================")

    with open("qa_suite_output.json", "w") as f:
        json.dump({
            "totalTests": total,
            "passed": results.passed,
            "failed": results.failed,
            "passPercentage": round(pass_pct, 1),
            "tests": results.tests
        }, f, indent=2)

if __name__ == "__main__":
    run_suite()
