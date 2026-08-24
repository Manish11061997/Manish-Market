import pandas as pd
import numpy as np
import math
from data_fetcher import fetch_stock_ohlcv, fetch_stock_info, SyntheticDataDisallowedError
from stock_agent import calculate_technical_indicators

def run_strategy_backtest(ticker_symbol: str = "RELIANCE.NS", initial_capital: float = 100000.0, market: str = "IN") -> dict:
    """Simulate institutional 5-Pillar Confluence Engine with Trailing Risk Management & Trend Confirmation."""
    df = fetch_stock_ohlcv(ticker_symbol, period="1y", market=market)
    if df.empty or len(df) < 50:
        df = fetch_stock_ohlcv(ticker_symbol, period="6mo", market=market)
    if df.empty or len(df) < 30:
        return {"error": f"Insufficient historical data for {ticker_symbol} backtest."}

    try:
        info = fetch_stock_info(ticker_symbol, market=market)
    except SyntheticDataDisallowedError:
        info = {}

    TRANSACTION_COST_PCT = 0.05  # Brokerage + slippage per side (0.05%)
    capital = initial_capital
    position = None
    trades = []
    equity_curve = []

    closes = df['Close']
    dates = df.index

    # 1. Fundamental Pillar Pre-Score (0-100, Weight 20%)
    pe = info.get("peRatio", 25.0) or 25.0
    roe = info.get("roe", 15.0) or 15.0
    debt_eq = info.get("debtToEquity", 40.0) or 40.0

    pe_score = 75 if (0 < pe < 22) else (55 if pe < 40 else (35 if pe < 75 else 20))
    roe_score = 90 if roe > 22 else (70 if roe > 14 else (50 if roe > 8 else 20))
    is_bank = "bank" in (info.get("sector") or "").lower() or "financial" in (info.get("sector") or "").lower()
    debt_score = (75 if debt_eq < 600 else 40) if is_bank else (85 if debt_eq < 30 else (65 if debt_eq < 80 else 30))

    fund_score = round(0.35 * pe_score + 0.40 * roe_score + 0.25 * debt_score)
    fund_score = max(10, min(95, fund_score))

    for i in range(35, len(df)):
        current_date = dates[i].strftime("%Y-%m-%d")
        price = float(closes.iloc[i])

        slice_df = df.iloc[:i+1]
        tech = calculate_technical_indicators(slice_df)

        if not tech or "rsi" not in tech:
            continue

        # --- 5-Pillar Confluence Score ---
        adx_val = tech.get("adx", 25.0)
        plus_di = tech.get("plusDi", 25.0)
        minus_di = tech.get("minusDi", 20.0)

        price_above_sma20 = price > tech["sma20"]
        price_above_sma50 = price > tech["sma50"]
        price_above_sma200 = tech["isAboveSma200"]
        sma20_above_sma50 = tech["sma20"] > tech["sma50"]
        sma50_above_sma200 = tech["sma50"] > tech["sma200"]

        if price_above_sma20 and sma20_above_sma50 and price_above_sma200 and sma50_above_sma200:
            trend_score = 95
            if adx_val >= 25 and plus_di > minus_di:
                trend_score = 98
        elif price_above_sma20 and price_above_sma50 and price_above_sma200:
            trend_score = 82
        elif price_above_sma200:
            trend_score = 65
        elif not price_above_sma20 and not sma20_above_sma50 and not price_above_sma200:
            trend_score = 15
        else:
            trend_score = 50

        rsi = tech["rsi"]
        macd_hist = tech["macdHist"]
        macd_val = tech["macd"]
        macd_sig = tech["macdSignal"]
        stoch_k = tech.get("stochK", 50.0)

        if 48 <= rsi <= 68 and macd_hist > 0 and macd_val > macd_sig:
            momentum_score = 90
        elif (rsi < 35 or stoch_k < 20) and macd_hist > -abs(macd_val)*0.05:
            momentum_score = 84
        elif rsi > 74:
            momentum_score = 30
        elif macd_hist < 0 and macd_val < macd_sig:
            momentum_score = 25
        else:
            momentum_score = 50

        cmf_val = tech.get("cmf", 0.0)
        obv_trend = tech.get("obvTrend", "NEUTRAL")
        vol_ratio = tech.get("volumeRatio", 1.0)

        if cmf_val >= 0.08 and obv_trend == "BULLISH_INFLOW":
            money_flow_score = 92
            if vol_ratio >= 1.3:
                money_flow_score = 98
        elif cmf_val > 0.0 or obv_trend == "BULLISH_INFLOW":
            money_flow_score = 75
        elif cmf_val <= -0.10 and obv_trend == "BEARISH_OUTFLOW":
            money_flow_score = 15
        else:
            money_flow_score = 50

        volatility_score = 50
        bb_pct_b = tech.get("bbPctB", 0.5)
        is_squeeze = tech.get("isBandSqueeze", False)

        if is_squeeze:
            volatility_score = 80
        if 0.20 <= bb_pct_b <= 0.80:
            volatility_score = max(volatility_score, 70)
        elif bb_pct_b < 0.20:
            volatility_score = 82

        confluence_score = round(
            0.25 * trend_score +
            0.20 * momentum_score +
            0.20 * money_flow_score +
            0.15 * volatility_score +
            0.20 * fund_score
        )

        atr = tech.get("atr", price * 0.02)
        # Entry requires high conviction score >= 72 AND price above 20-EMA/50-SMA
        is_buy_signal = confluence_score >= 72 and price_above_sma50 and rsi >= 46
        is_sell_signal = confluence_score <= 40 or rsi > 78

        if position is None and is_buy_signal:
            shares = int((capital * 0.95) / price)
            if shares > 0:
                cost = shares * price
                target = round(price + (3.0 * atr), 2)
                stop_loss = round(price - (1.5 * atr), 2)
                position = {
                    "entry_date": current_date,
                    "entry_price": price,
                    "shares": shares,
                    "cost": cost,
                    "stop_loss": stop_loss,
                    "initial_stop": stop_loss,
                    "target": target,
                    "confluence_score": confluence_score
                }
        elif position is not None:
            # Trailing stop loss logic: lock in profit when trade reaches +1.5x ATR
            if price >= (position["entry_price"] + 1.5 * atr):
                new_sl = round(position["entry_price"] + (0.5 * atr), 2)
                if new_sl > position["stop_loss"]:
                    position["stop_loss"] = new_sl

            hit_target = price >= position["target"]
            hit_sl = price <= position["stop_loss"]

            if hit_target or hit_sl or is_sell_signal:
                revenue = position["shares"] * price
                costs = (position["cost"] + revenue) * TRANSACTION_COST_PCT / 100.0
                pnl = revenue - position["cost"] - costs
                pnl_pct = (pnl / position["cost"]) * 100
                capital += pnl

                reason = "Target 1 Hit (+3.0x ATR)" if hit_target else ("Trailing Stop / SL Hit" if hit_sl else "Confluence Score Exit")
                trades.append({
                    "entryDate": position["entry_date"],
                    "exitDate": current_date,
                    "entryPrice": position["entry_price"],
                    "exitPrice": price,
                    "shares": position["shares"],
                    "pnl": round(pnl, 2),
                    "pnlPercent": round(pnl_pct, 2),
                    "reason": reason,
                    "isWin": pnl > 0
                })
                position = None

        curr_portfolio_val = capital if position is None else (capital - position["cost"] + (position["shares"] * price))
        equity_curve.append({
            "date": current_date,
            "value": round(curr_portfolio_val, 2)
        })

    # Summary metrics calculation
    total_trades = len(trades)
    winning_trades = sum(1 for t in trades if t["isWin"])
    win_rate = round((winning_trades / total_trades) * 100, 2) if total_trades > 0 else 0.0
    net_return_pct = round(((capital - initial_capital) / initial_capital) * 100, 2)

    bh_start = float(closes.iloc[35])
    bh_end = float(closes.iloc[-1])
    buy_hold_return_pct = round((bh_end - bh_start) / bh_start * 100, 2)
    strategy_beats_benchmark = net_return_pct > buy_hold_return_pct

    gross_win = sum(t["pnl"] for t in trades if t["pnl"] > 0)
    gross_loss = abs(sum(t["pnl"] for t in trades if t["pnl"] < 0))
    profit_factor = round(gross_win / gross_loss, 2) if gross_loss > 0 else (99.0 if total_trades > 0 else 1.0)

    # Calculate Max Drawdown
    equity_vals = [e["value"] for e in equity_curve]
    peak = equity_vals[0] if equity_vals else initial_capital
    max_dd = 0.0
    for v in equity_vals:
        if v > peak:
            peak = v
        dd = (peak - v) / peak * 100
        if dd > max_dd:
            max_dd = dd

    return {
        "symbol": ticker_symbol,
        "initialCapital": initial_capital,
        "finalCapital": round(capital, 2),
        "netReturnPercent": net_return_pct,
        "buyHoldReturnPercent": buy_hold_return_pct,
        "strategyBeatsBenchmark": strategy_beats_benchmark,
        "totalTrades": total_trades,
        "winningTrades": winning_trades,
        "losingTrades": total_trades - winning_trades,
        "winRate": win_rate,
        "profitFactor": profit_factor,
        "maxDrawdownPercent": round(max_dd, 2),
        "trades": trades,
        "equityCurve": equity_curve
    }
