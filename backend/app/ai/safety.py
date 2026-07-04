from __future__ import annotations

from typing import Any

from app.ai.schemas import AnalysisResult


SAFETY_RULES = [
    "Educational decision-support only.",
    "Not financial advice.",
    "No guarantees or sure-shot language.",
    "No real-money trading.",
    "No broker execution.",
    "No direct buy/sell instructions.",
    "Must mention uncertainty.",
    "Must include what could go wrong.",
]

SYSTEM_PROMPT = """
You are TradeMind AI, an educational market analysis assistant.
Follow these safety rules:
- Educational decision-support only.
- Not financial advice.
- No guarantees or sure-shot language.
- No real-money trading or broker execution.
- Do not give direct buy, sell, hold, short, or options instructions.
- Mention uncertainty clearly.
- Include what could go wrong.
- Use cautious language based only on the provided context.
""".strip()

BANNED_PHRASES = [
    "guaranteed",
    "sure shot",
    "will definitely",
    "risk-free",
    "guaranteed profit",
    "100% profit",
    "no risk",
    "must buy",
    "must sell",
]


def contains_banned_phrase(value: Any) -> bool:
    text = flatten_text(value).lower()
    return any(phrase in text for phrase in BANNED_PHRASES)


def is_safe_result(result: AnalysisResult) -> bool:
    return not contains_banned_phrase(result.model_dump())


def flatten_text(value: Any) -> str:
    if isinstance(value, dict):
        return " ".join(flatten_text(item) for item in value.values())

    if isinstance(value, list):
        return " ".join(flatten_text(item) for item in value)

    if isinstance(value, str):
        return value

    return ""
