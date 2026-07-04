from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


DEFAULT_DISCLAIMER = (
    "Educational analysis only. Not financial advice. "
    "No broker execution or real-money trading is included."
)

ProviderName = Literal["rule_based", "gemini", "ollama", "cloud"]
Depth = Literal["quick", "full"]
Outlook = Literal["bullish_bias", "bearish_bias", "neutral", "mixed"]
Confidence = Literal["low", "medium", "high"]


class AnalysisResult(BaseModel):
    outlook: Outlook
    summary: str = Field(min_length=1)
    key_drivers: list[str] = Field(min_length=1)
    uncertainty_notes: list[str] = Field(min_length=1)
    risk_warnings: list[str] = Field(min_length=1)
    what_could_go_wrong: list[str] = Field(min_length=1)
    confidence: Confidence
    provider_used: str
    disclaimer: str = DEFAULT_DISCLAIMER


class ProviderHealth(BaseModel):
    provider: str
    available: bool
    configured: bool
    status: str
    model: str | None = None
    error: str | None = None


class ProviderError(Exception):
    """Raised when an AI provider cannot return a valid educational result."""
