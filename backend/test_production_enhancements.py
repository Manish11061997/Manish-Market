import unittest
import pandas as pd
import numpy as np
from datetime import datetime, time
import pytz

from instrument_master import instrument_master, Exchange, InstrumentType, OptionType
from corporate_actions import corporate_actions, CorporateAction, CorporateActionType
from market_session import get_market_session_status, SessionPhase
from circuit_limits import circuit_limits_engine, CircuitStatus
from market_breadth import market_breadth_engine
from timeseries_storage import timeseries_storage
from market_replay_engine import market_replay_engine
from risk_manager import risk_engine, RiskCheckStatus
from broker_adapter import paper_broker_adapter
from oms import oms_engine, OrderStatus
from paper_trading_engine import paper_trading_coordinator
from audit_trail import audit_trail
from data_reconciler import data_reconciler
from ai_copilot import process_copilot_query

class TestProductionEnhancements(unittest.TestCase):

    # ----------------------------------------------------------------
    # 1. Instrument Master Tests
    # ----------------------------------------------------------------
    def test_instrument_master_resolution(self):
        # Test Indian Stock Lookup
        rel = instrument_master.lookup("RELIANCE.NS")
        self.assertIsNotNone(rel)
        self.assertEqual(rel.trading_symbol, "RELIANCE")
        self.assertEqual(rel.isin, "INE002A01018")
        self.assertEqual(rel.exchange, Exchange.NSE)
        self.assertEqual(rel.lot_size, 250)
        self.assertEqual(rel.tick_size, 0.05)
        self.assertEqual(rel.currency, "INR")

        # Test US Stock Lookup
        nvda = instrument_master.lookup("NVDA")
        self.assertIsNotNone(nvda)
        self.assertEqual(nvda.isin, "US67066G1040")
        self.assertEqual(nvda.currency, "USD")
        self.assertEqual(nvda.exchange, Exchange.NASDAQ)

        # Test Derivatives (Options)
        opt = instrument_master.lookup("NIFTY24AUG24500CE")
        self.assertIsNotNone(opt)
        self.assertEqual(opt.instrument_type, InstrumentType.OPTIONS)
        self.assertEqual(opt.strike_price, 24500.0)
        self.assertEqual(opt.option_type, OptionType.CALL)

        # Test Provider Symbol Translation
        self.assertEqual(instrument_master.get_provider_symbol("NIFTY50", "yahoo"), "^NSEI")
        self.assertEqual(instrument_master.get_provider_symbol("SP500", "yahoo"), "^GSPC")

    # ----------------------------------------------------------------
    # 2. Corporate Actions Tests
    # ----------------------------------------------------------------
    def test_corporate_actions_adjustment(self):
        actions = corporate_actions.get_actions("NVDA")
        self.assertTrue(len(actions) > 0)
        split_action = next((a for a in actions if a.action_type == CorporateActionType.STOCK_SPLIT), None)
        self.assertIsNotNone(split_action)
        self.assertEqual(split_action.ratio, "10:1")
        self.assertEqual(split_action.adjustment_factor, 0.1)

        # Test price adjustment on DataFrame
        dates = pd.date_range(start="2024-05-01", periods=60, freq="D")
        sample_df = pd.DataFrame({
            "Open": [1000.0] * 60,
            "High": [1050.0] * 60,
            "Low": [950.0] * 60,
            "Close": [1020.0] * 60,
            "Volume": [100000] * 60
        }, index=dates)

        adj_df = corporate_actions.apply_adjustments(sample_df, "NVDA", adjusted=True)
        # Dates before 2024-06-10 should be scaled by 0.1
        self.assertAlmostEqual(adj_df.loc["2024-05-15", "Close"], 102.0, places=1)
        # Raw prices should be preserved
        self.assertAlmostEqual(adj_df.loc["2024-05-15", "Raw_Close"], 1020.0, places=1)

    # ----------------------------------------------------------------
    # 3. Exchange Sessions & Calendar Tests
    # ----------------------------------------------------------------
    def test_exchange_sessions_and_holidays(self):
        # 1. Weekend Test
        sat_utc = datetime(2026, 8, 15, 6, 0, 0, tzinfo=pytz.utc) # Saturday
        status_in = get_market_session_status("IN", custom_now_utc=sat_utc)
        self.assertEqual(status_in["status"], "MARKET_CLOSED")
        self.assertFalse(status_in["isTradingActive"])

        # 2. Regular Trading Hours Test (11:00 AM IST on Wednesday)
        wed_utc = datetime(2026, 8, 19, 5, 30, 0, tzinfo=pytz.utc) # 11:00 AM IST
        status_open = get_market_session_status("IN", custom_now_utc=wed_utc)
        self.assertEqual(status_open["status"], "LIVE")
        self.assertEqual(status_open["phase"], SessionPhase.NORMAL_TRADING.value)
        self.assertTrue(status_open["isTradingActive"])

        # 3. Pre-Open Auction Test (09:05 AM IST)
        pre_utc = datetime(2026, 8, 19, 3, 35, 0, tzinfo=pytz.utc) # 09:05 AM IST
        status_pre = get_market_session_status("IN", custom_now_utc=pre_utc)
        self.assertEqual(status_pre["status"], "PRE_MARKET")
        self.assertEqual(status_pre["phase"], SessionPhase.PRE_OPEN.value)

        # 4. Official Holiday Test (Jan 26, Republic Day)
        holiday_utc = datetime(2026, 1, 26, 6, 0, 0, tzinfo=pytz.utc)
        status_hol = get_market_session_status("IN", custom_now_utc=holiday_utc)
        self.assertEqual(status_hol["status"], "MARKET_CLOSED")

    # ----------------------------------------------------------------
    # 4. Circuit Limits Tests
    # ----------------------------------------------------------------
    def test_circuit_limits_calculation(self):
        # Standard 10% Band Stock
        circ = circuit_limits_engine.calculate_circuit_limits("RELIANCE.NS", 1310.0, prev_close=1300.0)
        self.assertEqual(circ.circuit_band_pct, 10.0)
        self.assertEqual(circ.upper_circuit, 1430.0)
        self.assertEqual(circ.lower_circuit, 1170.0)
        self.assertTrue(circ.can_buy)
        self.assertTrue(circ.can_sell)
        self.assertEqual(circ.status, CircuitStatus.NORMAL)

        # Upper Circuit Hit Condition
        circ_hit = circuit_limits_engine.calculate_circuit_limits("RELIANCE.NS", 1430.0, prev_close=1300.0)
        self.assertEqual(circ_hit.status, CircuitStatus.UPPER_CIRCUIT_HIT)
        self.assertFalse(circ_hit.can_buy) # Buy orders blocked at upper circuit lock

    # ----------------------------------------------------------------
    # 5. Market Breadth & Context Tests
    # ----------------------------------------------------------------
    def test_market_breadth_engine(self):
        mock_ticks = {
            "RELIANCE.NS": {"price": 1315.0, "changePercent": 1.2, "volume": 5000000},
            "TCS.NS": {"price": 3150.0, "changePercent": 0.8, "volume": 2000000},
            "HDFCBANK.NS": {"price": 1660.0, "changePercent": -0.5, "volume": 3000000},
            "INFY.NS": {"price": 1450.0, "changePercent": 0.3, "volume": 1500000}
        }
        breadth = market_breadth_engine.compute_breadth(mock_ticks, market="IN")
        self.assertTrue(breadth.advances >= 3)
        self.assertTrue(breadth.declines >= 1)
        self.assertTrue(breadth.ad_ratio > 1.0)
        self.assertIsNotNone(breadth.vix_price)
        self.assertEqual(breadth.vix_symbol, "INDIAVIX")
        self.assertTrue("Nifty IT" in breadth.sector_breadth)

    # ----------------------------------------------------------------
    # 6. Time-Series Storage Tests
    # ----------------------------------------------------------------
    def test_timeseries_storage_aggregation(self):
        storage = timeseries_storage
        sample_tick = {
            "symbol": "RELIANCE.NS",
            "price": 1312.5,
            "volume": 2500000,
            "ms": int(datetime.now().timestamp() * 1000)
        }
        storage.append_tick(sample_tick)
        ticks = storage.get_ticks("RELIANCE.NS", limit=10)
        self.assertTrue(len(ticks) > 0)
        candles = storage.get_candles("RELIANCE.NS", timeframe="1m")
        self.assertTrue(len(candles) > 0)
        self.assertEqual(candles[-1]["close"], 1312.5)

    # ----------------------------------------------------------------
    # 7. Dedicated Risk Engine & Gate Validation Tests
    # ----------------------------------------------------------------
    def test_risk_engine_validation_rules(self):
        risk_engine._recent_orders.clear()
        # 1. Normal Valid Order -> Must Pass All Gates
        valid_res = risk_engine.evaluate_order(
            symbol="RELIANCE.NS",
            side="BUY",
            quantity=250, # Valid multiple of lot size 250
            price=1310.0,
            stop_loss=1280.0,
            take_profit=1360.0,
            account_balance=1000000.0
        )
        self.assertTrue(valid_res.is_approved)
        self.assertEqual(valid_res.failed_checks, 0)

        # 2. Missing Mandatory Stop-Loss -> Must Reject
        risk_engine._recent_orders.clear()
        no_sl_res = risk_engine.evaluate_order(
            symbol="RELIANCE.NS",
            side="BUY",
            quantity=250,
            price=1310.0,
            stop_loss=None, # Missing SL
            account_balance=1000000.0
        )
        self.assertFalse(no_sl_res.is_approved)
        self.assertTrue(any("Stop-Loss" in r for r in no_sl_res.rejection_reasons))

        # 3. Invalid Stop-Loss Price (SL above Entry on Long) -> Must Reject
        risk_engine._recent_orders.clear()
        bad_sl_res = risk_engine.evaluate_order(
            symbol="RELIANCE.NS",
            side="BUY",
            quantity=250,
            price=1310.0,
            stop_loss=1350.0, # SL above entry!
            account_balance=1000000.0
        )
        self.assertFalse(bad_sl_res.is_approved)

        # 4. Insufficient Margin -> Must Reject
        risk_engine._recent_orders.clear()
        no_cash_res = risk_engine.evaluate_order(
            symbol="RELIANCE.NS",
            side="BUY",
            quantity=250,
            price=1310.0,
            stop_loss=1280.0,
            account_balance=5000.0 # Only ₹5,000 cash for ₹3,27,500 order
        )
        self.assertFalse(no_cash_res.is_approved)
        self.assertTrue(any("Insufficient" in r for r in no_cash_res.rejection_reasons))

    # ----------------------------------------------------------------
    # 8. Order Management System (OMS) & Paper Trading Tests
    # ----------------------------------------------------------------
    def test_oms_and_paper_trading_lifecycle(self):
        risk_engine._recent_orders.clear()
        paper_trading_coordinator.reset_paper_account(1000000.0)
        
        # Place Paper Order
        order_res = paper_trading_coordinator.place_paper_order(
            symbol="RELIANCE.NS",
            side="BUY",
            quantity=250,
            price=1310.0,
            stop_loss=1280.0,
            take_profit=1360.0
        )
        self.assertEqual(order_res["status"], "FILLED")
        self.assertEqual(order_res["filledQuantity"], 250)
        self.assertTrue(order_res["filledPrice"] > 0)

        # Verify Portfolio Position Updated
        portfolio = paper_trading_coordinator.get_portfolio()
        self.assertEqual(len(portfolio["positions"]), 1)
        pos = portfolio["positions"][0]
        self.assertEqual(pos["symbol"], "RELIANCE.NS")
        self.assertEqual(pos["quantity"], 250)

    # ----------------------------------------------------------------
    # 9. Immutable Audit Trail Tests
    # ----------------------------------------------------------------
    def test_audit_trail_logging(self):
        audit_trail.record_ai_decision(
            symbol="TCS.NS",
            user_query="Is TCS a buy today?",
            market_state={"currentPrice": 3150.0, "change": 20.0, "volume": 1200000, "status": "LIVE"},
            observed_data={"verifiedPrice": "₹3,150.00", "rsi14": "54.2"},
            inference=["Strong technical momentum above SMA20"],
            uncertainty=["Macro IT spending guidance remains key variable"],
            signal_details={"action": "Buy", "overallScore": 78}
        )

        records = audit_trail.get_records(symbol="TCS.NS")
        self.assertTrue(len(records) > 0)
        latest = records[0]
        self.assertEqual(latest["symbol"], "TCS.NS")
        self.assertTrue("Why?" in latest["rationaleAnswer"] or "was generated because" in latest["rationaleAnswer"])
        self.assertIsNotNone(latest["aiEvidence"])

    # ----------------------------------------------------------------
    # 10. Evidence-Based AI Copilot Tripartite Verification
    # ----------------------------------------------------------------
    def test_evidence_based_copilot(self):
        # Query with temporal keyword "right now"
        resp = process_copilot_query("What is happening with RELIANCE right now?")
        self.assertEqual(resp["type"], "STOCK_SPECIFIC")
        self.assertIn("OBSERVED DATA", resp["response"])
        self.assertIn("AI INFERENCE", resp["response"])
        self.assertIn("UNCERTAINTY", resp["response"])
        self.assertIsNotNone(resp.get("evidence"))
        self.assertIsNotNone(resp.get("tradeProposal"))

    # ----------------------------------------------------------------
    # 11. Data Reconciler & Failover Tests
    # ----------------------------------------------------------------
    def test_data_reconciler_monotonicity(self):
        reconciler = data_reconciler
        tick_good = {"symbol": "INFY.NS", "price": 1450.0, "sequenceNumber": 100, "ms": 1700000000000}
        valid, _ = reconciler.validate_and_reconcile_tick(tick_good)
        self.assertTrue(valid)

        # Invalid price (<= 0)
        tick_bad = {"symbol": "INFY.NS", "price": -10.0, "sequenceNumber": 101, "ms": 1700000001000}
        valid_bad, reason = reconciler.validate_and_reconcile_tick(tick_bad)
        self.assertFalse(valid_bad)
        self.assertEqual(reason, "NON_POSITIVE_PRICE")

    # ----------------------------------------------------------------
    # 12. Historical Replay Timeline Tests
    # ----------------------------------------------------------------
    def test_market_replay_controls(self):
        replay = market_replay_engine
        replay.start_replay("TEST_SESSION")
        self.assertTrue(replay.state.is_active)
        
        frame = replay.step_forward()
        self.assertTrue("RELIANCE.NS" in frame)
        self.assertEqual(frame["RELIANCE.NS"]["status"], "REPLAY")
        
        replay.set_speed(5.0)
        self.assertEqual(replay.state.speed, 5.0)
        replay.stop_replay()
        self.assertFalse(replay.state.is_active)

if __name__ == "__main__":
    unittest.main()
