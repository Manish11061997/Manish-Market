import unittest
import pandas as pd
import numpy as np

from analysis_models import HorizonAnalysisResult, IndicatorValues
from data_validator import MarketDataService
from indicator_engine import IndicatorEngine
from price_action_engine import PriceActionEngine, SupportResistanceEngine
from pattern_engine import PatternDetectionEngine
from market_regime import MarketRegimeEngine
from multi_timeframe import MultiTimeframeEngine
from risk_engine import RiskManagementEngine
from intraday_engine import IntradayStrategyEngine
from swing_engine import SwingStrategyEngine
from fundamental_engine import FundamentalAnalysisEngine
from backtest_framework import BacktestingFramework
from ai_analysis_service import AIAnalysisService

class TestAnalysisEngine(unittest.TestCase):
    def setUp(self):
        """Generate synthetic OHLCV dataset for deterministic testing."""
        np.random.seed(42)
        dates = pd.date_range(start="2026-01-01", periods=50, freq="15min")
        close_prices = 100 + np.cumsum(np.random.randn(50) * 0.5)
        high_prices = close_prices + np.abs(np.random.randn(50) * 0.4)
        low_prices = close_prices - np.abs(np.random.randn(50) * 0.4)
        open_prices = close_prices + np.random.randn(50) * 0.2
        volumes = np.random.randint(1000, 50000, size=50)

        self.df = pd.DataFrame({
            "Open": open_prices,
            "High": high_prices,
            "Low": low_prices,
            "Close": close_prices,
            "Volume": volumes
        }, index=dates)

    def test_01_data_validation(self):
        """Test MarketDataService validation and normalization."""
        clean_df, status, issues = MarketDataService.validate_and_normalize(self.df, min_candles=15)
        self.assertEqual(status, "VALID")
        self.assertGreaterEqual(len(clean_df), 15)

        # Test empty dataframe handling
        empty_clean, empty_status, empty_issues = MarketDataService.validate_and_normalize(pd.DataFrame(), min_candles=15)
        self.assertEqual(empty_status, "INSUFFICIENT_DATA")

    def test_02_indicator_engine(self):
        """Test IndicatorEngine suite calculations."""
        indicators = IndicatorEngine.calculate_all(self.df)
        self.assertIsNotNone(indicators.vwap)
        self.assertGreater(indicators.rsi, 0)
        self.assertLess(indicators.rsi, 100)
        self.assertIn(indicators.vwapSlope, ["RISING", "FALLING", "FLAT"])

    def test_03_price_action_engine(self):
        """Test PriceActionEngine structure and SupportResistanceEngine zones."""
        pa = PriceActionEngine.analyze_structure(self.df)
        self.assertIn(pa["trend"], ["BULLISH", "BEARISH", "SIDEWAYS"])

        sr = SupportResistanceEngine.calculate_zones(self.df)
        self.assertGreater(sr["resistanceZone"]["high"], sr["supportZone"]["low"])
        self.assertGreater(sr["prevDayHigh"], 0)

    def test_04_pattern_detection(self):
        """Test ORB, Breakout + Retest, and VCP Consolidation detection."""
        orb = PatternDetectionEngine.detect_orb(self.df, orb_minutes=15)
        self.assertIn("ORB", orb.patternName)
        self.assertGreater(orb.confidence, 0)

        retest = PatternDetectionEngine.detect_breakout_retest(self.df, resistance_level=105.0)
        self.assertIsNotNone(retest.patternName)

        vcp = PatternDetectionEngine.detect_consolidation_vcp(self.df)
        self.assertIsNotNone(vcp.patternName)

    def test_05_market_regime(self):
        """Test MarketRegimeEngine 8-category classification."""
        indicators = IndicatorEngine.calculate_all(self.df)
        regime = MarketRegimeEngine.detect_regime(self.df, indicators)
        valid_regimes = [
            "STRONG_UPTREND", "UPTREND", "RANGE_BOUND", "DOWNTREND",
            "STRONG_DOWNTREND", "HIGH_VOLATILITY", "LOW_VOLATILITY", "UNCERTAIN"
        ]
        self.assertIn(regime, valid_regimes)

    def test_06_multi_timeframe(self):
        """Test MultiTimeframeEngine alignment and conflict flagging."""
        indicators = IndicatorEngine.calculate_all(self.df)
        alignment, conflicts = MultiTimeframeEngine.evaluate_alignment(indicators)
        self.assertIn(alignment, ["ALIGNED_BULLISH", "MOSTLY_BULLISH", "MIXED", "MOSTLY_BEARISH", "ALIGNED_BEARISH"])

    def test_07_risk_engine(self):
        """Test RiskManagementEngine Risk/Reward plan calculation."""
        plan = RiskManagementEngine.calculate_plan(
            price=100.0,
            atr=2.0,
            support_price=95.0,
            resistance_price=110.0,
            is_bullish=True
        )
        self.assertEqual(plan.entryZone.low, 99.8)
        self.assertGreater(plan.target1, 100.0)
        self.assertGreater(plan.riskRewardRatio, 0)
        self.assertIn("Sustained 5-min candle close below", plan.invalidationCondition)

    def test_08_intraday_horizon_engine(self):
        """Test IntradayStrategyEngine complete pipeline."""
        res = IntradayStrategyEngine.analyze(symbol="RELIANCE.NS", df=self.df, orb_period=15)
        self.assertEqual(res.analysisType, "INTRADAY")
        self.assertGreaterEqual(res.score, 0)
        self.assertLessEqual(res.score, 100)
        self.assertIn(res.signal, ["STRONG_LONG", "LONG", "WATCH", "NEUTRAL", "SHORT", "STRONG_SHORT", "NO_SETUP", "INSUFFICIENT_DATA"])

    def test_09_swing_horizon_engine(self):
        """Test SwingStrategyEngine complete pipeline."""
        res = SwingStrategyEngine.analyze(symbol="NVDA", df=self.df)
        self.assertEqual(res.analysisType, "SWING")
        self.assertGreaterEqual(res.score, 0)
        self.assertIn(res.signal, ["STRONG_LONG", "LONG", "WATCH", "NEUTRAL", "SHORT", "STRONG_SHORT", "NO_SETUP", "INSUFFICIENT_DATA"])

    def test_10_longterm_horizon_engine(self):
        """Test FundamentalAnalysisEngine long-term investment pipeline."""
        res = FundamentalAnalysisEngine.analyze(symbol="AAPL", df=self.df)
        self.assertEqual(res.analysisType, "LONG_TERM")
        self.assertIsNotNone(res.fundamentals)
        self.assertIn(res.signal, ["STRONG_ACCUMULATE", "ACCUMULATE", "WATCH", "HOLD", "REDUCE", "AVOID", "INSUFFICIENT_DATA"])

    def test_11_backtesting_framework(self):
        """Test BacktestingFramework metrics calculation."""
        trades = [
            {"outcome": "WIN", "profit": 400.0, "r_multiple": 2.5},
            {"outcome": "LOSS", "loss": 150.0, "r_multiple": -1.0}
        ]
        res = BacktestingFramework.run_backtest(trades)
        self.assertEqual(res["totalTrades"], 2)
        self.assertEqual(res["winRate"], 50.0)

    def test_12_ai_explanation_service(self):
        """Test AIAnalysisService explanation generation."""
        res = IntradayStrategyEngine.analyze(symbol="RELIANCE.NS", df=self.df)
        explanation = AIAnalysisService.generate_explanation(res)
        self.assertIn("Market Overview", explanation)
        self.assertIn("INVALIDATION", explanation)

if __name__ == "__main__":
    unittest.main()
