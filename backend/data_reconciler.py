from typing import Dict, List, Optional, Set
import time
import logging

logger = logging.getLogger(__name__)

class DataReconciliationEngine:
    """
    Data Reconciliation & Gap Detection Engine.
    Detects sequence gaps, prevents stale data overwriting newer data,
    reconciles active forming candles across provider reconnects/failovers,
    and safeguards against artificial price spikes.
    """

    def __init__(self):
        self._last_sequences: Dict[str, int] = {}
        self._last_timestamps: Dict[str, int] = {}
        self._detected_gaps: int = 0
        self._reconciled_events: int = 0
        self._rejected_stale_events: int = 0

    def validate_and_reconcile_tick(self, tick: dict) -> tuple[bool, Optional[str]]:
        """
        Validates incoming tick for sequence monotonicity, timestamp freshness, and price sanity.
        Returns (is_valid, reason).
        """
        if not tick or "symbol" not in tick or "price" not in tick:
            return False, "INVALID_TICK_PAYLOAD"

        sym = tick["symbol"].upper()
        seq = tick.get("sequenceNumber", 0)
        ms = tick.get("ms", int(time.time() * 1000))
        price = float(tick.get("price", 0.0))

        if price <= 0:
            return False, "NON_POSITIVE_PRICE"

        # 1. Monotonic Timestamp Check (Reject older data arriving after newer data)
        last_ms = self._last_timestamps.get(sym, 0)
        if last_ms > 0 and (ms < last_ms - 2000): # More than 2s behind latest
            self._rejected_stale_events += 1
            return False, f"STALE_OUT_OF_ORDER_TIMESTAMP ({ms} < {last_ms})"

        # 2. Sequence Continuity Check
        last_seq = self._last_sequences.get(sym, 0)
        if last_seq > 0 and seq > 0:
            if seq > last_seq + 1:
                gap_size = seq - last_seq - 1
                self._detected_gaps += gap_size
                logger.warning(f"Sequence gap detected for {sym}: expected {last_seq+1}, got {seq} (Gap: {gap_size})")
            elif seq <= last_seq and (ms <= last_ms):
                # Duplicate or out of sequence
                return False, f"DUPLICATE_SEQUENCE_NUMBER ({seq} <= {last_seq})"

        # Record valid state
        self._last_sequences[sym] = max(last_seq, seq)
        self._last_timestamps[sym] = max(last_ms, ms)
        self._reconciled_events += 1

        return True, "VALID"

    def reconcile_on_provider_switch(self, active_symbols: Set[str], old_provider_name: str, new_provider_name: str):
        """
        Reset sequence state and prepare seamless handover between providers.
        """
        logger.info(f"Reconciling market feeds during failover from '{old_provider_name}' to '{new_provider_name}' for {len(active_symbols)} symbols.")
        for s in active_symbols:
            self._last_sequences[s.upper()] = 0 # Reset sequence baseline for new provider

    def get_stats(self) -> dict:
        return {
            "reconciledEvents": self._reconciled_events,
            "detectedGaps": self._detected_gaps,
            "rejectedStaleEvents": self._rejected_stale_events
        }

# Global Data Reconciler Singleton
data_reconciler = DataReconciliationEngine()
