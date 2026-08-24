import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class MarketDataService:
    @staticmethod
    def validate_and_normalize(df: pd.DataFrame, min_candles: int = 15) -> tuple[pd.DataFrame, str, list[str]]:
        """
        Validate and normalize raw OHLCV candle data.
        Returns (clean_df, data_status, missing_data_issues).
        """
        issues = []
        if df is None or df.empty:
            return pd.DataFrame(), "INSUFFICIENT_DATA", ["DataFrame is empty or None"]

        # Ensure required columns exist
        required_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            return pd.DataFrame(), "INSUFFICIENT_DATA", [f"Missing required columns: {missing_cols}"]

        clean_df = df.copy()

        # Remove duplicate index timestamps if any
        if clean_df.index.duplicated().any():
            issues.append("Duplicate timestamps detected and cleaned")
            clean_df = clean_df[~clean_df.index.duplicated(keep='last')]

        # Drop NaNs or nulls in OHLCV
        null_count = clean_df[required_cols].isnull().sum().sum()
        if null_count > 0:
            issues.append(f"Cleaned {null_count} null values in candle records")
            clean_df = clean_df.dropna(subset=required_cols)

        # Remove non-positive price rows
        invalid_prices = (clean_df['Open'] <= 0) | (clean_df['High'] <= 0) | (clean_df['Low'] <= 0) | (clean_df['Close'] <= 0)
        if invalid_prices.any():
            issues.append(f"Removed {invalid_prices.sum()} candles with non-positive price values")
            clean_df = clean_df[~invalid_prices]

        # Fix high/low anomalies if low > high
        anomalies = clean_df['Low'] > clean_df['High']
        if anomalies.any():
            issues.append(f"Fixed {anomalies.sum()} candles where Low > High")
            clean_df.loc[anomalies, 'High'] = clean_df.loc[anomalies, ['Open', 'Close', 'High', 'Low']].max(axis=1)
            clean_df.loc[anomalies, 'Low'] = clean_df.loc[anomalies, ['Open', 'Close', 'High', 'Low']].min(axis=1)

        # Check minimum required candle depth
        if len(clean_df) < min_candles:
            issues.append(f"Candle history count ({len(clean_df)}) below required minimum ({min_candles})")
            return clean_df, "INSUFFICIENT_DATA", issues

        return clean_df, "VALID", issues
