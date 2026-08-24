import pandas as pd
import numpy as np

class PriceActionEngine:
    @staticmethod
    def analyze_structure(df: pd.DataFrame) -> dict:
        """
        Analyze price action market structure:
        - Higher Highs / Higher Lows (HH/HL)
        - Lower Highs / Lower Lows (LH/LL)
        - Trend continuation/reversal
        """
        if df.empty or len(df) < 10:
            return {
                "structure": "NEUTRAL",
                "trend": "SIDEWAYS",
                "evidence": ["Insufficient candles for price action structure"]
            }

        highs = df['High'].values
        lows = df['Low'].values
        closes = df['Close'].values

        # Peak and trough detection (pivots over window of 3)
        pivot_highs = []
        pivot_lows = []
        for i in range(2, len(df) - 2):
            if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
                pivot_highs.append(highs[i])
            if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
                pivot_lows.append(lows[i])

        is_hh = len(pivot_highs) >= 2 and pivot_highs[-1] > pivot_highs[-2]
        is_hl = len(pivot_lows) >= 2 and pivot_lows[-1] > pivot_lows[-2]
        is_lh = len(pivot_highs) >= 2 and pivot_highs[-1] < pivot_highs[-2]
        is_ll = len(pivot_lows) >= 2 and pivot_lows[-1] < pivot_lows[-2]

        evidence = []
        if is_hh and is_hl:
            structure = "HH_HL_BULLISH"
            trend = "BULLISH"
            evidence.append("Confirmed Higher Highs and Higher Lows structure")
        elif is_lh and is_ll:
            structure = "LH_LL_BEARISH"
            trend = "BEARISH"
            evidence.append("Confirmed Lower Highs and Lower Lows structure")
        elif closes[-1] > closes[0]:
            structure = "MILD_UPTREND"
            trend = "BULLISH"
            evidence.append("Overall price trajectory is upwards")
        elif closes[-1] < closes[0]:
            structure = "MILD_DOWNTREND"
            trend = "BEARISH"
            evidence.append("Overall price trajectory is downwards")
        else:
            structure = "SIDEWAYS"
            trend = "SIDEWAYS"
            evidence.append("Price consolidating within trading range")

        return {
            "structure": structure,
            "trend": trend,
            "evidence": evidence
        }

class SupportResistanceEngine:
    @staticmethod
    def calculate_zones(df: pd.DataFrame) -> dict:
        """
        Calculates key price zones:
        - Previous Day High / Low / Close
        - Major Support Zone (Low Range)
        - Major Resistance Zone (High Range)
        """
        if df.empty:
            return {
                "supportZone": {"low": 0.0, "high": 0.0},
                "resistanceZone": {"low": 0.0, "high": 0.0},
                "prevDayHigh": 0.0,
                "prevDayLow": 0.0,
                "prevClose": 0.0
            }

        price = float(df['Close'].iloc[-1])
        high_val = float(df['High'].max())
        low_val = float(df['Low'].min())

        # Previous day / candle levels
        prev_high = float(df['High'].iloc[-2]) if len(df) >= 2 else high_val
        prev_low = float(df['Low'].iloc[-2]) if len(df) >= 2 else low_val
        prev_close = float(df['Close'].iloc[-2]) if len(df) >= 2 else price

        # Support Zone (bottom 5% range)
        support_base = low_val
        support_top = low_val * 1.015

        # Resistance Zone (top 5% range)
        resistance_base = high_val * 0.985
        resistance_top = high_val

        return {
            "supportZone": {"low": round(support_base, 2), "high": round(support_top, 2)},
            "resistanceZone": {"low": round(resistance_base, 2), "high": round(resistance_top, 2)},
            "prevDayHigh": round(prev_high, 2),
            "prevDayLow": round(prev_low, 2),
            "prevClose": round(prev_close, 2)
        }
