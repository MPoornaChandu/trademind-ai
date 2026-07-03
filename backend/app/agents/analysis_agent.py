from __future__ import annotations

import json
import os
import re
from typing import Any

from app.services.market_data import get_indicator_summary, get_market_summary

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - only used if optional dependency is missing.
    load_dotenv = None

if load_dotenv:
    load_dotenv()


DISCLAIMER = "Educational analysis only. Not financial advice."
AI_ERROR_NOTE = "AI model unavailable, using rule-based educational analysis."
FORBIDDEN_PHRASES = [
    "buy now",
    "sell now",
    "guaranteed profit",
    "sure shot",
    "target price",
]


def get_analysis_summary(symbol: str) -> dict[str, Any]:
    market = get_market_summary(symbol)
    indicators = get_indicator_summary(symbol)
    fallback = build_rule_based_analysis(market, indicators, source="rule_based")

    if not os.getenv("GEMINI_API_KEY"):
        return fallback

    try:
        gemini_analysis = build_gemini_analysis(market, indicators)
    except Exception:
        fallback_after_error = build_rule_based_analysis(market, indicators, source="fallback_after_ai_error")
        fallback_after_error["risk_notes"] = [AI_ERROR_NOTE, *fallback_after_error["risk_notes"]]
        return fallback_after_error

    if not is_safe_analysis(gemini_analysis):
        fallback_after_error = build_rule_based_analysis(market, indicators, source="fallback_after_ai_error")
        fallback_after_error["risk_notes"] = [
            "AI response did not meet safety rules, using rule-based educational analysis.",
            *fallback_after_error["risk_notes"],
        ]
        return fallback_after_error

    return gemini_analysis


def build_rule_based_analysis(
    market: dict[str, Any],
    indicators: dict[str, Any],
    source: str,
) -> dict[str, Any]:
    symbol = str(market["symbol"])
    trend = str(indicators["trend"])
    latest_close = market["latest_close"]
    change_percent = market["price_change_percentage"]
    rsi = indicators.get("rsi_14")
    macd_histogram = indicators.get("macd_histogram")

    summary = (
        f"{symbol} is showing a {trend} educational indicator profile based on recent price action, "
        f"moving averages, RSI, and MACD. The latest close is {latest_close}, with a recent change of "
        f"{change_percent}%."
    )

    if trend == "bullish":
        trend_interpretation = (
            "The current readings lean positive because price and momentum signals are showing strength. "
            "This can suggest improving momentum, but it does not guarantee future movement."
        )
    elif trend == "bearish":
        trend_interpretation = (
            "The current readings lean cautious because price and momentum signals are showing weakness. "
            "This can suggest weaker momentum, but markets can change quickly."
        )
    else:
        trend_interpretation = (
            "The current readings are mixed, so the signal is neutral. This means the indicators do not "
            "strongly agree on one clear direction."
        )

    return {
        "symbol": symbol,
        "summary": summary,
        "trend_interpretation": trend_interpretation,
        "indicator_explanation": [
            f"RSI 14 is {format_optional_number(rsi)}. RSI helps learners judge whether momentum is stretched or balanced.",
            "SMA and EMA compare recent price with average price levels to understand short-term and medium-term trend.",
            f"MACD histogram is {format_optional_number(macd_histogram)}. MACD helps compare momentum direction and strength.",
        ],
        "risk_notes": [
            "Market data from Yahoo Finance can be delayed or temporarily unavailable.",
            "Indicators can fail during news events, gaps, or sudden volatility.",
            "This analysis should not be used as a standalone trading decision.",
        ],
        "learning_points": [
            "Compare RSI with trend before forming a view.",
            "Look for confirmation across multiple indicators instead of relying on one value.",
            "Use risk management and position sizing concepts before studying any trade idea.",
        ],
        "disclaimer": DISCLAIMER,
        "source": source,
    }


def build_gemini_analysis(market: dict[str, Any], indicators: dict[str, Any]) -> dict[str, Any]:
    from google import genai

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    response = client.models.generate_content(
        model=model,
        contents=build_gemini_prompt(market, indicators),
    )
    parsed = parse_json_object(response.text or "")
    return normalize_ai_analysis(parsed, str(market["symbol"]))


def build_gemini_prompt(market: dict[str, Any], indicators: dict[str, Any]) -> str:
    return f"""
You are an educational market analysis assistant.
Do not provide financial advice.
Do not tell the user to buy, sell, hold, short, or enter a trade.
Do not predict guaranteed profits.
Explain indicators in simple language.
Mention uncertainty and risk.
Use the provided market data only.
Return concise structured analysis.

Return only valid JSON with these keys:
symbol, summary, trend_interpretation, indicator_explanation, risk_notes, learning_points, disclaimer.
The list fields must be arrays of short strings.
The disclaimer must be: {DISCLAIMER}

Market data:
{json.dumps(market, indent=2)}

Indicators:
{json.dumps(indicators, indent=2)}
""".strip()


def parse_json_object(text: str) -> dict[str, Any]:
    clean_text = text.strip()
    clean_text = re.sub(r"^```(?:json)?", "", clean_text, flags=re.IGNORECASE).strip()
    clean_text = re.sub(r"```$", "", clean_text).strip()
    return json.loads(clean_text)


def normalize_ai_analysis(data: dict[str, Any], symbol: str) -> dict[str, Any]:
    return {
        "symbol": symbol,
        "summary": string_value(data.get("summary")),
        "trend_interpretation": string_value(data.get("trend_interpretation")),
        "indicator_explanation": string_list(data.get("indicator_explanation")),
        "risk_notes": string_list(data.get("risk_notes")),
        "learning_points": string_list(data.get("learning_points")),
        "disclaimer": DISCLAIMER,
        "source": "gemini",
    }


def string_value(value: Any) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    raise ValueError("AI response is missing a required text field.")


def string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        raise ValueError("AI response is missing a required list field.")

    clean_values = [str(item).strip() for item in value if str(item).strip()]
    if not clean_values:
        raise ValueError("AI response contained an empty list field.")
    return clean_values[:5]


def is_safe_analysis(analysis: dict[str, Any]) -> bool:
    combined_text = json.dumps(analysis, ensure_ascii=False).lower()
    return not any(phrase in combined_text for phrase in FORBIDDEN_PHRASES)


def format_optional_number(value: Any) -> str:
    if value is None:
        return "not available"
    return str(value)
