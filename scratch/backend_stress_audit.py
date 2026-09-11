import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"
print(f"Starting Backend Stress Audit against {BASE_URL}...\n")

issues = []

def test_endpoint(method, path, params=None, json_data=None, expected_statuses=(200,), description=""):
    url = f"{BASE_URL}{path}"
    try:
        t0 = time.time()
        if method == "GET":
            res = requests.get(url, params=params, timeout=5.0)
        elif method == "POST":
            res = requests.post(url, json=json_data, timeout=5.0)
        elif method == "DELETE":
            res = requests.delete(url, params=params, timeout=5.0)
        latency = (time.time() - t0) * 1000

        if res.status_code not in expected_statuses:
            issue = {
                "severity": "High" if res.status_code >= 500 else "Medium",
                "endpoint": path,
                "status": res.status_code,
                "latency_ms": round(latency, 1),
                "description": description,
                "response": res.text[:200]
            }
            issues.append(issue)
            print(f"[FAIL] {method} {path} -> {res.status_code} ({latency:.1f}ms) | {description}")
        else:
            print(f"[PASS] {method} {path} -> {res.status_code} ({latency:.1f}ms) | {description}")
            # Verify JSON response validity
            try:
                data = res.json()
                # Check for NaN / Infinity in JSON (can crash clients)
                txt = res.text
                if 'NaN' in txt or 'Infinity' in txt or '-Infinity' in txt:
                    issues.append({
                        "severity": "High",
                        "endpoint": path,
                        "status": res.status_code,
                        "description": f"Contains non-standard JSON tokens (NaN/Infinity): {description}",
                        "response": txt[:200]
                    })
                    print(f"  [BUG] NaN or Infinity detected in response body!")
            except Exception:
                pass
    except Exception as e:
        issues.append({
            "severity": "Critical",
            "endpoint": path,
            "status": "TIMEOUT_OR_CRASH",
            "description": f"Request exception: {str(e)}",
            "response": str(e)
        })
        print(f"[CRASH] {method} {path} -> Exception: {e}")

# 1. Health & Status Endpoints
test_endpoint("GET", "/health", description="Basic health check")
test_endpoint("GET", "/api/health", description="API health check")
test_endpoint("GET", "/api/health/market-data", description="Market data pipeline health")
test_endpoint("GET", "/api/session-status", description="Market session status")
test_endpoint("GET", "/api/market-breadth", description="Market breadth statistics")

# 2. Market Overview & Summary
test_endpoint("GET", "/api/market-summary", description="Market summary default")
test_endpoint("GET", "/api/market-summary", params={"market": "US"}, description="US Market summary")
test_endpoint("GET", "/api/market/overview", description="Market overview default")
test_endpoint("GET", "/api/recommendations", description="AI recommendations")

# 3. Search Endpoints
test_endpoint("GET", "/api/search", params={"q": "RELIANCE"}, description="Search RELIANCE")
test_endpoint("GET", "/api/search", params={"q": ""}, description="Empty search query")
test_endpoint("GET", "/api/search", params={"q": "!@#$%^&*()"}, description="Special characters in search")
test_endpoint("GET", "/api/search", params={"q": "NONEXISTENT_TICKER_99999"}, description="Non-existent ticker search")

# 4. Stock Details & Chart Data
test_endpoint("GET", "/api/stock/RELIANCE.NS", description="RELIANCE.NS stock detail")
test_endpoint("GET", "/api/stock/NVDA", params={"market": "US"}, description="NVDA US stock detail")
test_endpoint("GET", "/api/stock/INVALID_STOCK_XYZ", expected_statuses=(200, 404, 503), description="Invalid stock detail")
test_endpoint("GET", "/api/stock/RELIANCE.NS/chart", description="RELIANCE.NS 5y chart")
test_endpoint("GET", "/api/stock/RELIANCE.NS/chart", params={"interval": "1m", "period": "1d"}, description="RELIANCE.NS 1m intraday chart")
test_endpoint("GET", "/api/stock/RELIANCE.NS/chart", params={"interval": "1wk", "period": "10y"}, description="RELIANCE.NS 10y weekly chart")
test_endpoint("GET", "/api/stock/RELIANCE.NS/depth", description="Market depth Level 2")
test_endpoint("GET", "/api/stock/RELIANCE.NS/chart-reading", description="Automated chart pattern reading")
test_endpoint("GET", "/api/stock/RELIANCE.NS/financials", description="Fundamental financials")
test_endpoint("GET", "/api/stock/RELIANCE.NS/delivery", description="Delivery percentage metrics")
test_endpoint("GET", "/api/stock/RELIANCE.NS/circuit-limits", description="Circuit limits")

# 5. F&O & Option Chain
test_endpoint("GET", "/api/fno/option-chain", params={"symbol": "NIFTY"}, description="NIFTY option chain")
test_endpoint("GET", "/api/fno/option-chain", params={"symbol": "BANKNIFTY"}, description="BANKNIFTY option chain")
test_endpoint("GET", "/api/fno/option-chain", params={"symbol": "RELIANCE"}, description="Stock option chain RELIANCE")
test_endpoint("GET", "/api/fno/option-chain", params={"symbol": "INVALID_FNO"}, expected_statuses=(200, 404, 503), description="Invalid FNO option chain")
test_endpoint("GET", "/api/fno-signals", description="F&O actionable signals")

# 6. Screener & Backtester
test_endpoint("GET", "/api/screener", description="Default screener")
test_endpoint("GET", "/api/screener", params={"market": "US"}, description="US Screener")
test_endpoint("GET", "/api/strategies/library", description="Strategy library listing")
test_endpoint("GET", "/api/backtest", params={"symbol": "RELIANCE.NS", "strategy": "EMA_CROSSOVER", "period": "1y"}, description="Run EMA Backtest")
test_endpoint("GET", "/api/backtest", params={"symbol": "INVALID", "strategy": "NONEXISTENT", "period": "invalid"}, expected_statuses=(200, 400, 404, 422, 500), description="Backtest with invalid parameters")

# 7. Paper Trading
test_endpoint("GET", "/api/paper/portfolio", description="Get paper portfolio")
test_endpoint("POST", "/api/paper/order", json_data={
    "symbol": "RELIANCE.NS",
    "side": "BUY",
    "order_type": "MARKET",
    "quantity": 1,
    "market": "IN"
}, description="Execute Market BUY paper order")

test_endpoint("POST", "/api/paper/order", json_data={
    "symbol": "RELIANCE.NS",
    "side": "SELL",
    "order_type": "MARKET",
    "quantity": 1,
    "market": "IN"
}, description="Execute Market SELL paper order")

test_endpoint("POST", "/api/paper/order", json_data={
    "symbol": "RELIANCE.NS",
    "side": "INVALID_SIDE",
    "order_type": "MARKET",
    "quantity": -50,
}, expected_statuses=(400, 422), description="Negative quantity / invalid side paper order")

# 8. Audit Trail & Alerts
test_endpoint("GET", "/api/audit-trail", description="Get audit trail log")
test_endpoint("GET", "/api/alerts", description="Get price alerts")

print(f"\nAudit complete. Total failing/buggy requests: {len(issues)}")
with open("scratch/backend_stress_results.json", "w") as f:
    json.dump(issues, f, indent=2)
