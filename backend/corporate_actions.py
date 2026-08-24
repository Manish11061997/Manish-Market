from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class CorporateActionType(str, Enum):
    STOCK_SPLIT = "STOCK_SPLIT"
    BONUS_ISSUE = "BONUS_ISSUE"
    DIVIDEND = "DIVIDEND"
    RIGHTS_ISSUE = "RIGHTS_ISSUE"
    MERGER = "MERGER"
    ACQUISITION = "ACQUISITION"
    SYMBOL_CHANGE = "SYMBOL_CHANGE"

@dataclass
class CorporateAction:
    symbol: str
    action_type: CorporateActionType
    ex_date: str           # "YYYY-MM-DD"
    record_date: str       # "YYYY-MM-DD"
    ratio: Optional[str]   # e.g., "1:1", "10:1", "1:2"
    adjustment_factor: float # e.g., 0.5 for 1:1 bonus/split, 0.1 for 10:1 split
    dividend_amount: Optional[float] = None # In INR/USD per share
    description: str = ""

class CorporateActionsManager:
    """
    Tracks corporate actions and calculates unadjusted vs adjusted historical price series.
    Guarantees historical charts and indicator engines do not distort price series across event boundaries.
    """

    def __init__(self):
        self._actions_by_symbol: Dict[str, List[CorporateAction]] = {}
        self._initialize_sample_actions()

    def _initialize_sample_actions(self):
        # Sample historical corporate actions for key universe instruments
        actions = [
            CorporateAction(
                symbol="RELIANCE.NS",
                action_type=CorporateActionType.BONUS_ISSUE,
                ex_date="2024-10-28",
                record_date="2024-10-29",
                ratio="1:1",
                adjustment_factor=0.5,
                dividend_amount=None,
                description="Bonus issue 1:1 approved by Reliance Board"
            ),
            CorporateAction(
                symbol="RELIANCE.NS",
                action_type=CorporateActionType.DIVIDEND,
                ex_date="2024-08-19",
                record_date="2024-08-20",
                ratio=None,
                adjustment_factor=1.0,
                dividend_amount=10.0,
                description="Final Dividend of ₹10.00 per share"
            ),
            CorporateAction(
                symbol="TCS.NS",
                action_type=CorporateActionType.DIVIDEND,
                ex_date="2024-10-18",
                record_date="2024-10-19",
                ratio=None,
                adjustment_factor=1.0,
                dividend_amount=28.0,
                description="Interim & Special Dividend ₹28.00 per share"
            ),
            CorporateAction(
                symbol="NVDA",
                action_type=CorporateActionType.STOCK_SPLIT,
                ex_date="2024-06-10",
                record_date="2024-06-11",
                ratio="10:1",
                adjustment_factor=0.1,
                dividend_amount=None,
                description="10-for-1 Forward Stock Split"
            ),
            CorporateAction(
                symbol="AAPL",
                action_type=CorporateActionType.DIVIDEND,
                ex_date="2024-11-08",
                record_date="2024-11-11",
                ratio=None,
                adjustment_factor=1.0,
                dividend_amount=0.25,
                description="Quarterly Cash Dividend $0.25"
            ),
            CorporateAction(
                symbol="INFY.NS",
                action_type=CorporateActionType.DIVIDEND,
                ex_date="2024-10-25",
                record_date="2024-10-26",
                ratio=None,
                adjustment_factor=1.0,
                dividend_amount=21.0,
                description="Interim Dividend ₹21.00 per share"
            )
        ]
        for a in actions:
            self.add_action(a)

    def add_action(self, action: CorporateAction):
        sym = action.symbol.upper()
        if sym not in self._actions_by_symbol:
            self._actions_by_symbol[sym] = []
        self._actions_by_symbol[sym].append(action)

    def get_actions(self, symbol: str) -> List[CorporateAction]:
        clean = symbol.upper().strip().lstrip("$")
        direct = self._actions_by_symbol.get(clean, [])
        if not direct and not clean.endswith(".NS"):
            direct = self._actions_by_symbol.get(f"{clean}.NS", [])
        return direct

    def apply_adjustments(self, df: pd.DataFrame, symbol: str, adjusted: bool = True) -> pd.DataFrame:
        """
        Produce either Raw Traded Prices or Corporate Action Adjusted Prices.
        If adjusted is True:
          - Applies cumulative split/bonus factors to historical bars prior to ex-dates.
          - Leaves raw columns intact as 'Raw_Close', 'Raw_Open', etc.
        """
        if df.empty:
            return df

        actions = self.get_actions(symbol)
        if not actions or not adjusted:
            return df

        result_df = df.copy()
        
        # Ensure raw prices are preserved
        for col in ['Open', 'High', 'Low', 'Close']:
            if col in result_df.columns:
                result_df[f'Raw_{col}'] = result_df[col]

        for action in actions:
            if action.action_type in [CorporateActionType.STOCK_SPLIT, CorporateActionType.BONUS_ISSUE]:
                try:
                    ex_dt = pd.to_datetime(action.ex_date).tz_localize(None)
                    
                    # Apply adjustment factor to all rows before the ex_date
                    idx_dates = pd.to_datetime(result_df.index).tz_localize(None)
                    mask = idx_dates < ex_dt

                    if mask.any():
                        factor = action.adjustment_factor
                        for col in ['Open', 'High', 'Low', 'Close']:
                            if col in result_df.columns:
                                result_df.loc[mask, col] = result_df.loc[mask, col] * factor
                        if 'Volume' in result_df.columns and factor > 0:
                            result_df.loc[mask, 'Volume'] = (result_df.loc[mask, 'Volume'] / factor).astype(int)
                except Exception as e:
                    logger.warning(f"Error applying corporate action adjustment for {symbol}: {e}")

        return result_df

# Global Corporate Actions Manager Singleton
corporate_actions = CorporateActionsManager()
