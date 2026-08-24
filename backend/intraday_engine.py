import pandas as pd
from analysis_models import HorizonAnalysisResult, EntryZone, IndicatorValues
from data_validator import MarketDataService
from indicator_engine import IndicatorEngine
from price_action_engine import PriceActionEngine, SupportResistanceEngine
from pattern_engine import PatternDetectionEngine
from market_regime import MarketRegimeEngine
from multi_timeframe import MultiTimeframeEngine
from risk_engine import RiskManagementEngine

class IntradayStrategyEngine:
    @staticmethod
    def analyze(symbol: str, df: pd.DataFrame, orb_period: int = 15) -> HorizonAnalysisResult:
        """
        Executes Intraday Trading Horizon Engine pipeline.
        Weightings:
        - Price Action: 20%
        - Volume: 20%
        - Market Regime: 15%
        - VWAP: 15%
        - Momentum: 10%
        - Support/Resistance: 10%
        - Multi-Timeframe: 5%
        - Volatility: 5%
        """
        clean_df, data_status, data_issues = MarketDataService.validate_and_normalize(df, min_candles=10)
        if data_status != "VALID":
            return HorizonAnalysisResult(
                symbol=symbol,
                name=symbol.replace(".NS", ""),
                analysisType="INTRADAY",
                marketRegime="UNCERTAIN",
                trend="NEUTRAL",
                signal="INSUFFICIENT_DATA",
                setup="NONE",
                score=0,
                confidence=0.0,
                entryZone=EntryZone(low=0.0, high=0.0),
                stopLoss=0.0,
                targets=[0.0, 0.0],
                riskReward=0.0,
                bullishEvidence=[],
                bearishEvidence=[],
                neutralEvidence=data_issues,
                patterns=[],
                indicators=IndicatorValues(),
                timeframeAlignment="MIXED",
                invalidation="Data insufficient to perform technical evaluation",
                risks=["Insufficient market candles available"],
                missingData=data_issues,
                explanation="Intraday analysis halted due to insufficient or invalid candle data.",
                dataQualityStatus=data_status
            )

        price = float(clean_df['Close'].iloc[-1])
        indicators = IndicatorEngine.calculate_all(clean_df)
        pa = PriceActionEngine.analyze_structure(clean_df)
        sr = SupportResistanceEngine.calculate_zones(clean_df)
        regime = MarketRegimeEngine.detect_regime(clean_df, indicators)
        alignment, tf_conflicts = MultiTimeframeEngine.evaluate_alignment(indicators)

        orb_pattern = PatternDetectionEngine.detect_orb(clean_df, orb_minutes=orb_period, vwap_val=indicators.vwap)
        retest_pattern = PatternDetectionEngine.detect_breakout_retest(clean_df, sr["resistanceZone"]["high"])

        bullish_ev = []
        bearish_ev = []
        neutral_ev = []

        # 1. Price Action Score (20%)
        pa_score = 0
        if pa["trend"] == "BULLISH":
            pa_score = 20
            bullish_ev.append("Price action structure: Higher Highs & Higher Lows (HH/HL)")
        elif pa["trend"] == "BEARISH":
            pa_score = 5
            bearish_ev.append("Price action structure: Lower Highs & Lower Lows (LH/LL)")
        else:
            pa_score = 10
            neutral_ev.append("Price action consolidating within range")

        # 2. Volume Score (20%)
        vol_score = 0
        if indicators.rvol >= 1.5:
            vol_score = 20
            bullish_ev.append(f"Strong institutional volume surge (RVOL: {indicators.rvol:.1f}x)")
        elif indicators.rvol >= 1.1:
            vol_score = 14
            bullish_ev.append(f"Above-average volume expansion (RVOL: {indicators.rvol:.1f}x)")
        else:
            vol_score = 8
            neutral_ev.append(f"Subdued volume activity (RVOL: {indicators.rvol:.1f}x)")

        # 3. Market Regime Score (15%)
        regime_score = 0
        if regime in ["STRONG_UPTREND", "UPTREND"]:
            regime_score = 15
            bullish_ev.append(f"Favorable Market Regime: {regime}")
        elif regime in ["RANGE_BOUND", "LOW_VOLATILITY"]:
            regime_score = 8
            neutral_ev.append(f"Market Regime: {regime} - Rangebound conditions")
        else:
            regime_score = 4
            bearish_ev.append(f"Unfavorable Market Regime: {regime}")

        # 4. VWAP Score (15%)
        vwap_score = 0
        if indicators.vwap and price > indicators.vwap:
            vwap_score = 15
            bullish_ev.append(f"Price trading above VWAP (₹{indicators.vwap:.2f}) with {indicators.vwapSlope} slope")
        else:
            vwap_score = 5
            bearish_ev.append(f"Price trading below VWAP (₹{indicators.vwap:.2f})")

        # 5. Momentum Score (10%)
        mom_score = 0
        if indicators.rsiStatus in ["BULLISH", "OVERBOUGHT"] and indicators.macdHist > 0:
            mom_score = 10
            bullish_ev.append(f"RSI momentum ({indicators.rsi:.1f}) & MACD histogram positive")
        else:
            mom_score = 4
            neutral_ev.append(f"RSI neutral/bearish ({indicators.rsi:.1f})")

        # 6. Support/Resistance Score (10%)
        sr_score = 10 if price > sr["prevClose"] else 5
        if price > sr["prevClose"]:
            bullish_ev.append(f"Trading above previous close (₹{sr['prevClose']:.2f})")

        # 7. Multi-Timeframe Score (5%)
        mtf_score = 5 if alignment in ["ALIGNED_BULLISH", "MOSTLY_BULLISH"] else 2

        # 8. Volatility Score (5%)
        volatility_score = 5

        total_score = pa_score + vol_score + regime_score + vwap_score + mom_score + sr_score + mtf_score + volatility_score

        # Signal Classification
        if total_score >= 82:
            signal = "STRONG_LONG"
        elif total_score >= 68:
            signal = "LONG"
        elif total_score >= 50:
            signal = "WATCH"
        elif total_score >= 35:
            signal = "NEUTRAL"
        else:
            signal = "SHORT"

        # Risk Plan
        risk_plan = RiskManagementEngine.calculate_plan(
            price=price,
            atr=indicators.atr or (price * 0.015),
            support_price=sr["supportZone"]["low"],
            resistance_price=sr["resistanceZone"]["high"],
            is_bullish=signal in ["STRONG_LONG", "LONG", "WATCH"]
        )

        # Suggested Entry and Exit points
        suggested_entry = {
            "optimalEntryPrice": round((risk_plan.entryZone.low + risk_plan.entryZone.high) / 2, 2),
            "entryZoneRange": f"₹{risk_plan.entryZone.low:.2f} - ₹{risk_plan.entryZone.high:.2f}",
            "orderType": "LIMIT / RETEST BUY",
            "triggerCondition": f"Retest of VWAP or pullback into ₹{risk_plan.entryZone.low:.2f} - ₹{risk_plan.entryZone.high:.2f}"
        }

        suggested_exits = {
            "exitTarget1": {"price": risk_plan.target1, "label": "Partial Profit Exit (Target 1)", "timeframe": "1 - 2 Hours", "action": "Sell 50% & Move Stop to Breakeven"},
            "exitTarget2": {"price": risk_plan.target2, "label": "Full Profit Exit (Target 2)", "timeframe": "3 - 4 Hours", "action": "Sell 35% & Trail Remaining"},
            "exitTarget3": {"price": risk_plan.target3, "label": "Runner Exit (Target 3)", "timeframe": "Same-Day Session Close", "action": "Trail stop via 5-min EMA 9"},
            "stopLossExit": {"price": risk_plan.stopLoss, "label": "Risk Stop Exit", "timeframe": "Immediate Risk Cut", "action": "Hard Exit on 5-min Candle Close"}
        }

        return HorizonAnalysisResult(
            symbol=symbol,
            name=symbol.replace(".NS", ""),
            analysisType="INTRADAY",
            marketRegime=regime,
            trend=pa["trend"],
            signal=signal,
            setup=orb_pattern.patternName,
            score=total_score,
            confidence=round(total_score / 100.0, 2),
            entryZone=risk_plan.entryZone,
            suggestedEntryPoint=suggested_entry,
            suggestedExitPoints=suggested_exits,
            stopLoss=risk_plan.stopLoss,
            targets=[risk_plan.target1, risk_plan.target2, risk_plan.target3],
            targetTimeframes=["1 - 2 Hours", "3 - 4 Hours", "Same-Day Session Close"],
            riskReward=risk_plan.riskRewardRatio,
            bullishEvidence=bullish_ev,
            bearishEvidence=bearish_ev,
            neutralEvidence=neutral_ev + tf_conflicts,
            patterns=[orb_pattern, retest_pattern],
            indicators=indicators,
            timeframeAlignment=alignment,
            invalidation=risk_plan.invalidationCondition,
            risks=[orb_pattern.risk, "Overextension risk near key resistance"],
            missingData=[],
            explanation="", # Will be generated by AI layer
            dataQualityStatus="VALID"
        )
