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
        """
        conflicts = []
        if higher_tf_indicators is None:
            rsi = lower_tf_indicators.rsi or 50.0
            if rsi >= 60 and lower_tf_indicators.vwapSlope == "RISING":
                return "ALIGNED_BULLISH", conflicts
            elif rsi >= 52:
                return "MOSTLY_BULLISH", conflicts
            elif rsi <= 40 and lower_tf_indicators.vwapSlope == "FALLING":
                return "ALIGNED_BEARISH", conflicts
            elif rsi <= 48:
                return "MOSTLY_BEARISH", conflicts
            else:
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
