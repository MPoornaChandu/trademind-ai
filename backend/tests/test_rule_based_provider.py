from __future__ import annotations

from app.ai.providers.rule_based import RuleBasedProvider


def context(trend: str, rsi: float, macd_histogram: float, risk_level: str = "medium") -> dict:
    return {
        "market": {
            "symbol": "RELIANCE.NS",
            "price_change_percentage": 1.2,
        },
        "indicators": {
            "trend": trend,
            "rsi_14": rsi,
            "macd_histogram": macd_histogram,
        },
        "risk": {
            "risk_level": risk_level,
            "daily_volatility_percent": 1.3,
            "max_drawdown_percent": -4.5,
        },
    }


def test_rule_based_returns_bullish_bias_for_aligned_bullish_fixture() -> None:
    result = RuleBasedProvider().analyze("Analyze symbol", context("bullish", 58, 0.7))

    assert result.outlook == "bullish_bias"
    assert result.provider_used == "rule_based"
    assert result.key_drivers


def test_rule_based_returns_bearish_bias_for_aligned_bearish_fixture() -> None:
    result = RuleBasedProvider().analyze("Analyze symbol", context("bearish", 42, -0.4))

    assert result.outlook == "bearish_bias"
    assert result.provider_used == "rule_based"
    assert result.risk_warnings


def test_rule_based_returns_neutral_or_mixed_for_unclear_fixture() -> None:
    result = RuleBasedProvider().analyze("Analyze symbol", context("neutral", 51, 0.0))

    assert result.outlook in {"neutral", "mixed"}
    assert result.provider_used == "rule_based"
    assert result.what_could_go_wrong
