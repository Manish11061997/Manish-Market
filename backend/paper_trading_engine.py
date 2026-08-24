from typing import Dict, List, Optional
import time
import logging

from oms import oms_engine, ManagedOrder
from event_bus import event_bus
from risk_manager import risk_engine

logger = logging.getLogger(__name__)

class PaperTradingCoordinator:
    """
    High-Level Paper Trading Terminal Coordinator.
    Provides complete paper execution sandbox with virtual capital, live tick position updates,
    risk previews, and simulated execution.
    """

    def __init__(self):
        self.oms = oms_engine
        self.is_active = True
        
        # Subscribe to Event Bus to update position P&L on every live tick
        event_bus.subscribe("TICK_STREAM", self._on_tick_update)

    def _on_tick_update(self, ticks: Dict[str, dict]):
        if self.is_active:
            self.oms.update_live_positions(ticks)

    def place_paper_order(
        self,
        symbol: str,
        side: str,
        quantity: int,
        price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        order_type: str = "MARKET"
    ) -> dict:
        """Place simulated order with full pre-trade risk validation and OMS tracking."""
        order = self.oms.submit_order(
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=price,
            stop_loss=stop_loss,
            take_profit=take_profit,
            order_type=order_type
        )
        return order.to_dict()

    def get_portfolio(self) -> dict:
        summary = self.oms.get_portfolio_summary()
        positions = self.oms.get_positions()
        orders = self.oms.get_orders()

        cash_bal = summary.get("cashBalance", 1000000.0)
        total_val = summary.get("totalEquity", 1000000.0)

        return {
            "mode": "PAPER_TRADING",
            "cashBalance": cash_bal,
            "totalPortfolioValue": total_val,
            "summary": summary,
            "positions": positions,
            "orders": orders
        }

    def reset_paper_account(self, initial_capital: float = 1000000.0):
        self.oms.reset(initial_capital)
        logger.info(f"Paper Trading Account reset to initial balance: ₹{initial_capital:,.2f}")

# Global Paper Trading Coordinator Singleton
paper_trading_coordinator = PaperTradingCoordinator()
