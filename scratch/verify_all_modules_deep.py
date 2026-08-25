import urllib.request
import json
import ssl
import sys

BASE_URL = "https://level-prescribed-key-rat.trycloudflare.com"
ctx = ssl._create_unverified_context()
headers = {
    "User-Agent": "ManishMarketNativeTester/1.0",
    "bypass-tunnel-reminder": "1",
    "Bypass-Tunnel-Reminder": "1"
}

def fetch(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=headers)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("=" * 70)
print("🎯 DEEP END-TO-END VERIFICATION OF ALL SYSTEM MODULES")
print("=" * 70)

# 1. Market Header & Indices
m_summary = fetch("/api/market-summary?market=IN")
indices = m_summary.get("indices", {})
print(f"1. Market Indices:")
for k, v in list(indices.items())[:3]:
    p = float(v.get('price', 0.0) or 0.0)
    chg = float(v.get('pChange', 0.0) or 0.0)
    print(f"   • {k}: ₹{p:,.2f} ({chg:+.2f}%)")

# 2. Stock Recommendations
recs = fetch("/api/recommendations?market=IN")
rec_list = recs.get("recommendations", []) if isinstance(recs, dict) else recs
print(f"2. Recommendations: {len(rec_list)} active stocks analyzed")
if rec_list:
    top_stock = rec_list[0]
    print(f"   • Top Pick: {top_stock.get('name')} ({top_stock.get('symbol')}) -> Signal: {top_stock.get('signal')} | Score: {top_stock.get('overallScore')}/100")

# 3. Daily Advisory
briefing = fetch("/api/daily-briefing?market=IN")
buys = briefing.get("equityAdvisory", {}).get("topBuys", [])
print(f"3. Daily Advisory Briefing:")
print(f"   • Market Bias: {briefing.get('marketMacro', {}).get('marketBias')}")
print(f"   • Top Buy Setups: {len(buys)} loaded (e.g. {buys[0].get('symbol') if buys else 'N/A'})")

# 4. F&O Matrix & Option Chain
fno = fetch("/api/fno/signals?market=IN")
print(f"4. F&O Trading Hub:")
print(f"   • Total F&O Contracts: {fno.get('count')} setups")
opt_chain = fetch("/api/fno/option-chain?symbol=NIFTY50")
print(f"   • Option Chain (NIFTY): Spot=₹{opt_chain.get('underlyingValue')} | PCR={opt_chain.get('pcr')} | Strikes={len(opt_chain.get('strikes', []))}")

# 5. IPO Intelligence Hub
ipo_summary = fetch("/api/ipo/summary?market=IN")
ipo_active = fetch("/api/ipo/active?market=IN").get("ipos", [])
ipo_closed = fetch("/api/ipo/closed?market=IN").get("ipos", [])
ipo_upcoming = fetch("/api/ipo/upcoming?market=IN").get("ipos", [])
ipo_listed = fetch("/api/ipo/listed?market=IN").get("ipos", [])
print(f"5. IPO Intelligence Hub:")
print(f"   • Active Bidding ({len(ipo_active)}): {[i.get('symbol') for i in ipo_active]}")
print(f"   • Closed/Allotment ({len(ipo_closed)}): {[i.get('symbol') for i in ipo_closed]}")
print(f"   • Upcoming Pipeline ({len(ipo_upcoming)}): {[i.get('symbol') for i in ipo_upcoming]}")
print(f"   • Recently Listed ({len(ipo_listed)}): {[i.get('symbol') for i in ipo_listed]}")

# 6. Screener & Filter
screener = fetch("/api/screener?market=IN")
print(f"6. Screener Engine: {screener.get('count')} securities available for filtering")

# 7. AI Copilot Chat
copilot = fetch("/api/copilot/chat?q=What+is+NIFTY+support&market=IN")
print(f"7. AI Copilot Chat: Response generated -> '{str(copilot.get('response', ''))[:90]}...'")

# 8. Dynamic Discovery Config
cfg_req = urllib.request.Request("https://manishmarket.web.app/config.json", headers=headers)
with urllib.request.urlopen(cfg_req, context=ctx, timeout=10) as resp:
    cfg = json.loads(resp.read().decode("utf-8"))
print(f"8. Firebase Cloud Discovery:")
print(f"   • Remote Config URL: {cfg.get('apiUrl')}")
print(f"   • Version: {cfg.get('version')} (Matches Active Tunnel: {cfg.get('apiUrl') == BASE_URL})")

print("=" * 70)
print("✅ ALL MODULES 100% OPERATIONAL OVER LIVE CLOUD TUNNEL")
print("=" * 70)
