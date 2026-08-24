import requests
import json
import time

base_url = "http://localhost:8000"

symbols = [
    "RELIANCE.NS", "VIDYAWIRES.NS", "NVDA", "AAPL", "MSFT", "TSLA"
]

def run_stress_audit():
    print("==================================================================")
    print("🚀 CLIENT DEMO PRODUCTION READINESS & STRESS AUDIT")
    print("==================================================================\n")

    total_tests = 0
    passed_tests = 0

    # 1. Root Endpoint Test
    total_tests += 1
    r = requests.get(f"{base_url}/")
    if r.status_code == 200:
        passed_tests += 1
        print("  ✓ GET / (Root Status): 200 OK")
    else:
        print(f"  ❌ GET / failed: {r.status_code}")

    # 2. Market Summary Test (IN & US)
    for m in ["IN", "US"]:
        total_tests += 1
        r = requests.get(f"{base_url}/api/market-summary?market={m}")
        if r.status_code == 200 and "sentiment" in r.json():
            passed_tests += 1
            print(f"  ✓ GET /api/market-summary ({m}): 200 OK - Sentiment: {r.json()['sentiment']['label']}")
        else:
            print(f"  ❌ GET /api/market-summary ({m}) failed")

    # 3. Recommendations Feed (IN & US)
    for m in ["IN", "US"]:
        total_tests += 1
        r = requests.get(f"{base_url}/api/recommendations?market={m}")
        if r.status_code == 200 and len(r.json().get("all", [])) > 0:
            passed_tests += 1
            print(f"  ✓ GET /api/recommendations ({m}): 200 OK - {len(r.json()['all'])} stocks analyzed")
        else:
            print(f"  ❌ GET /api/recommendations ({m}) failed")

    # 4. Multi-Horizon Analysis Endpoints (Intraday, Swing, LongTerm across all symbols)
    print("\n--- Testing Multi-Horizon AI Analysis Engines ---")
    for sym in symbols:
        for mode in ["intraday", "swing", "longterm"]:
            total_tests += 1
            url = f"{base_url}/api/analysis/{mode}?symbol={sym}"
            r = requests.get(url)
            if r.status_code == 200:
                d = r.json()
                if d.get("score") is not None and d.get("explanation"):
                    passed_tests += 1
                    print(f"  ✓ [{mode.upper():8s}] {sym:15s} | Score: {d['score']:3d}/100 | Signal: {d['signal']:18s} | Regime: {d['marketRegime']}")
                else:
                    print(f"  ❌ [{mode.upper()}] {sym} returned incomplete payload")
            else:
                print(f"  ❌ [{mode.upper()}] {sym} failed with status {r.status_code}")

    # 5. F&O Signals Endpoint Test
    total_tests += 1
    r = requests.get(f"{base_url}/api/fno-signals")
    if r.status_code == 200 and len(r.json().get("indices", [])) > 0:
        passed_tests += 1
        print("\n  ✓ GET /api/fno-signals: 200 OK - Derivatives trading hub active")
    else:
        print("\n  ❌ GET /api/fno-signals failed")

    # 6. Backtest Endpoint Test
    total_tests += 1
    r = requests.post(f"{base_url}/api/analysis/backtest")
    if r.status_code == 200 and r.json().get("totalTrades") > 0:
        passed_tests += 1
        print("  ✓ POST /api/analysis/backtest: 200 OK - Backtest engine verified")
    else:
        print("  ❌ POST /api/analysis/backtest failed")

    print("\n==================================================================")
    print(f"🎯 PRODUCTION AUDIT RESULTS: {passed_tests} / {total_tests} PASSED ({passed_tests/total_tests*100:.1f}%)")
    print("==================================================================")

if __name__ == "__main__":
    run_stress_audit()
