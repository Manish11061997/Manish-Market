import pandas as pd
import numpy as np
from analysis_models import PatternEvidence

class PatternDetectionEngine:
    @staticmethod
    def detect_orb(df: pd.DataFrame, orb_minutes: int = 15, vwap_val: float = None) -> PatternEvidence:
        """
        Opening Range Breakout (ORB) Engine supporting 5m, 15m, 30m periods.
        """
        if df.empty or len(df) < 5:
            return PatternEvidence(
                patternName="ORB",
                confidence=0.0,
                evidence=["Insufficient intraday candles for ORB analysis"],
                confirmation=[],
                invalidation="Price drop below opening range low",
                risk="Lack of volume momentum"
            )

        price = float(df['Close'].iloc[-1])
        vol_ratio = float(df['Volume'].iloc[-1] / df['Volume'].mean()) if df['Volume'].mean() > 0 else 1.0

        # Calculate opening range from first N candles (e.g. 15m)
        orb_candles = max(1, orb_minutes // 5)
        orb_high = float(df['High'].iloc[:orb_candles].max())
        orb_low = float(df['Low'].iloc[:orb_candles].min())

        is_breakout = price > orb_high
        is_breakdown = price < orb_low
        has_volume = vol_ratio > 1.3

        evidence = [f"Opening Range ({orb_minutes}m): ₹{orb_low:.2f} - ₹{orb_high:.2f}"]
        confirmation = []

        if is_breakout:
            confidence = 85.0 if has_volume else 65.0
            evidence.append(f"Price broke above {orb_minutes}m Opening High (₹{orb_high:.2f})")
            if has_volume:
                confirmation.append(f"Above-average volume expansion (RVOL: {vol_ratio:.1f}x)")
            if vwap_val and price > vwap_val:
                confirmation.append("Price trading cleanly above VWAP")
            pattern_name = f"ORB_{orb_minutes}M_BULLISH_BREAKOUT"
            invalidation = f"Price close below ORB High (₹{orb_high:.2f})"
            risk = "Failed breakout / Fakeout trap"
        elif is_breakdown:
            confidence = 85.0 if has_volume else 65.0
            evidence.append(f"Price broke below {orb_minutes}m Opening Low (₹{orb_low:.2f})")
            if has_volume:
                confirmation.append(f"Above-average volume expansion (RVOL: {vol_ratio:.1f}x)")
            pattern_name = f"ORB_{orb_minutes}M_BEARISH_BREAKDOWN"
            invalidation = f"Price close above ORB Low (₹{orb_low:.2f})"
            risk = "Bull trap / Short squeeze"
        else:
            confidence = 40.0
            evidence.append(f"Price inside {orb_minutes}m Opening Range (₹{orb_low:.2f} - ₹{orb_high:.2f})")
            pattern_name = f"ORB_{orb_minutes}M_CONSOLIDATION"
            invalidation = f"Breakout above ₹{orb_high:.2f} or breakdown below ₹{orb_low:.2f}"
            risk = "Chop / Whipsaw risk"

        return PatternEvidence(
            patternName=pattern_name,
            confidence=confidence,
            evidence=evidence,
            confirmation=confirmation,
            invalidation=invalidation,
            risk=risk
        )

    @staticmethod
    def detect_breakout_retest(df: pd.DataFrame, resistance_level: float) -> PatternEvidence:
        """
        Breakout + Retest Engine.
        Distinguishes: Genuine Breakout, Weak Breakout, False Breakout / Rejection.
        """
        if df.empty or len(df) < 5 or resistance_level <= 0:
            return PatternEvidence(
                patternName="BREAKOUT_RETEST",
                confidence=0.0,
                evidence=["Insufficient data"],
                confirmation=[],
                invalidation="Close below breakout level",
                risk="False breakout"
            )

        price = float(df['Close'].iloc[-1])
        low_recent = float(df['Low'].iloc[-3:].min())
        vol_recent = float(df['Volume'].iloc[-3:].mean())
        vol_avg = float(df['Volume'].mean())
        rvol = vol_recent / vol_avg if vol_avg > 0 else 1.0

        is_above = price > resistance_level
        retested = low_recent <= resistance_level * 1.005 and price > resistance_level

        evidence = [f"Key Resistance Level: ₹{resistance_level:.2f}"]
        confirmation = []

        if is_above and retested:
            confidence = 88.0 if rvol > 1.2 else 72.0
            evidence.append(f"Resistance at ₹{resistance_level:.2f} broken and retested successfully")
            if rvol > 1.2:
                confirmation.append(f"Volume expansion on continuation (RVOL: {rvol:.1f}x)")
            pattern_name = "GENUINE_BREAKOUT_AND_RETEST"
            invalidation = f"Close below retest zone ₹{resistance_level:.2f}"
            risk = "Late entry / Extended price"
        elif is_above:
            confidence = 65.0
            evidence.append(f"Price above resistance ₹{resistance_level:.2f} without retest")
            pattern_name = "UNTESTED_BREAKOUT"
            invalidation = f"Close below ₹{resistance_level:.2f}"
            risk = "Pullback risk / False breakout"
        else:
            confidence = 35.0
            evidence.append(f"Price below resistance ₹{resistance_level:.2f}")
            pattern_name = "RESISTANCE_REJECTION"
            invalidation = f"Clean breakout above ₹{resistance_level:.2f}"
            risk = "Continued downtrend"

        return PatternEvidence(
            patternName=pattern_name,
            confidence=confidence,
            evidence=evidence,
            confirmation=confirmation,
            invalidation=invalidation,
            risk=risk
        )

    @staticmethod
    def detect_consolidation_vcp(df: pd.DataFrame) -> PatternEvidence:
        """
        Consolidation & Volatility Contraction Pattern (VCP) Engine.
        Detects tight consolidation, flag/pennant, or triangle structures.
        """
        if df.empty or len(df) < 15:
            return PatternEvidence(
                patternName="CONSOLIDATION_VCP",
                confidence=0.0,
                evidence=["Insufficient candle history"],
                confirmation=[],
                invalidation="Range breakdown",
                risk="Loss of momentum"
            )

        high_range = float(df['High'].iloc[-15:].max())
        low_range = float(df['Low'].iloc[-15:].min())
        price = float(df['Close'].iloc[-1])
        range_pct = (high_range - low_range) / low_range * 100

        is_tight = range_pct < 6.0
        is_near_high = (price - low_range) / (high_range - low_range) > 0.70 if high_range > low_range else False

        evidence = [f"15-candle Trading Range: {range_pct:.1f}%"]
        confirmation = []

        if is_tight and is_near_high:
            confidence = 82.0
            evidence.append("Tight Volatility Contraction Pattern (VCP) near upper range boundary")
            confirmation.append("Coiled price structure preparing for explosive breakout")
            pattern_name = "VOLATILITY_CONTRACTION_VCP"
            invalidation = f"Drop below range low ₹{low_range:.2f}"
            risk = "Breakout delay / Whipsaw"
        elif is_tight:
            confidence = 70.0
            evidence.append("Price coiling in tight consolidation base")
            pattern_name = "TIGHT_CONSOLIDATION_BASE"
            invalidation = f"Range breakdown below ₹{low_range:.2f}"
            risk = "Breakdown risk"
        else:
            confidence = 45.0
            evidence.append(f"Wide volatility range ({range_pct:.1f}%)")
            pattern_name = "BROAD_CONSOLIDATION"
            invalidation = "N/A"
            risk = "High volatility risk"

        return PatternEvidence(
            patternName=pattern_name,
            confidence=confidence,
            evidence=evidence,
            confirmation=confirmation,
            invalidation=invalidation,
            risk=risk
        )
