from __future__ import annotations

from typing import Any

from app.agents.risk_agent import get_risk_summary
from app.ai.router import get_ai_router
from app.ai.schemas import DEFAULT_DISCLAIMER, AnalysisResult
from app.services.market_data import get_indicator_summary, get_market_summary


LEGACY_DISCLAIMER = DEFAULT_DISCLAIMER


def get_analysis_summary(symbol: str, provider: str | None = None, depth: str = "full") -> dict[str, Any]:
    market = get_market_summary(symbol)
    indicators = get_indicator_summary(symbol)
    risk = get_optional_risk_summary(symbol)
    context = {
        "market": market,
        "indicators": indicators,
        "risk": risk if "error" not in risk else {},
        "risk_error": risk.get("error"),
    }

    result = get_ai_router().analyze(
        task=f"Create an educational market analysis for {market['symbol']}.",
        context=context,
        provider=provider,
        depth=depth,
    )

    return to_compatible_analysis(market["symbol"], result)


def get_optional_risk_summary(symbol: str) -> dict[str, Any]:
    try:
        return get_risk_summary(symbol)
    except Exception as exc:
        return {"error": str(exc)}


def to_compatible_analysis(symbol: str, result: AnalysisResult) -> dict[str, Any]:
    return {
        "symbol": symbol,
        "summary": result.summary,
        "trend_interpretation": outlook_sentence(result.outlook, result.confidence),
        "indicator_explanation": result.key_drivers,
        "risk_notes": result.risk_warnings,
        "learning_points": [
            *result.uncertainty_notes,
            *result.what_could_go_wrong,
        ][:6],
        "disclaimer": LEGACY_DISCLAIMER,
        "source": provider_family(result.provider_used),
        "provider_used": result.provider_used,
        "outlook": result.outlook,
        "key_drivers": result.key_drivers,
        "uncertainty_notes": result.uncertainty_notes,
        "risk_warnings": result.risk_warnings,
        "what_could_go_wrong": result.what_could_go_wrong,
        "confidence": result.confidence,
        "ai_disclaimer": result.disclaimer,
        "ai_result": result.model_dump(),
    }


def provider_family(provider_used: str) -> str:
    if provider_used.startswith("ollama:"):
        return "ollama"

    return provider_used


def outlook_sentence(outlook: str, confidence: str) -> str:
    descriptions = {
        "bullish_bias": "The structured AI result leans bullish-biased, but it remains educational and uncertain.",
        "bearish_bias": "The structured AI result leans bearish-biased, but it remains educational and uncertain.",
        "neutral": "The structured AI result is neutral because the available signals do not strongly align.",
        "mixed": "The structured AI result is mixed because the indicators and risk context do not fully agree.",
    }
    return f"{descriptions.get(outlook, descriptions['mixed'])} Confidence: {confidence}."
