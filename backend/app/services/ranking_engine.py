from __future__ import annotations

from typing import Any

from app.agents.risk_agent import DISCLAIMER, get_risk_summary
from app.services.market_data import get_indicator_summary, get_market_summary, normalize_symbol


SCORE_WEIGHTS = {
    "trend_score": 0.25,
    "momentum_score": 0.20,
    "rsi_score": 0.15,
    "macd_score": 0.15,
    "volatility_score": 0.10,
    "drawdown_score": 0.10,
    "risk_score": 0.05,
}


def get_ranking_summary(symbol: str) -> dict[str, Any]:
    clean_symbol = normalize_symbol(symbol)
    market = get_market_summary(clean_symbol)
    indicators = get_indicator_summary(clean_symbol)
    risk = get_risk_summary(clean_symbol)

    subscores = {
        "trend_score": score_trend(indicators),
        "momentum_score": score_momentum(indicators, market),
        "rsi_score": score_rsi(indicators.get("rsi_14")),
        "macd_score": score_macd(indicators),
        "volatility_score": score_volatility(risk.get("daily_volatility_percent")),
        "drawdown_score": score_drawdown(risk.get("max_drawdown_percent")),
        "risk_score": score_risk_level(risk.get("risk_level")),
    }
    score = calculate_weighted_score(subscores)
    signal_alignment = count_aligned_signals(subscores)
    warnings = build_warnings(indicators, risk)

    return {
        "symbol": clean_symbol,
        "score": score,
        "setup_quality": classify_setup_quality(score, risk.get("risk_level"), indicators.get("trend")),
        "confidence": classify_confidence(indicators, risk, signal_alignment, warnings),
        "risk_level": risk.get("risk_level", "medium"),
        "subscores": subscores,
        "reasons": build_reasons(indicators, risk, subscores),
        "warnings": warnings,
        "what_could_go_wrong": build_what_could_go_wrong(indicators, risk),
        "disclaimer": DISCLAIMER,
    }


def calculate_weighted_score(subscores: dict[str, int]) -> int:
    score = sum(subscores[key] * weight for key, weight in SCORE_WEIGHTS.items())
    return clamp_score(round(score))


def score_trend(indicators: dict[str, Any]) -> int:
    latest_close = indicators.get("latest_close")
    sma_20 = indicators.get("sma_20")
    sma_50 = indicators.get("sma_50")
    ema_20 = indicators.get("ema_20")
    trend = indicators.get("trend")

    score = 50
    if trend == "bullish":
        score += 22
    elif trend == "bearish":
        score -= 22

    if all_numbers(latest_close, sma_20, sma_50):
        if latest_close > sma_20 > sma_50:
            score += 18
        elif latest_close < sma_20 < sma_50:
            score -= 18
        elif latest_close > sma_20 or sma_20 > sma_50:
            score += 8
        elif latest_close < sma_20 or sma_20 < sma_50:
            score -= 8

    if all_numbers(latest_close, ema_20):
        score += 8 if latest_close > ema_20 else -8

    return clamp_score(score)


def score_momentum(indicators: dict[str, Any], market: dict[str, Any]) -> int:
    macd_histogram = indicators.get("macd_histogram")
    price_change_percentage = market.get("price_change_percentage")
    score = 50

    if isinstance(macd_histogram, (int, float)):
        if macd_histogram > 0:
            score += min(22, 10 + abs(macd_histogram) * 4)
        elif macd_histogram < 0:
            score -= min(22, 10 + abs(macd_histogram) * 4)

    if isinstance(price_change_percentage, (int, float)):
        if price_change_percentage > 0:
            score += min(18, price_change_percentage * 4)
        elif price_change_percentage < 0:
            score -= min(18, abs(price_change_percentage) * 4)

    return clamp_score(round(score))


def score_rsi(rsi_14: Any) -> int:
    if not isinstance(rsi_14, (int, float)):
        return 50

    if 45 <= rsi_14 <= 65:
        return 82
    if 35 <= rsi_14 < 45 or 65 < rsi_14 <= 70:
        return 68
    if 30 <= rsi_14 < 35:
        return 54
    if rsi_14 < 30:
        return 42
    return 38


def score_macd(indicators: dict[str, Any]) -> int:
    macd = indicators.get("macd")
    macd_signal = indicators.get("macd_signal")
    macd_histogram = indicators.get("macd_histogram")

    if not all_numbers(macd, macd_signal, macd_histogram):
        return 50

    score = 50
    score += 24 if macd > macd_signal else -24
    score += 18 if macd_histogram > 0 else -18 if macd_histogram < 0 else 0
    return clamp_score(score)


def score_volatility(daily_volatility_percent: Any) -> int:
    if not isinstance(daily_volatility_percent, (int, float)):
        return 50

    if daily_volatility_percent <= 0.8:
        return 88
    if daily_volatility_percent <= 1.5:
        return 76
    if daily_volatility_percent <= 2.5:
        return 62
    if daily_volatility_percent <= 4:
        return 42
    return 25


def score_drawdown(max_drawdown_percent: Any) -> int:
    if not isinstance(max_drawdown_percent, (int, float)):
        return 50

    drawdown = abs(max_drawdown_percent)
    if drawdown <= 3:
        return 90
    if drawdown <= 8:
        return 74
    if drawdown <= 15:
        return 55
    if drawdown <= 25:
        return 35
    return 22


def score_risk_level(risk_level: Any) -> int:
    if risk_level == "low":
        return 86
    if risk_level == "medium":
        return 62
    if risk_level == "high":
        return 32
    return 50


def classify_setup_quality(score: int, risk_level: Any, trend: Any) -> str:
    if risk_level == "high" and score < 65:
        return "high-risk setup"
    if score >= 80 and trend == "bullish" and risk_level != "high":
        return "high-quality bullish setup"
    if score >= 65 and trend in {"bullish", "neutral"}:
        return "medium-quality bullish setup"
    if score >= 50:
        return "neutral / mixed setup"
    return "weak setup"


def classify_confidence(
    indicators: dict[str, Any],
    risk: dict[str, Any],
    signal_alignment: int,
    warnings: list[str],
) -> str:
    required_values = [
        indicators.get("sma_20"),
        indicators.get("sma_50"),
        indicators.get("ema_20"),
        indicators.get("rsi_14"),
        indicators.get("macd"),
        indicators.get("macd_signal"),
        indicators.get("macd_histogram"),
        risk.get("daily_volatility_percent"),
        risk.get("max_drawdown_percent"),
        risk.get("risk_level"),
    ]
    completeness = sum(value is not None for value in required_values) / len(required_values)

    if completeness >= 0.9 and signal_alignment >= 5 and len(warnings) <= 2:
        return "high"
    if completeness >= 0.75 and signal_alignment >= 3:
        return "medium"
    return "low"


def count_aligned_signals(subscores: dict[str, int]) -> int:
    return sum(1 for score in subscores.values() if score >= 60)


def build_reasons(indicators: dict[str, Any], risk: dict[str, Any], subscores: dict[str, int]) -> list[str]:
    reasons: list[str] = []

    if subscores["trend_score"] >= 65:
        reasons.append("Trend is constructive based on moving averages.")
    elif subscores["trend_score"] <= 40:
        reasons.append("Trend is weak based on moving averages.")

    if subscores["rsi_score"] >= 65:
        reasons.append("RSI is in a healthier educational range, not extremely stretched.")
    elif indicators.get("rsi_14") is not None:
        reasons.append("RSI is outside the healthier range, which raises uncertainty.")

    if subscores["macd_score"] >= 65 or subscores["momentum_score"] >= 65:
        reasons.append("MACD and recent price momentum are supportive.")
    elif subscores["macd_score"] <= 40:
        reasons.append("MACD is not confirming positive momentum.")

    if risk.get("risk_level") == "low":
        reasons.append("Recent volatility and drawdown are lower in the loaded data.")
    elif risk.get("risk_level") == "high":
        reasons.append("Risk metrics are elevated, so the setup needs extra caution.")

    if not reasons:
        reasons.append("Signals are mixed, so the setup quality is balanced rather than strongly directional.")

    return reasons[:4]


def build_warnings(indicators: dict[str, Any], risk: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    rsi_14 = indicators.get("rsi_14")
    daily_volatility = risk.get("daily_volatility_percent")
    max_drawdown = risk.get("max_drawdown_percent")
    distance_from_high = risk.get("distance_from_recent_high_percent")

    if isinstance(distance_from_high, (int, float)) and -3 <= distance_from_high <= 0.5:
        warnings.append("Price is near a recent high, so reversal risk exists.")
    if isinstance(rsi_14, (int, float)) and rsi_14 > 70:
        warnings.append("RSI is overbought, which can increase pullback risk.")
    if isinstance(daily_volatility, (int, float)) and daily_volatility > 2.5:
        warnings.append("Volatility is high, so uncertainty is elevated.")
    elif isinstance(daily_volatility, (int, float)) and daily_volatility >= 1.2:
        warnings.append("Volatility is moderate, so risk planning should be careful.")
    if isinstance(max_drawdown, (int, float)) and max_drawdown < -15:
        warnings.append("Recent drawdown is large, which weakens setup quality.")
    if indicators.get("trend") == "bearish":
        warnings.append("Trend is bearish based on the current indicator snapshot.")
    if indicators.get("trend") == "neutral":
        warnings.append("Signals are mixed, so confidence is limited.")
    if not has_required_indicator_data(indicators):
        warnings.append("Some indicator data is missing, so the ranking has lower confidence.")

    return warnings[:5]


def build_what_could_go_wrong(indicators: dict[str, Any], risk: dict[str, Any]) -> list[str]:
    items = [
        "Momentum indicators can lag price action.",
        "A broader market reversal can weaken this setup.",
        "Unexpected news can change the risk profile quickly.",
    ]

    if indicators.get("trend") in {"bullish", "neutral"}:
        items.append("A false breakout can reverse before trend confirmation improves.")
    if risk.get("risk_level") in {"medium", "high"}:
        items.append("Higher volatility can create fast adverse moves.")

    return items[:5]


def has_required_indicator_data(indicators: dict[str, Any]) -> bool:
    return all(
        indicators.get(key) is not None
        for key in ("sma_20", "sma_50", "ema_20", "rsi_14", "macd", "macd_signal", "macd_histogram")
    )


def all_numbers(*values: Any) -> bool:
    return all(isinstance(value, (int, float)) for value in values)


def clamp_score(score: int | float) -> int:
    return max(0, min(100, int(score)))
