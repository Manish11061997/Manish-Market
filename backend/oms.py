from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
import uuid
import time
import threading
import logging

from risk_manager import risk_engine, PreTradeRiskEvaluation
from broker_adapter import BaseBrokerAdapter, paper_broker_adapter

logger = logging.getLogger(__name__)

class OrderStatus(str, Enum):
    CREATED = "CREATED"
    RISK_VALIDATING = "RISK_VALIDATING"
    RISK_APPROVED = "RISK_APPROVED"
    RISK_REJECTED = "RISK_REJECTED"
    BROKER_SUBMITTED = "BROKER_SUBMITTED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

@dataclass
class ManagedOrder:
    order_id: str
    idempotency_key: str
    symbol: str
    side: str # "BUY" or "SELL"
    quantity: int
    requested_price: float
    order_type: str # "MARKET" or "LIMIT"
    stop_loss: Optional[float]
    take_profit: Optional[float]
    status: OrderStatus
    risk_evaluation: Optional[PreTradeRiskEvaluation] = None
    broker_order_id: Optional[str] = None
    filled_price: float = 0.0
    filled_quantity: int = 0
    slippage: float = 0.0
    created_time: str = ""
    updated_time: str = ""
    error_message: str = ""

    def to_dict(self) -> dict:
        return {
            "orderId": self.order_id,
            "idempotencyKey": self.idempotency_key,
            "symbol": self.symbol,
            "side": self.side,
            "quantity": self.quantity,
            "requestedPrice": self.requested_price,
            "orderType": self.order_type,
            "stopLoss": self.stop_loss,
            "takeProfit": self.take_profit,
            "status": self.status.value,
            "riskEvaluation": self.risk_evaluation.to_dict() if self.risk_evaluation else None,
            "brokerOrderId": self.broker_order_id,
            "filledPrice": self.filled_price,
            "filledQuantity": self.filled_quantity,
            "slippage": self.slippage,
            "createdTime": self.created_time,
            "updatedTime": self.updated_time,
            "errorMessage": self.error_message
        }

@dataclass
class Position:
    symbol: str
    quantity: int
    average_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float
    pnl_percent: float

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "quantity": self.quantity,
            "averagePrice": round(self.average_price, 2),
            "currentPrice": round(self.current_price, 2),
            "unrealizedPnl": round(self.unrealized_pnl, 2),
            "realizedPnl": round(self.realized_pnl, 2),
            "pnlPercent": round(self.pnl_percent, 2),
            "marketValue": round(self.quantity * self.current_price, 2)
        }

class OrderManagementSystem:
    """
    Institutional Order Management System (OMS).
    Tracks the end-to-end lifecycle of every trading order, manages position books,
    enforces pre-trade risk approvals, and routes orders through the designated Broker Adapter.
    """

    def __init__(self, initial_capital: float = 1000000.0, broker_adapter: Optional[BaseBrokerAdapter] = None):
        self.initial_capital = initial_capital
        self.cash_balance = initial_capital
        self.broker_adapter = broker_adapter or paper_broker_adapter
        
        self._orders: Dict[str, ManagedOrder] = {}
        self._idempotency_set: set = set()
        self._positions: Dict[str, Position] = {}
        self._realized_pnl_total = 0.0
        self._lock = threading.RLock()

    def reset(self, initial_capital: float):
        with self._lock:
            self.initial_capital = initial_capital
            self.cash_balance = initial_capital
            self._orders.clear()
            self._positions.clear()
            self._realized_pnl_total = 0.0

    def submit_order(
        self,
        symbol: str,
        side: str,
        quantity: int,
        price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        order_type: str = "MARKET",
        idempotency_key: Optional[str] = None
    ) -> ManagedOrder:
        with self._lock:
            return self._place_order(
                symbol=symbol,
                side=side,
                quantity=quantity,
                price=price,
                stop_loss=stop_loss,
                take_profit=take_profit,
                order_type=order_type,
                idempotency_key=idempotency_key
            )

    def _place_order(
        self,
        symbol: str,
        side: str,
        quantity: int,
        price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        order_type: str = "MARKET",
        idempotency_key: Optional[str] = None
    ) -> ManagedOrder:
        order_id = str(uuid.uuid4())
        idem_key = idempotency_key or f"IDEM_{uuid.uuid4().hex[:12]}"
        now_str = time.strftime("%H:%M:%S")

        # 1. Duplicate Request Protection (Idempotency)
        if idem_key in self._idempotency_set:
            existing = next((o for o in self._orders.values() if o.idempotency_key == idem_key), None)
            if existing:
                logger.warning(f"Duplicate order submission ignored for idempotency key: {idem_key}")
                return existing

        self._idempotency_set.add(idem_key)

        order = ManagedOrder(
            order_id=order_id,
            idempotency_key=idem_key,
            symbol=symbol.upper(),
            side=side.upper(),
            quantity=quantity,
            requested_price=price,
            order_type=order_type,
            stop_loss=stop_loss,
            take_profit=take_profit,
            status=OrderStatus.CREATED,
            created_time=now_str,
            updated_time=now_str
        )
        self._orders[order_id] = order

        # 2. Risk Engine Validation Gate
        order.status = OrderStatus.RISK_VALIDATING
        pos_dict = {k: v.to_dict() for k, v in self._positions.items()}
        risk_res = risk_engine.evaluate_order(
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=price,
            stop_loss=stop_loss,
            take_profit=take_profit,
            account_balance=self.cash_balance,
            portfolio_positions=pos_dict,
            is_paper=self.broker_adapter.is_paper_trading
        )
        order.risk_evaluation = risk_res

        if not risk_res.is_approved:
            order.status = OrderStatus.RISK_REJECTED
            order.error_message = "; ".join(risk_res.rejection_reasons)
            order.updated_time = time.strftime("%H:%M:%S")
            logger.warning(f"OMS Order {order_id} REJECTED by Risk Engine: {order.error_message}")
            return order

        order.status = OrderStatus.RISK_APPROVED

        # 3. Pre-Trade Position Gate (no short selling)
        if order.side == "SELL":
            pos = self._positions.get(order.symbol)
            held = pos.quantity if pos else 0
            if quantity > held:
                order.status = OrderStatus.RISK_REJECTED
                order.error_message = f"insufficient position: SELL {quantity} exceeds held {held} for {order.symbol}."
                order.updated_time = time.strftime("%H:%M:%S")
                logger.warning(f"OMS Order {order_id} REJECTED pre-trade: {order.error_message}")
                return order

        # 4. Route to Broker Adapter
        order.status = OrderStatus.BROKER_SUBMITTED
        try:
            broker_resp = self.broker_adapter.place_order({
                "orderId": order_id,
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "price": price,
                "orderType": order_type
            })

            order.broker_order_id = broker_resp.broker_order_id
            order.updated_time = time.strftime("%H:%M:%S")

            if broker_resp.status == "FILLED":
                order.status = OrderStatus.FILLED
                order.filled_price = broker_resp.fill_price
                order.filled_quantity = broker_resp.fill_quantity
                order.slippage = broker_resp.slippage
                
                # 5. Update Portfolio Positions & Balances
                self._update_position_on_fill(order)
            else:
                order.status = OrderStatus.ACKNOWLEDGED

        except Exception as e:
            order.status = OrderStatus.REJECTED
            order.error_message = str(e)
            logger.error(f"Broker order placement failed: {e}")

        return order

    def _update_position_on_fill(self, order: ManagedOrder):
        sym = order.symbol
        qty = order.filled_quantity
        fill_p = order.filled_price
        side = order.side

        if side == "BUY":
            cost = qty * fill_p
            self.cash_balance -= cost
            if sym in self._positions:
                pos = self._positions[sym]
                total_qty = pos.quantity + qty
                pos.average_price = ((pos.quantity * pos.average_price) + cost) / total_qty
                pos.quantity = total_qty
            else:
                self._positions[sym] = Position(
                    symbol=sym,
                    quantity=qty,
                    average_price=fill_p,
                    current_price=fill_p,
                    unrealized_pnl=0.0,
                    realized_pnl=0.0,
                    pnl_percent=0.0
                )
        elif side == "SELL":
            pos = self._positions.get(sym)
            if not pos:
                order.status = OrderStatus.REJECTED
                order.error_message = f"No open position in {sym} to sell (short selling is not permitted)."
                order.updated_time = time.strftime("%H:%M:%S")
                return
            if qty > pos.quantity:
                order.status = OrderStatus.REJECTED
                order.error_message = f"SELL quantity {qty} exceeds held position of {pos.quantity} for {sym}."
                order.updated_time = time.strftime("%H:%M:%S")
                return
            proceeds = qty * fill_p
            self.cash_balance += proceeds
            realized = (fill_p - pos.average_price) * qty
            pos.realized_pnl += realized
            self._realized_pnl_total += realized
            risk_engine.record_realized_loss(max(-realized, 0.0))
            pos.quantity -= qty
            if pos.quantity <= 0:
                del self._positions[sym]

    def update_live_positions(self, ticks: Dict[str, dict]):
        """Update live unrealized P&L for all active positions."""
        with self._lock:
            for sym, pos in self._positions.items():
                if sym in ticks:
                    curr_p = ticks[sym]["price"]
                    pos.current_price = curr_p
                    pos.unrealized_pnl = (curr_p - pos.average_price) * pos.quantity
                    if pos.average_price > 0:
                        pos.pnl_percent = ((curr_p - pos.average_price) / pos.average_price) * 100.0

    def get_portfolio_summary(self) -> dict:
        with self._lock:
            total_market_val = sum(p.quantity * p.current_price for p in self._positions.values())
            total_equity = self.cash_balance + total_market_val
            total_unrealized = sum(p.unrealized_pnl for p in self._positions.values())
            total_pnl = self._realized_pnl_total + total_unrealized
            pnl_pct = ((total_equity - self.initial_capital) / self.initial_capital) * 100.0
            positions_count = len(self._positions)
            orders_count = len(self._orders)

            return {
                "initialCapital": round(self.initial_capital, 2),
                "cashBalance": round(self.cash_balance, 2),
                "marketValue": round(total_market_val, 2),
                "totalEquity": round(total_equity, 2),
                "unrealizedPnl": round(total_unrealized, 2),
                "realizedPnl": round(self._realized_pnl_total, 2),
                "totalPnl": round(total_pnl, 2),
                "pnlPercent": round(pnl_pct, 2),
                "openPositionsCount": positions_count,
                "totalOrdersCount": orders_count
            }

    def get_orders(self) -> List[dict]:
        with self._lock:
            return [o.to_dict() for o in reversed(list(self._orders.values()))]

    def get_positions(self) -> List[dict]:
        with self._lock:
            return [p.to_dict() for p in dict(self._positions).values()]

# Global Order Management System Singleton
oms_engine = OrderManagementSystem()
