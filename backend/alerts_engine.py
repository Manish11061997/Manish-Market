import logging
import uuid
import time
import threading
from typing import List, Dict

logger = logging.getLogger(__name__)

class PriceAlertsEngine:
    """Real-Time Price Alert Evaluation Engine operating on incoming live market ticks."""

    def __init__(self):
        self._lock = threading.RLock()
        self.alerts: List[dict] = [
            {
                "id": str(uuid.uuid4()),
                "symbol": "RELIANCE.NS",
                "condition": "ABOVE",
                "targetPrice": 1320.0,
                "createdTime": time.strftime("%H:%M:%S"),
                "triggered": False
            },
            {
                "id": str(uuid.uuid4()),
                "symbol": "NVDA",
                "condition": "BELOW",
                "targetPrice": 220.0,
                "createdTime": time.strftime("%H:%M:%S"),
                "triggered": False
            }
        ]

    def add_alert(self, symbol: str, condition: str, target_price: float) -> dict:
        alert = {
            "id": str(uuid.uuid4()),
            "symbol": symbol.upper(),
            "condition": condition.upper(), # ABOVE or BELOW
            "targetPrice": float(target_price),
            "createdTime": time.strftime("%H:%M:%S"),
            "triggered": False
        }
        with self._lock:
            self.alerts.append(alert)
        logger.info(f"Added price alert: {symbol} {condition} {target_price}")
        return alert

    def delete_alert(self, alert_id: str) -> bool:
        with self._lock:
            initial_len = len(self.alerts)
            self.alerts = [a for a in self.alerts if a["id"] != alert_id]
            return len(self.alerts) < initial_len

    def get_alerts(self) -> List[dict]:
        with self._lock:
            return [dict(a) for a in self.alerts]

    def evaluate_ticks(self, ticks: Dict[str, dict]) -> List[dict]:
        """Evaluate active alert rules against incoming live tick stream."""
        triggered = []
        with self._lock:
            snapshot = [dict(a) for a in self.alerts]
        for alert in snapshot:
            if alert["triggered"]:
                continue

            sym = alert["symbol"]
            if sym in ticks:
                current_price = ticks[sym]["price"]
                cond = alert["condition"]
                target = alert["targetPrice"]

                is_triggered = False
                if cond == "ABOVE" and current_price >= target:
                    is_triggered = True
                elif cond == "BELOW" and current_price <= target:
                    is_triggered = True

                if is_triggered:
                    with self._lock:
                        live = next((a for a in self.alerts if a["id"] == alert["id"] and not a["triggered"]), None)
                        if live:
                            live["triggered"] = True
                            live["triggerPrice"] = current_price
                            live["triggerTime"] = time.strftime("%H:%M:%S")
                            logger.info(f"🚨 PRICE ALERT TRIGGERED: {sym} ({current_price}) {cond} {target}")
                            triggered.append(dict(live))

        return triggered

alerts_engine = PriceAlertsEngine()
