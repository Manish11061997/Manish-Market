import pandas as pd
from analysis_models import HorizonAnalysisResult, EntryZone, IndicatorValues
from data_validator import MarketDataService
from indicator_engine import IndicatorEngine
from price_action_engine import PriceActionEngine, SupportResistanceEngine
from pattern_engine import PatternDetectionEngine
from market_regime import MarketRegimeEngine
from multi_timeframe import MultiTimeframeEngine
from risk_engine import RiskManagementEngine

class SwingStrategyEngine:
    @staticmethod
    def analyze(symbol: str, df: pd.DataFrame, benchmark_df: pd.DataFrame = None) -> HorizonAnalysisResult:
        """
        Executes Swing Trading Horizon Engine pipeline.
        Weightings:
        - Trend & 20/50/200 DMA Alignment: 20%
        - Breakout/Pattern (VCP): 20%
        - Volume Expansion: 15%
        - Momentum (RSI, MACD, ADX): 15%
        - Relative Strength vs Index: 10%
        - Support/Resistance Zones: 10%
        - Market Regime: 5%
        - Risk/Reward: 5%
        """
        clean_df, data_status, data_issues = MarketDataService.validate_and_normalize(df, min_candles=20)
        if data_status != "VALID":
            return HorizonAnalysisResult(
                symbol=symbol,
                name=symbol.replace(".NS", ""),
                analysisType="SWING",
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
                invalidation="Data insufficient for swing evaluation",
                risks=["Insufficient candle history"],
                missingData=data_issues,
                explanation="Swing analysis halted due to insufficient candle data.",
                dataQualityStatus=data_status
            )

        price = float(clean_df['Close'].iloc[-1])
        indicators = IndicatorEngine.calculate_all(clean_df, benchmark_df)
        pa = PriceActionEngine.analyze_structure(clean_df)
        sr = SupportResistanceEngine.calculate_zones(clean_df)
        regime = MarketRegimeEngine.detect_regime(clean_df, indicators)
        alignment, tf_conflicts = MultiTimeframeEngine.evaluate_alignment(indicators)

        vcp_pattern = PatternDetectionEngine.detect_consolidation_vcp(clean_df)

        bullish_ev = []
        bearish_ev = []
        neutral_ev = []

        # 1. Trend & MA Alignment (20%)
        trend_score = 0
        ema20 = indicators.ema20 or price
        ema50 = indicators.ema50 or price
        ema200 = indicators.ema200 or price

        if price > ema20 > ema50 > ema200:
            trend_score = 20
            bullish_ev.append("Perfect Moving Average alignment (Price > 20 DMA > 50 DMA > 200 DMA)")
        elif price > ema50:
            trend_score = 14
            bullish_ev.append("Price trading above 50-day moving average")
        else:
            trend_score = 5
            bearish_ev.append("Price trading below key moving averages")

        # 2. Breakout/Pattern (20%)
        pattern_score = int(vcp_pattern.confidence * 0.20)
        bullish_ev.append(f"Pattern Setup: {vcp_pattern.patternName}")

        # 3. Volume Expansion (15%)
        vol_score = 0
        if indicators.rvol >= 1.3:
            vol_score = 15
            bullish_ev.append(f"Strong volume expansion (RVOL: {indicators.rvol:.1f}x)")
        else:
            vol_score = 8
            neutral_ev.append("Volume trending near average levels")

        # 4. Momentum (15%)
        mom_score = 0
        rsi = indicators.rsi or 50.0
        if 55 <= rsi <= 68 and indicators.macdHist > 0:
            mom_score = 15
            bullish_ev.append(f"RSI in optimal swing expansion zone ({rsi:.1f}) with positive MACD")
        elif rsi > 70:
            mom_score = 9
            neutral_ev.append(f"RSI overbought ({rsi:.1f}) - avoid chasing high entry")
        else:
            mom_score = 6
            neutral_ev.append(f"RSI neutral ({rsi:.1f})")

        # 5. Relative Strength vs Index (10%)
        rs_score = 0
        if indicators.relativeStrengthVsIndex > 2.0:
            rs_score = 10
            bullish_ev.append(f"Outperforming benchmark index by +{indicators.relativeStrengthVsIndex:.1f}%")
        elif indicators.relativeStrengthVsIndex > -2.0:
            rs_score = 6
            neutral_ev.append("Performing in line with benchmark index")
        else:
            rs_score = 2
            bearish_ev.append(f"Underperforming benchmark index by {indicators.relativeStrengthVsIndex:.1f}%")

        # 6. Support/Resistance (10%)
        sr_score = 10 if price > sr["prevDayHigh"] * 0.98 else 5

        # 7. Market Regime (5%)
        regime_score = 5 if regime in ["STRONG_UPTREND", "UPTREND"] else 2

        # 8. Risk/Reward (5%)
        rr_score = 5

        total_score = trend_score + pattern_score + vol_score + mom_score + rs_score + sr_score + regime_score + rr_score

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

        risk_plan = RiskManagementEngine.calculate_plan(
            price=price,
            atr=indicators.atr or (price * 0.02),
            support_price=sr["supportZone"]["low"],
            resistance_price=sr["resistanceZone"]["high"],
            is_bullish=signal in ["STRONG_LONG", "LONG", "WATCH"]
        )

        # Suggested Entry and Exit points
        suggested_entry = {
            "optimalEntryPrice": round((risk_plan.entryZone.low + risk_plan.entryZone.high) / 2, 2),
            "entryZoneRange": f"₹{risk_plan.entryZone.low:.2f} - ₹{risk_plan.entryZone.high:.2f}",
            "orderType": "VCP BREAKOUT BUY",
            "triggerCondition": f"Breakout above VCP consolidation with volume or pullback to 20 DMA"
        }

        suggested_exits = {
            "exitTarget1": {"price": risk_plan.target1, "label": "Swing Exit 1 (Target 1)", "timeframe": "3 - 5 Trading Days", "action": "Book 50% profits"},
            "exitTarget2": {"price": risk_plan.target2, "label": "Main Swing Exit (Target 2)", "timeframe": "1 - 2 Weeks", "action": "Book 40% profits"},
            "exitTarget3": {"price": risk_plan.target3, "label": "Extended Trend Exit (Target 3)", "timeframe": "3 - 4 Weeks", "action": "Trail remaining position via 20 DMA"},
            "stopLossExit": {"price": risk_plan.stopLoss, "label": "Swing Stop Loss Exit", "timeframe": "Immediate Risk Cut", "action": "Exit on daily close below support"}
        }

        return HorizonAnalysisResult(
            symbol=symbol,
            name=symbol.replace(".NS", ""),
            analysisType="SWING",
            marketRegime=regime,
            trend=pa["trend"],
            signal=signal,
            setup=vcp_pattern.patternName,
            score=total_score,
            confidence=round(total_score / 100.0, 2),
            entryZone=risk_plan.entryZone,
            suggestedEntryPoint=suggested_entry,
            suggestedExitPoints=suggested_exits,
            stopLoss=risk_plan.stopLoss,
            targets=[risk_plan.target1, risk_plan.target2, risk_plan.target3],
            targetTimeframes=["3 - 5 Days", "1 - 2 Weeks", "3 - 4 Weeks"],
            riskReward=risk_plan.riskRewardRatio,
            bullishEvidence=bullish_ev,
            bearishEvidence=bearish_ev,
            neutralEvidence=neutral_ev + tf_conflicts,
            patterns=[vcp_pattern],
            indicators=indicators,
            timeframeAlignment=alignment,
            invalidation=risk_plan.invalidationCondition,
            risks=[vcp_pattern.risk, "Market pullback risk"],
            missingData=[],
            explanation="",
            dataQualityStatus="VALID"
        )
