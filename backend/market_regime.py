import pandas as pd
from analysis_models import IndicatorValues

class MarketRegimeEngine:
    @staticmethod
    def detect_regime(df: pd.DataFrame, indicators: IndicatorValues) -> str:
        """
        Classifies current market environment into 8 distinct regimes:
        - STRONG_UPTREND
        - UPTREND
        - RANGE_BOUND
        - DOWNTREND
        - STRONG_DOWNTREND
        - HIGH_VOLATILITY
        - LOW_VOLATILITY
        - UNCERTAIN
        """
        if df.empty or len(df) < 10:
            return "UNCERTAIN"

        price = float(df['Close'].iloc[-1])
        ema20 = indicators.ema20 or price
        ema50 = indicators.ema50 or price
        ema200 = indicators.ema200 or price
        adx = indicators.adx or 20.0
        atr = indicators.atr or (price * 0.02)
        atr_pct = (atr / price) * 100 if price > 0 else 2.0

        # Check high volatility environment
        if atr_pct > 3.5:
            return "HIGH_VOLATILITY"

        # Moving Average Alignment
        is_bull_ma = price > ema20 > ema50
        is_bear_ma = price < ema20 < ema50

        if is_bull_ma and adx > 25:
            return "STRONG_UPTREND"
        elif is_bull_ma or price > ema20:
            return "UPTREND"
        elif is_bear_ma and adx > 25:
            return "STRONG_DOWNTREND"
        elif is_bear_ma or price < ema20:
            return "DOWNTREND"
        elif adx < 18 and atr_pct < 1.5:
            return "LOW_VOLATILITY"
        elif adx < 20:
            return "RANGE_BOUND"
        else:
            return "UNCERTAIN"
