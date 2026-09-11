from analysis_models import IndicatorValues

class MultiTimeframeEngine:
    @staticmethod
    def evaluate_alignment(
        lower_tf_indicators: IndicatorValues,
        higher_tf_indicators: IndicatorValues = None
    ) -> tuple[str, list[str]]:
        """
        Evaluates multi-timeframe alignment across Lower TF and Higher TF:
        Returns (alignment_status, conflict_warnings).
        When higher_tf_indicators is not provided, uses multiple single-TF indicators
        to approximate alignment assessment.
        """
        conflicts = []
        if higher_tf_indicators is None:
            rsi = lower_tf_indicators.rsi or 50.0
            macd_hist = lower_tf_indicators.macdHist or 0.0
            adx = lower_tf_indicators.adx or 20.0
            vwap_slope = lower_tf_indicators.vwapSlope or "FLAT"

            # Use multiple indicators for better alignment assessment
            bull_signals = 0
            bear_signals = 0
            if rsi >= 60:
                bull_signals += 1
            elif rsi <= 40:
                bear_signals += 1
            if macd_hist > 0:
                bull_signals += 1
            elif macd_hist < 0:
                bear_signals += 1
            if vwap_slope == "RISING":
                bull_signals += 1
            elif vwap_slope == "FALLING":
                bear_signals += 1
            if adx > 25:
                # Strong trend - amplify signal
                if bull_signals > bear_signals:
                    bull_signals += 1
                elif bear_signals > bull_signals:
                    bear_signals += 1

            if bull_signals >= 3:
                conflicts.append("Note: Higher timeframe indicators not available; assessment based on single timeframe")
                return "ALIGNED_BULLISH", conflicts
            elif bull_signals >= 2:
                conflicts.append("Note: Higher timeframe indicators not available; assessment based on single timeframe")
                return "MOSTLY_BULLISH", conflicts
            elif bear_signals >= 3:
                conflicts.append("Note: Higher timeframe indicators not available; assessment based on single timeframe")
                return "ALIGNED_BEARISH", conflicts
            elif bear_signals >= 2:
                conflicts.append("Note: Higher timeframe indicators not available; assessment based on single timeframe")
                return "MOSTLY_BEARISH", conflicts
            else:
                conflicts.append("Note: Higher timeframe indicators not available; assessment based on single timeframe")
                return "MIXED", conflicts

        ltf_rsi = lower_tf_indicators.rsi or 50.0
        htf_rsi = higher_tf_indicators.rsi or 50.0

        ltf_bull = ltf_rsi >= 50
        htf_bull = htf_rsi >= 50

        # Conflict Detection
        if ltf_bull and not htf_bull:
            conflicts.append("CONFLICT: Lower timeframe exhibits bullish momentum into Higher Timeframe bearish trend")
        elif not ltf_bull and htf_bull:
            conflicts.append("CONFLICT: Lower timeframe exhibits pullback into Higher Timeframe bullish uptrend")

        if ltf_bull and htf_bull:
            alignment = "ALIGNED_BULLISH" if ltf_rsi > 60 and htf_rsi > 58 else "MOSTLY_BULLISH"
        elif not ltf_bull and not htf_bull:
            alignment = "ALIGNED_BEARISH" if ltf_rsi < 40 and htf_rsi < 42 else "MOSTLY_BEARISH"
        else:
            alignment = "MIXED"

        return alignment, conflicts
