import pandas as pd
import numpy as np
from analysis_models import IndicatorValues

class IndicatorEngine:
    @staticmethod
    def calculate_all(df: pd.DataFrame, benchmark_df: pd.DataFrame = None) -> IndicatorValues:
        """Calculate complete technical indicator suite for candle dataframe."""
        if df.empty or len(df) < 5:
            return IndicatorValues()

        close = df['Close']
        high = df['High']
        low = df['Low']
        volume = df['Volume']
        n = len(df)

        # 1. VWAP & VWAP Slope (Anchored to session start or last 30 candles)
        # For intraday: use full session data if available (df represents one session)
        # For daily+: use last 30 candles as proxy
        session_len = min(30, n)
        recent_vol = volume.iloc[-session_len:]
        recent_tp = (high.iloc[-session_len:] + low.iloc[-session_len:] + close.iloc[-session_len:]) / 3
        vwap_val = float((recent_tp * recent_vol).sum() / recent_vol.sum()) if recent_vol.sum() > 0 else float(close.iloc[-1])
        
        # VWAP Slope over last 5 candles
        vwap_series = (volume * (high + low + close) / 3).rolling(window=min(10, n)).sum() / volume.rolling(window=min(10, n)).sum().replace(0, np.nan)
        vwap_slope = "FLAT"
        if n >= 5 and vwap_series.iloc[-5] > 0:
            v_chg_pct = (vwap_series.iloc[-1] - vwap_series.iloc[-5]) / vwap_series.iloc[-5] * 100
            if v_chg_pct > 0.15:
                vwap_slope = "RISING"
            elif v_chg_pct < -0.15:
                vwap_slope = "FALLING"

        # 2. EMAs and SMAs
        ema9 = float(close.ewm(span=min(9, n), adjust=False).mean().iloc[-1])
        ema20 = float(close.ewm(span=min(20, n), adjust=False).mean().iloc[-1])
        ema50 = float(close.ewm(span=min(50, n), adjust=False).mean().iloc[-1])
        ema200 = float(close.ewm(span=min(200, n), adjust=False).mean().iloc[-1])

        sma20 = float(close.rolling(window=min(20, n)).mean().iloc[-1])
        sma50 = float(close.rolling(window=min(50, n)).mean().iloc[-1])
        sma200 = float(close.rolling(window=min(200, n)).mean().iloc[-1])

        # 3. RSI (14) - Wilder's Smoothing (matches stock_agent.py)
        delta = close.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)

        avg_gain = gain.ewm(alpha=1/14, min_periods=min(14, n), adjust=False).mean()
        avg_loss = loss.ewm(alpha=1/14, min_periods=min(14, n), adjust=False).mean()

        last_gain = float(avg_gain.iloc[-1]) if not np.isnan(avg_gain.iloc[-1]) else 0.0
        last_loss = float(avg_loss.iloc[-1]) if not np.isnan(avg_loss.iloc[-1]) else 0.0

        if last_loss == 0.0 and last_gain > 0:
            rsi_val = 100.0
        elif last_gain == 0.0 and last_loss > 0:
            rsi_val = 0.0
        elif last_loss == 0.0 and last_gain == 0.0:
            rsi_val = 50.0
        else:
            rs = last_gain / last_loss
            rsi_val = round(100.0 - (100.0 / (1.0 + rs)), 2)

        if rsi_val >= 70:
            rsi_status = "OVERBOUGHT"
        elif rsi_val <= 30:
            rsi_status = "OVERSOLD"
        elif rsi_val >= 55:
            rsi_status = "BULLISH"
        elif rsi_val <= 45:
            rsi_status = "BEARISH"
        else:
            rsi_status = "NEUTRAL"

        # 4. MACD (12, 26, 9)
        macd_series = close.ewm(span=min(12, n), adjust=False).mean() - close.ewm(span=min(26, n), adjust=False).mean()
        signal_series = macd_series.ewm(span=min(9, n), adjust=False).mean()
        macd_hist = macd_series - signal_series

        macd_val = float(macd_series.iloc[-1])
        macd_sig = float(signal_series.iloc[-1])
        macd_h = float(macd_hist.iloc[-1])

        # 5. ATR (14)
        tr1 = high - low
        tr2 = (high - close.shift(1)).abs()
        tr3 = (low - close.shift(1)).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr_val = float(tr.rolling(window=min(14, n)).mean().iloc[-1])

        # 6. ADX (14) - Correct Directional Movement calculation
        up_move = high.diff()
        down_move = -low.diff()
        plus_dm = up_move.where((up_move > down_move) & (up_move > 0), 0.0)
        minus_dm = down_move.where((down_move > up_move) & (down_move > 0), 0.0)

        tr_smooth = tr.rolling(window=min(14, n)).sum()
        plus_di = 100 * (plus_dm.rolling(window=min(14, n)).sum() / tr_smooth.replace(0, np.nan))
        minus_di = 100 * (minus_dm.rolling(window=min(14, n)).sum() / tr_smooth.replace(0, np.nan))
        dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
        adx_series = dx.rolling(window=min(14, n)).mean()
        adx_val = float(adx_series.iloc[-1]) if not np.isnan(adx_series.iloc[-1]) else 20.0

        # 7. RVOL (Relative Volume)
        vol_sma20 = volume.rolling(window=min(20, n)).mean().iloc[-1]
        rvol_val = round(float(volume.iloc[-1] / vol_sma20), 2) if vol_sma20 > 0 else 1.0

        # 8. ROC (Rate of Change 10)
        roc_val = 0.0
        if n >= 10 and close.iloc[-10] > 0:
            roc_val = round(float((close.iloc[-1] - close.iloc[-10]) / close.iloc[-10] * 100), 2)

        # 9. Relative Strength vs Benchmark
        rs_vs_index = 0.0
        if benchmark_df is not None and not benchmark_df.empty and len(benchmark_df) >= min(20, n):
            stock_ret = (close.iloc[-1] - close.iloc[0]) / close.iloc[0] * 100
            b_close = benchmark_df['Close']
            bench_ret = (b_close.iloc[-1] - b_close.iloc[0]) / b_close.iloc[0] * 100
            rs_vs_index = round(float(stock_ret - bench_ret), 2)

        return IndicatorValues(
            vwap=round(vwap_val, 2),
            vwapSlope=vwap_slope,
            ema9=round(ema9, 2),
            ema20=round(ema20, 2),
            ema50=round(ema50, 2),
            ema200=round(ema200, 2),
            sma20=round(sma20, 2),
            sma50=round(sma50, 2),
            sma200=round(sma200, 2),
            rsi=round(rsi_val, 2),
            rsiStatus=rsi_status,
            macd=round(macd_val, 2),
            macdSignal=round(macd_sig, 2),
            macdHist=round(macd_h, 2),
            atr=round(atr_val, 2),
            adx=round(adx_val, 2),
            rvol=rvol_val,
            roc=roc_val,
            relativeStrengthVsIndex=rs_vs_index
        )
