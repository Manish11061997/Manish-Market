from dataclasses import dataclass
from typing import Dict, Optional
from enum import Enum
import logging

from instrument_master import instrument_master

logger = logging.getLogger(__name__)

class CircuitStatus(str, Enum):
    NORMAL = "NORMAL"
    NEAR_UPPER_CIRCUIT = "NEAR_UPPER_CIRCUIT" # Within 1.5% of upper circuit
    UPPER_CIRCUIT_HIT = "UPPER_CIRCUIT_HIT"   # Locked at upper circuit
    NEAR_LOWER_CIRCUIT = "NEAR_LOWER_CIRCUIT" # Within 1.5% of lower circuit
    LOWER_CIRCUIT_HIT = "LOWER_CIRCUIT_HIT"   # Locked at lower circuit
    NO_CIRCUIT_LIMIT = "NO_CIRCUIT_LIMIT"     # E.g. Benchmark Indices / F&O stocks with dynamic bands

@dataclass
class CircuitLimitsData:
    symbol: str
    prev_close: float
    circuit_band_pct: float
    upper_circuit: float
    lower_circuit: float
    current_price: float
    distance_to_upper_pct: float
    distance_to_lower_pct: float
    status: CircuitStatus
    can_buy: bool
    can_sell: bool

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "prevClose": self.prev_close,
            "circuitBandPct": self.circuit_band_pct,
            "upperCircuit": self.upper_circuit,
            "lowerCircuit": self.lower_circuit,
            "currentPrice": self.current_price,
            "distanceToUpperPct": round(self.distance_to_upper_pct, 2),
            "distanceToLowerPct": round(self.distance_to_lower_pct, 2),
            "status": self.status.value,
            "canBuy": self.can_buy,
            "canSell": self.can_sell
        }

class CircuitLimitsEngine:
    """
    Evaluates exchange circuit limits (Upper & Lower circuit bands),
    proximity warnings, and lock conditions for Equities and Derivatives.
    """

    @staticmethod
    def calculate_circuit_limits(symbol: str, current_price: float, prev_close: Optional[float] = None) -> CircuitLimitsData:
        inst = instrument_master.lookup(symbol)
        band_pct = inst.circuit_limit_pct if inst else 10.0
        
        # If no circuit limit (e.g. index), set large range
        if band_pct <= 0:
            return CircuitLimitsData(
                symbol=symbol,
                prev_close=round(prev_close or current_price, 2),
                circuit_band_pct=0.0,
                upper_circuit=round(current_price * 1.5, 2),
                lower_circuit=round(current_price * 0.5, 2),
                current_price=round(current_price, 2),
                distance_to_upper_pct=50.0,
                distance_to_lower_pct=50.0,
                status=CircuitStatus.NO_CIRCUIT_LIMIT,
                can_buy=True,
                can_sell=True
            )

        base_p = prev_close if (prev_close and prev_close > 0) else current_price
        
        # Calculate standard exchange upper/lower bands rounded to tick size
        upper_limit = round(base_p * (1.0 + (band_pct / 100.0)), 2)
        lower_limit = round(base_p * (1.0 - (band_pct / 100.0)), 2)

        # Distances in percent
        dist_upper = round(((upper_limit - current_price) / current_price) * 100.0, 2)
        dist_lower = round(((current_price - lower_limit) / current_price) * 100.0, 2)

        status = CircuitStatus.NORMAL
        can_buy = True
        can_sell = True

        if current_price >= upper_limit or dist_upper <= 0.05:
            status = CircuitStatus.UPPER_CIRCUIT_HIT
            can_buy = False # Cannot buy locked stock (only sellers/no liquidity)
        elif dist_upper <= 1.5:
            status = CircuitStatus.NEAR_UPPER_CIRCUIT
        elif current_price <= lower_limit or dist_lower <= 0.05:
            status = CircuitStatus.LOWER_CIRCUIT_HIT
            can_sell = False # Cannot sell locked stock (no buyers)
        elif dist_lower <= 1.5:
            status = CircuitStatus.NEAR_LOWER_CIRCUIT

        return CircuitLimitsData(
            symbol=symbol,
            prev_close=round(base_p, 2),
            circuit_band_pct=band_pct,
            upper_circuit=upper_limit,
            lower_circuit=lower_limit,
            current_price=round(current_price, 2),
            distance_to_upper_pct=max(0.0, dist_upper),
            distance_to_lower_pct=max(0.0, dist_lower),
            status=status,
            can_buy=can_buy,
            can_sell=can_sell
        )

# Global Circuit Limits Engine Singleton
circuit_limits_engine = CircuitLimitsEngine()
