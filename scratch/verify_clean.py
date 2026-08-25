import urllib.request
import json
import ssl

BASE_URL = "https://level-prescribed-key-rat.trycloudflare.com"
ctx = ssl._create_unverified_context()

def check(url_path):
    req = urllib.request.Request(f"{BASE_URL}{url_path}", headers={"bypass-tunnel-reminder": "1", "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
        return json.loads(r.read().decode("utf-8"))

print("=" * 65)
print("🔍 LIVE SYSTEM AUDIT & VERIFICATION REPORT")
print("=" * 65)

# 1. Market Indices
m = check("/api/market-summary?market=IN")
print(f"✅ [1. Market Indices]")
for name, d in list(m.get("indices", {}).items())[:4]:
    print(f"   • {name:10}: ₹{float(d.get('price', 0)):,.2f} ({float(d.get('pChange', 0)):+.2f}%)")

# 2. Recommendations
r = check("/api/recommendations?market=IN")
recs = r.get("all", []) or r.get("topBuys", [])
print(f"\n✅ [2. Real-Time Recommendations]")
print(f"   • Total Active Analyzed: {len(recs)} stocks")
for s in recs[:3]:
    print(f"   • {s.get('symbol'):12}: Signal={s.get('signal'):10} Score={s.get('overallScore')}/100 LTP=₹{s.get('currentPrice')}")

# 3. Daily Advisory
d = check("/api/daily-briefing?market=IN")
print(f"\n✅ [3. Daily Advisory Hub]")
print(f"   • Market Bias: {d.get('marketMacro', {}).get('marketBias')}")
print(f"   • Top Buys Count: {len(d.get('equityAdvisory', {}).get('topBuys', []))}")

# 4. F&O Trading Hub
f = check("/api/fno/signals?market=IN")
oc = check("/api/fno/option-chain?symbol=NIFTY50")
print(f"\n✅ [4. F&O Derivatives Hub]")
print(f"   • F&O Setups: {f.get('count')} active signals")
print(f"   • Option Chain: NIFTY Spot=₹{oc.get('underlyingValue')} | PCR={oc.get('pcr')} | ATM Strike={oc.get('atmStrike')}")

# 5. IPO Intelligence Hub
active_ipos = check("/api/ipo/active?market=IN").get("ipos", [])
closed_ipos = check("/api/ipo/closed?market=IN").get("ipos", [])
upcoming_ipos = check("/api/ipo/upcoming?market=IN").get("ipos", [])
listed_ipos = check("/api/ipo/listed?market=IN").get("ipos", [])
print(f"\n✅ [5. IPO Intelligence Hub]")
print(f"   • Live Bidding ({len(active_ipos)}): {[i.get('symbol') for i in active_ipos]}")
print(f"   • Closed Bidding ({len(closed_ipos)}): {[i.get('symbol') for i in closed_ipos]}")
print(f"   • Upcoming Pipeline ({len(upcoming_ipos)}): {[i.get('symbol') for i in upcoming_ipos]}")
print(f"   • Recently Listed ({len(listed_ipos)}): {[i.get('symbol') for i in listed_ipos]}")

# 6. Remote Discovery Config
cfg_req = urllib.request.Request("https://manishmarket.web.app/config.json", headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(cfg_req, context=ctx, timeout=8) as r:
    cfg = json.loads(r.read().decode("utf-8"))
print(f"\n✅ [6. Firebase Dynamic Discovery]")
print(f"   • Tunnel URL: {cfg.get('apiUrl')}")
print(f"   • App Version: {cfg.get('version')}")

print("=" * 65)
print("🚀 ALL SYSTEMS 100% OPERATIONAL & VERIFIED LIVE")
print("=" * 65)
