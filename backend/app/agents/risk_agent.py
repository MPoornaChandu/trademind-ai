from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from app.services.market_data import fetch_history, normalize_symbol
from app.utils.errors import market_data_error


DISCLAIMER = "Educational risk analysis only. Not financial advice."
REQUIRED_OHLC_COLUMNS = {"High", "Low", "Close"}


def get_risk_summary(symbol: str) -> dict[str, Any]:
    clean_symbol = normalize_symbol(symbol)
    _, history = fetch_history(clean_symbol)
    validate_ohlc_history(clean_symbol, history)

    close = history["Close"].dropna()
    high = history["High"].dropna()
    low = history["Low"].dropna()

    latest_close = safe_float(close.iloc[-1])
    daily_volatility = calculate_daily_volatility(close)
    annualized_volatility = calculate_annualized_volatility(daily_volatility)
    atr_14 = calculate_atr(history, period=14)
    recent_high = safe_float(high.max())
    recent_low = safe_float(low.min())
    distance_from_high = percentage_distance(latest_close, recent_high)
    distance_from_low = percentage_distance(latest_close, recent_low)
    max_drawdown = calculate_max_drawdown(close)
    risk_level = classify_risk_level(daily_volatility, max_drawdown)

    return {
        "symbol": clean_symbol,
        "daily_volatility_percent": daily_volatility,
        "annualized_volatility_percent": annualized_volatility,
        "atr_14": atr_14,
        "recent_high": recent_high,
        "recent_low": recent_low,
        "distance_from_recent_high_percent": distance_from_high,
        "distance_from_recent_low_percent": distance_from_low,
        "max_drawdown_percent": max_drawdown,
        "risk_level": risk_level,
        "risk_explanation": generate_risk_explanation(risk_level, daily_volatility, max_drawdown),
        "risk_notes": [
            "Higher volatility means price can move quickly in either direction.",
            "ATR helps estimate average price movement, not future direction.",
            "Drawdown shows how much the price declined from a recent peak.",
        ],
        "learning_points": [
            "Check risk before looking at possible reward.",
            "Avoid relying on one indicator alone.",
            "Use position sizing and stop-loss planning only as educational risk concepts.",
        ],
        "disclaimer": DISCLAIMER,
    }


def validate_ohlc_history(symbol: str, history: pd.DataFrame) -> None:
    missing_columns = REQUIRED_OHLC_COLUMNS - set(history.columns)
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise market_data_error(f"Market data for {symbol} is missing required OHLC columns: {missing}")

    for column in REQUIRED_OHLC_COLUMNS:
        if history[column].dropna().empty:
            raise market_data_error(f"Market data for {symbol} has no usable {column} values")


def calculate_daily_volatility(close: pd.Series) -> float:
    returns = close.pct_change().dropna()
    if returns.empty:
        return 0.0
    return safe_float(returns.std(ddof=0) * 100)


def calculate_annualized_volatility(daily_volatility_percent: float) -> float:
    return safe_float(daily_volatility_percent * math.sqrt(252))


def calculate_atr(history: pd.DataFrame, period: int = 14) -> float:
    high = history["High"]
    low = history["Low"]
    close = history["Close"]
    previous_close = close.shift(1)

    true_range = pd.concat(
        [
            high - low,
            (high - previous_close).abs(),
            (low - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)

    atr = true_range.rolling(window=period, min_periods=1).mean().dropna()
    if atr.empty:
        return 0.0
    return safe_float(atr.iloc[-1])


def calculate_max_drawdown(close: pd.Series) -> float:
    running_high = close.cummax()
    drawdown = (close / running_high - 1) * 100
    if drawdown.dropna().empty:
        return 0.0
    return safe_float(drawdown.min())


def classify_risk_level(daily_volatility_percent: float, max_drawdown_percent: float) -> str:
    if daily_volatility_percent > 2.5 or max_drawdown_percent < -15:
        return "high"

    if daily_volatility_percent >= 1.2 or max_drawdown_percent <= -8:
        return "medium"

    return "low"


def generate_risk_explanation(
    risk_level: str,
    daily_volatility_percent: float,
    max_drawdown_percent: float,
) -> str:
    if risk_level == "high":
        return (
            "This stock is showing higher risk conditions based on recent volatility or drawdown. "
            f"Daily volatility is {daily_volatility_percent}% and max drawdown is {max_drawdown_percent}%."
        )

    if risk_level == "medium":
        return (
            "This stock is showing moderate risk conditions based on recent price movement and drawdown. "
            f"Daily volatility is {daily_volatility_percent}% and max drawdown is {max_drawdown_percent}%."
        )

    return (
        "This stock is showing lower risk conditions based on the loaded historical data. "
        f"Daily volatility is {daily_volatility_percent}% and max drawdown is {max_drawdown_percent}%."
    )


def percentage_distance(current_value: float, reference_value: float) -> float:
    if reference_value == 0:
        return 0.0
    return safe_float((current_value - reference_value) / reference_value * 100)


def safe_float(value: Any) -> float:
    number = float(value)
    if not np.isfinite(number):
        return 0.0
    return round(number, 2)
