from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum
import time
import threading
import logging

from instrument_master import instrument_master
from market_session import get_market_session_status
from circuit_limits import circuit_limits_engine

logger = logging.getLogger(__name__)

class RiskCheckStatus(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

@dataclass
class RiskCheckResult:
    status: RiskCheckStatus
    rule_name: str
    passed: bool
    message: str
    details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PreTradeRiskEvaluation:
    is_approved: bool
    symbol: str
    quantity: int
    price: float
    order_value: float
    total_checks: int
    passed_checks: int
    failed_checks: int
    checks: List[RiskCheckResult] = field(default_factory=list)
    rejection_reasons: List[str] = field(default_factory=list)
    timestamp: str = ""

    def to_dict(self) -> dict:
        return {
            "isApproved": self.is_approved,
            "symbol": self.symbol,
            "quantity": self.quantity,
            "price": self.price,
            "orderValue": round(self.order_value, 2),
            "totalChecks": self.total_checks,
            "passedChecks": self.passed_checks,
            "failedChecks": self.failed_checks,
            "checks": [
                {
                    "ruleName": c.rule_name,
                    "passed": c.passed,
                    "status": c.status.value,
                    "message": c.message,
                    "details": c.details
                }
                for c in self.checks
            ],
            "rejectionReasons": self.rejection_reasons,
            "timestamp": self.timestamp
        }

class DedicatedRiskEngine:
    """
    Independent Pre-Trade Risk Management Layer.
    Every proposed order (manual or AI-generated) MUST strictly pass all risk checks
    before reaching the Order Management System (OMS) or Broker Adapter.
    The AI is strictly an advisory engine and NEVER has direct execution authority.
    """

    def __init__(
        self,
        max_order_value: float = 500000.0,    # Max ₹5,00,000 / $15,000 per order
        max_position_concentration_pct: float = 35.0, # Max 35% of portfolio equity in a single asset
        max_daily_loss_limit: float = 50000.0, # Max ₹50,000 daily loss kill-switch
        duplicate_lock_seconds: float = 5.0
    ):
        self.max_order_value = max_order_value
        self.max_concentration_pct = max_position_concentration_pct
        self.max_daily_loss_limit = max_daily_loss_limit
        self.duplicate_lock_seconds = duplicate_lock_seconds
        
        self._recent_orders: List[dict] = []
        self._daily_realized_loss: float = 0.0
        self._daily_loss_date: str = ""
        self._lock = threading.RLock()

    def reset_risk_state(self):
        with self._lock:
            self._recent_orders.clear()
            self._daily_realized_loss = 0.0

    def record_realized_loss(self, amount: float):
        with self._lock:
            today = time.strftime("%Y-%m-%d")
            if self._daily_loss_date != today:
                self._daily_loss_date = today
                self._daily_realized_loss = 0.0
            if amount > 0:
                self._daily_realized_loss += amount

    def evaluate_order(
        self,
        symbol: str,
        side: str, # "BUY" or "SELL"
        quantity: int,
        price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        account_balance: float = 1000000.0,
        portfolio_positions: Optional[Dict[str, dict]] = None,
        is_paper: bool = True,
        record: bool = True
    ) -> PreTradeRiskEvaluation:
        """
        Executes strict multi-gate pre-trade risk evaluation.
        """
        symbol_clean = symbol.upper().strip().lstrip("$")
        order_value = round(quantity * price, 2)
        checks: List[RiskCheckResult] = []
        rejections: List[str] = []

        # Gate 1: Instrument Master Validity & Multipliers
        inst = instrument_master.lookup(symbol_clean)
        if not inst:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.REJECTED,
                rule_name="INSTRUMENT_VALIDITY",
                passed=False,
                message=f"Instrument '{symbol_clean}' is not recognized in Instrument Master."
            ))
            rejections.append("Unknown Instrument")
        else:
            # Check lot size multiple
            lot = inst.lot_size
            if quantity % lot != 0:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.REJECTED,
                    rule_name="LOT_SIZE_VALIDATION",
                    passed=False,
                    message=f"Quantity {quantity} must be a multiple of lot size {lot} for {symbol_clean}."
                ))
                rejections.append(f"Invalid Lot Multiple (Lot size: {lot})")
            else:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.APPROVED,
                    rule_name="LOT_SIZE_VALIDATION",
                    passed=True,
                    message=f"Quantity {quantity} is a valid multiple of lot size {lot}."
                ))

        # Gate 2: Maximum Order Value Limit
        effective_max_val = self.max_order_value if (inst and inst.currency == "INR") else 15000.0
        if order_value > effective_max_val:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.REJECTED,
                rule_name="MAX_ORDER_VALUE_LIMIT",
                passed=False,
                message=f"Order value {inst.currency if inst else '₹'}{order_value:,.2f} exceeds max threshold of {effective_max_val:,.2f}."
            ))
            rejections.append(f"Exceeds Max Order Value Limit ({effective_max_val})")
        else:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.APPROVED,
                rule_name="MAX_ORDER_VALUE_LIMIT",
                passed=True,
                message=f"Order value is within permitted limits."
            ))

        # Gate 3: Available Margin / Cash Balance Check
        if side.upper() == "BUY" and order_value > account_balance:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.REJECTED,
                rule_name="AVAILABLE_MARGIN_CHECK",
                passed=False,
                message=f"Insufficient funds: Required {order_value:,.2f}, Available: {account_balance:,.2f}."
            ))
            rejections.append("Insufficient Funds / Margin")
        else:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.APPROVED,
                rule_name="AVAILABLE_MARGIN_CHECK",
                passed=True,
                message=f"Sufficient account margin available."
            ))

        # Gate 4: Position Concentration Cap (Max 25% in Single Asset)
        current_holding_val = 0.0
        if portfolio_positions and symbol_clean in portfolio_positions:
            current_holding_val = portfolio_positions[symbol_clean].get("marketValue", 0.0)
        
        post_trade_val = current_holding_val + order_value if side.upper() == "BUY" else current_holding_val
        concentration_pct = (post_trade_val / max(account_balance, 1.0)) * 100.0
        if side.upper() == "BUY" and concentration_pct > self.max_concentration_pct:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.REJECTED,
                rule_name="POSITION_CONCENTRATION_CAP",
                passed=False,
                message=f"Post-trade concentration ({concentration_pct:.1f}%) exceeds safety cap ({self.max_concentration_pct}%)."
            ))
            rejections.append(f"Portfolio Concentration Limit ({self.max_concentration_pct}%) Exceeded")
        else:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.APPROVED,
                rule_name="POSITION_CONCENTRATION_CAP",
                passed=True,
                message=f"Portfolio concentration ({concentration_pct:.1f}%) is within safe thresholds."
            ))

        # Gate 5: Mandatory Stop-Loss Enforcement
        if not stop_loss or stop_loss <= 0:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.REJECTED,
                rule_name="MANDATORY_STOP_LOSS",
                passed=False,
                message="Strict risk policy requires an explicit, positive Stop-Loss on every trade setup."
            ))
            rejections.append("Missing Mandatory Stop-Loss")
        else:
            if side.upper() == "BUY" and stop_loss >= price:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.REJECTED,
                    rule_name="STOP_LOSS_LOGIC",
                    passed=False,
                    message=f"Long position Stop-Loss ({stop_loss}) must be below current entry price ({price})."
                ))
                rejections.append("Invalid Stop-Loss Price (Must be below entry for Long)")
            elif side.upper() == "SELL" and stop_loss <= price:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.REJECTED,
                    rule_name="STOP_LOSS_LOGIC",
                    passed=False,
                    message=f"Short position Stop-Loss ({stop_loss}) must be above current entry price ({price})."
                ))
                rejections.append("Invalid Stop-Loss Price (Must be above entry for Short)")
            else:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.APPROVED,
                    rule_name="MANDATORY_STOP_LOSS",
                    passed=True,
                    message=f"Stop-Loss verified at {stop_loss}."
                ))

        # Gate 6: Circuit Limits Compliance
        circuits = circuit_limits_engine.calculate_circuit_limits(symbol_clean, price)
        if side.upper() == "BUY" and not circuits.can_buy:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.REJECTED,
                rule_name="CIRCUIT_LIMIT_LOCK",
                passed=False,
                message=f"{symbol_clean} is locked at Upper Circuit ({circuits.upper_circuit}). Cannot execute Buy orders."
            ))
            rejections.append("Locked at Upper Circuit (No Sellers)")
        elif side.upper() == "SELL" and not circuits.can_sell:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.REJECTED,
                rule_name="CIRCUIT_LIMIT_LOCK",
                passed=False,
                message=f"{symbol_clean} is locked at Lower Circuit ({circuits.lower_circuit}). Cannot execute Sell orders."
            ))
            rejections.append("Locked at Lower Circuit (No Buyers)")
        else:
            checks.append(RiskCheckResult(
                status=RiskCheckStatus.APPROVED,
                rule_name="CIRCUIT_LIMIT_LOCK",
                passed=True,
                message="Instrument trading within permissible circuit bands."
            ))

        # Gate 7 & 8: Duplicate Order Lock and Daily Loss Kill-Switch (guarded check-then-act)
        with self._lock:
            now_ts = time.time()
            is_duplicate = False
            for o in self._recent_orders:
                if o["symbol"] == symbol_clean and o["side"] == side.upper() and (now_ts - o["time"] < self.duplicate_lock_seconds):
                    is_duplicate = True
                    break

            if is_duplicate:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.REJECTED,
                    rule_name="DUPLICATE_ORDER_LOCK",
                    passed=False,
                    message=f"Duplicate order lock: Identical {side} order on {symbol_clean} placed within last {self.duplicate_lock_seconds}s."
                ))
                rejections.append("Duplicate Order Throttled")
            else:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.APPROVED,
                    rule_name="DUPLICATE_ORDER_LOCK",
                    passed=True,
                    message="No duplicate orders detected."
                ))

            # Gate 8: Max Daily Loss Threshold Check
            if self._daily_loss_date != time.strftime("%Y-%m-%d"):
                self._daily_loss_date = time.strftime("%Y-%m-%d")
                self._daily_realized_loss = 0.0
            if self._daily_realized_loss >= self.max_daily_loss_limit:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.REJECTED,
                    rule_name="DAILY_LOSS_KILL_SWITCH",
                    passed=False,
                    message=f"Daily loss limit (₹{self.max_daily_loss_limit:,.2f}) breached. Trading halted for the session."
                ))
                rejections.append("Daily Loss Circuit Breaker Active")
            else:
                checks.append(RiskCheckResult(
                    status=RiskCheckStatus.APPROVED,
                    rule_name="DAILY_LOSS_KILL_SWITCH",
                    passed=True,
                    message="Account within permissible daily loss boundary."
                ))

            is_approved = len(rejections) == 0

            if is_approved and record:
                self._recent_orders.append({
                    "symbol": symbol_clean,
                    "side": side.upper(),
                    "quantity": quantity,
                    "time": now_ts
                })
                # Clean older than 60s
                self._recent_orders = [o for o in self._recent_orders if now_ts - o["time"] < 60.0]

        passed_count = sum(1 for c in checks if c.passed)
        failed_count = len(checks) - passed_count

        return PreTradeRiskEvaluation(
            is_approved=is_approved,
            symbol=symbol_clean,
            quantity=quantity,
            price=price,
            order_value=order_value,
            total_checks=len(checks),
            passed_checks=passed_count,
            failed_checks=failed_count,
            checks=checks,
            rejection_reasons=rejections,
            timestamp=time.strftime("%H:%M:%S")
        )

# Global Risk Engine Singleton
risk_engine = DedicatedRiskEngine()
