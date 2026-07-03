from __future__ import annotations

import pandas as pd


def calculate_sma(prices: pd.Series, window: int) -> pd.Series:
    """Simple moving average over the last `window` closing prices."""
    return prices.rolling(window=window, min_periods=window).mean()


def calculate_ema(prices: pd.Series, span: int) -> pd.Series:
    """Exponential moving average that gives more weight to recent prices."""
    return prices.ewm(span=span, adjust=False).mean()


def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index using average gains and losses."""
    delta = prices.diff()
    gains = delta.clip(lower=0)
    losses = -delta.clip(upper=0)

    average_gain = gains.rolling(window=period, min_periods=period).mean()
    average_loss = losses.rolling(window=period, min_periods=period).mean()

    relative_strength = average_gain / average_loss.where(average_loss != 0)
    rsi = 100 - (100 / (1 + relative_strength))
    rsi = rsi.mask((average_loss == 0) & (average_gain > 0), 100)
    rsi = rsi.mask((average_gain == 0) & (average_loss > 0), 0)
    return rsi.fillna(50)


def calculate_macd(
    prices: pd.Series,
    fast_span: int = 12,
    slow_span: int = 26,
    signal_span: int = 9,
) -> dict[str, pd.Series]:
    """Moving Average Convergence Divergence and its signal line."""
    fast_ema = calculate_ema(prices, fast_span)
    slow_ema = calculate_ema(prices, slow_span)
    macd = fast_ema - slow_ema
    signal = calculate_ema(macd, signal_span)
    histogram = macd - signal

    return {
        "macd": macd,
        "signal": signal,
        "histogram": histogram,
    }


def get_trend_label(
    latest_close: float | None,
    sma_20: float | None,
    sma_50: float | None,
    macd_histogram: float | None,
) -> str:
    if None in {latest_close, sma_20, sma_50, macd_histogram}:
        return "neutral"

    if latest_close > sma_20 > sma_50 and macd_histogram > 0:
        return "bullish"

    if latest_close < sma_20 < sma_50 and macd_histogram < 0:
        return "bearish"

    return "neutral"
