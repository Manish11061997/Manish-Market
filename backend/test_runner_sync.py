"""
test_runner_sync.py
Synchronous Comprehensive Platform Health Check & Validation
"""

import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

tests = [
    ("Market Summary (IN)", f"{BASE_URL}/api/market-summary?market=IN", ["indices", "marketStatus"]),
    ("Market Summary (US)", f"{BASE_URL}/api/market-summary?market=US", ["indices", "marketStatus"]),
    ("Market Breadth (IN)", f"{BASE_URL}/api/market-breadth?market=IN", ["advances", "declines"]),
    ("Recommendations (IN)", f"{BASE_URL}/api/recommendations?market=IN", ["recommendations"]),
    ("Recommendations (US)", f"{BASE_URL}/api/recommendations?market=US", ["recommendations"]),
    ("Screener Engine", f"{BASE_URL}/api/screener?sector=ALL", ["results"]),
    ("Stock Detail (HAL.NS)", f"{BASE_URL}/api/stock/HAL.NS?market=IN", ["symbol", "currentPrice", "technicals"]),
    ("Stock Detail (RELIANCE.NS)", f"{BASE_URL}/api/stock/RELIANCE.NS?market=IN", ["symbol", "currentPrice"]),
    ("Stock Detail (NVDA US)", f"{BASE_URL}/api/stock/NVDA?market=US", ["symbol", "currentPrice"]),
    ("Chart OHLCV (HAL.NS)", f"{BASE_URL}/api/stock/HAL.NS/chart?period=6mo&interval=1d&adjusted=true&market=IN", ["data", "symbol"]),
    ("Level 2 Depth (HAL.NS)", f"{BASE_URL}/api/stock/HAL.NS/depth", ["bids", "asks", "spread"]),
    ("Corporate Actions (HAL.NS)", f"{BASE_URL}/api/corporate-actions/HAL.NS?market=IN", ["symbol", "actions"]),
    ("Chart Reading & Forward Predictions (HAL.NS)", f"{BASE_URL}/api/stock/HAL.NS/chart-reading?market=IN", ["bias", "candlestickPatterns", "movingAverages", "pivots", "tradeSuggestion", "forwardPredictions", "chartNarrative"]),
    ("Chart Reading & Forward Predictions (NVDA)", f"{BASE_URL}/api/stock/NVDA/chart-reading?market=US", ["bias", "tradeSuggestion", "forwardPredictions"]),
    ("Intraday Pattern Engine (ORB 15m)", f"{BASE_URL}/api/analysis/intraday?symbol=HAL.NS&orbPeriod=15&market=IN", ["signal", "score", "marketRegime", "entryZone", "targets", "stopLoss"]),
    ("Swing Strategy Engine", f"{BASE_URL}/api/analysis/swing?symbol=HAL.NS&market=IN", ["signal", "score", "riskReward"]),
    ("Long-Term Moats Engine", f"{BASE_URL}/api/analysis/longterm?symbol=HAL.NS&market=IN", ["signal", "score"]),
    ("IPO Hub Summary", f"{BASE_URL}/api/ipo/summary?market=IN", ["activeCount", "averageGmpPercent", "totalActiveCapital"]),
    ("IPO Hub Active Bidding", f"{BASE_URL}/api/ipo/active?market=IN", ["ipos"]),
    ("IPO Hub Upcoming Pipeline", f"{BASE_URL}/api/ipo/upcoming?market=IN", ["ipos"]),
    ("IPO Hub Recently Listed Track Record", f"{BASE_URL}/api/ipo/listed?market=IN", ["ipos"]),
    ("IPO Deep Analysis (Sunshine Pictures)", f"{BASE_URL}/api/ipo/IPO-SUNSHINE/details", ["companyName", "subscription", "financials", "peers"]),
    ("IPO Deep Analysis (Tempsens Instruments)", f"{BASE_URL}/api/ipo/IPO-TEMPSENS/details", ["companyName", "subscription", "businessOverview"]),
    ("Daily Advisory Briefing", f"{BASE_URL}/api/daily-briefing?market=IN", ["marketOutlook", "tradePlan", "regime"]),
    ("F&O Derivatives Signals", f"{BASE_URL}/api/fno-signals?market=IN", ["pcrRatio", "maxPain", "strategies"]),
    ("Paper Trading Portfolio (OMS)", f"{BASE_URL}/api/paper/portfolio", ["cashBalance", "totalPortfolioValue"]),
    ("Price Alerts Manager", f"{BASE_URL}/api/alerts", ["alerts"])
]

passed_count = 0
total_count = len(tests)

print("=" * 85)
print(f"{'TEST NAME':<48} | {'LATENCY':<9} | {'STATUS':<10} | {'VALIDATION'}")
print("=" * 85)

for name, url, keys in tests:
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            lat = (time.time() - t0) * 1000.0
            if resp.status == 200:
                body = json.loads(resp.read().decode('utf-8'))
                missing = [k for k in keys if k not in body]
                if missing:
                    print(f"{name:<48} | {lat:6.1f}ms  | ❌ FAIL    | Missing keys: {missing}")
                else:
                    passed_count += 1
                    print(f"{name:<48} | {lat:6.1f}ms  | ✅ PASS    | Schema & Payload Verified")
            else:
                print(f"{name:<48} | {lat:6.1f}ms  | ❌ FAIL    | HTTP {resp.status}")
    except Exception as e:
        lat = (time.time() - t0) * 1000.0
        print(f"{name:<48} | {lat:6.1f}ms  | ❌ FAIL    | {str(e)[:35]}")

print("=" * 85)
print(f"📊 SUMMARY: {passed_count}/{total_count} PASSED ({(passed_count/total_count)*100:.1f}%)")
print("=" * 85)
