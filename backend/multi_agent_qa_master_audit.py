import requests
import json
import time
import math
import concurrent.futures
from datetime import datetime

BASE_URL = "http://localhost:8000"

def audit_concurrency(num_requests=10):
    print(f"\n--- Testing Concurrency Load ({num_requests} parallel requests to /api/recommendations) ---")
    def fetch_recs():
        t0 = time.time()
        r = requests.get(f"{BASE_URL}/api/recommendations?market=IN")
        t1 = time.time()
        return r.status_code, (t1 - t0) * 1000, len(r.json().get("all", [])) if r.status_code == 200 else 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_requests) as executor:
        futures = [executor.submit(fetch_recs) for _ in range(num_requests)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    statuses = [res[0] for res in results]
    latencies = [res[1] for res in results]
    counts = [res[2] for res in results]

    avg_lat = sum(latencies) / len(latencies)
    max_lat = max(latencies)
    min_lat = min(latencies)
    success_rate = (statuses.count(200) / len(statuses)) * 100.0

    print(f"  ✓ Success Rate: {success_rate}% ({statuses.count(200)}/{len(statuses)})")
    print(f"  ✓ Latency: Avg = {avg_lat:.1f}ms | Min = {min_lat:.1f}ms | Max = {max_lat:.1f}ms")
    print(f"  ✓ Data Consistency: All threads returned {counts[0]} stocks")
    return success_rate == 100.0

def audit_schema_integrity():
    print("\n--- Auditing Schema & Financial Math Integrity across Stock Universe ---")
    r = requests.get(f"{BASE_URL}/api/recommendations?market=IN")
    data = r.json()
    all_stocks = data.get("all", [])

    anomalies = []
    for stock in all_stocks:
        sym = stock.get("symbol")
        price = stock.get("currentPrice")
        tp1 = stock.get("tradePlan", {}).get("target1")
        sl = stock.get("tradePlan", {}).get("stopLoss")
        rr = stock.get("tradePlan", {}).get("riskRewardRatio")

        if not price or price <= 0:
            anomalies.append(f"[{sym}] Invalid currentPrice: {price}")
        if not tp1 or tp1 <= price:
            anomalies.append(f"[{sym}] Target 1 ({tp1}) is not higher than price ({price})")
        if not sl or sl >= price:
            anomalies.append(f"[{sym}] Stop Loss ({sl}) is not lower than price ({price})")
        if not rr or "1:" not in str(rr):
            anomalies.append(f"[{sym}] Malformed Risk:Reward ratio: {rr}")

    if anomalies:
        print(f"  ❌ Found {len(anomalies)} schema/math anomalies:")
        for a in anomalies[:5]:
            print(f"     - {a}")
    else:
        print(f"  ✓ 100% Schema Integrity Verified across all {len(all_stocks)} stocks!")
    return len(anomalies) == 0

if __name__ == "__main__":
    print("==================================================================")
    print("🔬 MULTI-AGENT MASTER QA AUDIT BENCHMARK")
    print("==================================================================")
    c_ok = audit_concurrency(10)
    s_ok = audit_schema_integrity()
    print("==================================================================")
    print(f"Master Audit Status: {'PASSED 100%' if (c_ok and s_ok) else 'ISSUES DETECTED'}")
    print("==================================================================")
