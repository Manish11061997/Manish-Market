import urllib.request
import json
import ssl

BASE_URL = "https://deutschland-rpg-dim-webpage.trycloudflare.com"

endpoints = [
    ("/api/session-status?market=IN", "Session Status (IN)"),
    ("/api/session-status?market=US", "Session Status (US)"),
    ("/api/market-summary?market=IN", "Market Summary (IN)"),
    ("/api/market-summary?market=US", "Market Summary (US)"),
    ("/api/market-breadth?market=IN", "Market Breadth (IN)"),
    ("/api/market-breadth?market=US", "Market Breadth (US)"),
    ("/api/recommendations?market=IN", "Recommendations (IN)"),
    ("/api/recommendations?market=US", "Recommendations (US)"),
    ("/api/daily-briefing?market=IN", "Daily Advisory (IN)"),
    ("/api/daily-briefing?market=US", "Daily Advisory (US)"),
    ("/api/fno/signals?market=IN", "F&O Signals (IN)"),
    ("/api/fno/option-chain?symbol=NIFTY50", "NIFTY Option Chain"),
    ("/api/fno/option-chain?symbol=RELIANCE.NS", "Reliance Option Chain"),
    ("/api/ipo/summary?market=IN", "IPO Summary (IN)"),
    ("/api/ipo/active?market=IN", "IPO Active (IN)"),
    ("/api/ipo/closed?market=IN", "IPO Closed (IN)"),
    ("/api/ipo/upcoming?market=IN", "IPO Upcoming (IN)"),
    ("/api/ipo/listed?market=IN", "IPO Listed (IN)"),
    ("/api/screener?market=IN", "Screener (IN)"),
    ("/api/screener?market=US", "Screener (US)"),
    ("/api/paper/portfolio", "Paper Portfolio"),
    ("/api/audit-trail", "Audit Trail"),
    ("/api/copilot/chat?q=What+is+market+trend&market=IN", "Copilot Chat"),
    ("/api/analysis/intraday?symbol=RELIANCE.NS", "Intraday Analysis (RELIANCE)"),
    ("/api/analysis/swing?symbol=NVDA", "Swing Analysis (NVDA)"),
    ("/api/stock/RELIANCE.NS/financials", "Stock Financials (RELIANCE)"),
    ("/api/stock/RELIANCE.NS/delivery", "Stock Delivery (RELIANCE)"),
    ("/api/stock/RELIANCE.NS/depth", "Market Depth (RELIANCE)"),
    ("/api/stock/RELIANCE.NS/corporate-actions", "Corporate Actions (RELIANCE)"),
    ("/api/stock/RELIANCE.NS/circuit-limits", "Circuit Limits (RELIANCE)"),
]

ctx = ssl._create_unverified_context()
headers = {
    "User-Agent": "ManishMarketApp/1.0",
    "bypass-tunnel-reminder": "1",
    "Bypass-Tunnel-Reminder": "1"
}

results = []
passed = 0
failed = 0

print(f"=== TESTING ALL 30 ENDPOINTS OVER CLOUDFLARE TUNNEL ({BASE_URL}) ===")

for path, label in endpoints:
    url = f"{BASE_URL}{path}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            status = resp.status
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
            passed += 1
            print(f"✅ [200 OK] {label} -> {path}")
    except Exception as e:
        failed += 1
        print(f"❌ [FAIL]   {label} -> {path} | Error: {e}")

print(f"\\n=== TEST SUMMARY: {passed}/{len(endpoints)} PASSED, {failed} FAILED ===")
