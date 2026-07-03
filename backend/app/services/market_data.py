from __future__ import annotations

import logging
from typing import Any

import pandas as pd
import yfinance as yf

from app.services.indicators import (
    calculate_ema,
    calculate_macd,
    calculate_rsi,
    calculate_sma,
    get_trend_label,
)
from app.utils.errors import bad_request, market_data_error, market_data_not_found


DEFAULT_PERIOD = "6mo"
REQUIRED_COLUMNS = {"Close"}

logging.getLogger("yfinance").setLevel(logging.CRITICAL)


def fetch_history(symbol: str, period: str = DEFAULT_PERIOD) -> tuple[yf.Ticker, pd.DataFrame]:
    clean_symbol = normalize_symbol(symbol)
    ticker = yf.Ticker(clean_symbol)

    try:
        history = ticker.history(period=period, interval="1d", auto_adjust=False)
    except Exception as exc:
        raise market_data_error(f"Could not fetch market data for symbol {clean_symbol}") from exc

    history = normalize_history_columns(history)
    validate_history(clean_symbol, history)
    return ticker, history


def get_market_summary(symbol: str, period: str = DEFAULT_PERIOD) -> dict[str, Any]:
    ticker, history = fetch_history(symbol, period=period)
    clean_symbol = normalize_symbol(symbol)
    closes = history["Close"].dropna()

    latest_close = float(closes.iloc[-1])
    previous_close = float(closes.iloc[-2]) if len(closes) >= 2 else latest_close
    price_change = latest_close - previous_close
    price_change_percentage = (price_change / previous_close * 100) if previous_close else 0.0

    return {
        "symbol": clean_symbol,
        "latest_close": round(latest_close, 2),
        "previous_close": round(previous_close, 2),
        "price_change": round(price_change, 2),
        "price_change_percentage": round(price_change_percentage, 2),
        "currency": get_currency(ticker),
        "candles_loaded": int(len(history)),
        "last_updated": history.index[-1].date().isoformat(),
    }


def get_indicator_summary(symbol: str, period: str = DEFAULT_PERIOD) -> dict[str, Any]:
    _, history = fetch_history(symbol, period=period)
    clean_symbol = normalize_symbol(symbol)
    closes = history["Close"].dropna()

    latest_close = round_float(closes.iloc[-1])
    sma_20 = last_value(calculate_sma(closes, 20))
    sma_50 = last_value(calculate_sma(closes, 50))
    ema_20 = last_value(calculate_ema(closes, 20))
    rsi_14 = last_value(calculate_rsi(closes, 14))
    macd_values = calculate_macd(closes)
    macd = last_value(macd_values["macd"])
    macd_signal = last_value(macd_values["signal"])
    macd_histogram = last_value(macd_values["histogram"])
    trend = get_trend_label(latest_close, sma_20, sma_50, macd_histogram)

    return {
        "symbol": clean_symbol,
        "latest_close": latest_close,
        "sma_20": sma_20,
        "sma_50": sma_50,
        "ema_20": ema_20,
        "rsi_14": rsi_14,
        "macd": macd,
        "macd_signal": macd_signal,
        "macd_histogram": macd_histogram,
        "trend": trend,
        "explanation": build_trend_explanation(trend, latest_close, sma_20, sma_50, rsi_14, macd_histogram),
    }


def normalize_symbol(symbol: str) -> str:
    clean_symbol = symbol.strip().upper()
    if not clean_symbol:
        raise bad_request("Symbol is required")
    if any(character.isspace() for character in clean_symbol):
        raise bad_request("Symbol must not contain spaces")
    return clean_symbol


def normalize_history_columns(history: pd.DataFrame) -> pd.DataFrame:
    if isinstance(history.columns, pd.MultiIndex):
        history = history.copy()
        history.columns = history.columns.get_level_values(0)
    return history


def validate_history(symbol: str, history: pd.DataFrame) -> None:
    if history.empty:
        raise market_data_not_found(symbol)

    missing_columns = REQUIRED_COLUMNS - set(history.columns)
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise market_data_error(f"Market data for {symbol} is missing required columns: {missing}")

    if history["Close"].dropna().empty:
        raise market_data_not_found(symbol)


def get_currency(ticker: yf.Ticker) -> str | None:
    try:
        fast_info = ticker.fast_info
        currency = fast_info.get("currency") if hasattr(fast_info, "get") else None
    except Exception:
        currency = None

    return str(currency) if currency else None


def last_value(values: pd.Series) -> float | None:
    clean_values = values.dropna()
    if clean_values.empty:
        return None
    return round_float(clean_values.iloc[-1])


def round_float(value: Any) -> float | None:
    if pd.isna(value):
        return None
    return round(float(value), 2)


def build_trend_explanation(
    trend: str,
    latest_close: float | None,
    sma_20: float | None,
    sma_50: float | None,
    rsi_14: float | None,
    macd_histogram: float | None,
) -> str:
    if trend == "bullish":
        return (
            "The latest close is above both the 20-day and 50-day averages, and MACD momentum is positive. "
            "This suggests short-term strength, but it is not financial advice."
        )

    if trend == "bearish":
        return (
            "The latest close is below both the 20-day and 50-day averages, and MACD momentum is negative. "
            "This suggests short-term weakness, but it is not financial advice."
        )

    return (
        "The indicators are mixed or there is not enough confirmation for a strong trend. "
        f"Latest close: {latest_close}, SMA 20: {sma_20}, SMA 50: {sma_50}, "
        f"RSI 14: {rsi_14}, MACD histogram: {macd_histogram}."
    )
