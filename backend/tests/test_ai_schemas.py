from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.ai.schemas import DEFAULT_DISCLAIMER, AnalysisResult


def valid_payload() -> dict:
    return {
        "outlook": "mixed",
        "summary": "Signals are mixed in this educational snapshot.",
        "key_drivers": ["Trend and momentum are not fully aligned."],
        "uncertainty_notes": ["Market conditions can change."],
        "risk_warnings": ["Volatility can affect outcomes."],
        "what_could_go_wrong": ["News could change the setup."],
        "confidence": "low",
        "provider_used": "rule_based",
    }


@pytest.mark.parametrize("field", ["key_drivers", "uncertainty_notes", "risk_warnings", "what_could_go_wrong"])
def test_analysis_result_requires_non_empty_lists(field: str) -> None:
    payload = valid_payload()
    payload[field] = []

    with pytest.raises(ValidationError):
        AnalysisResult.model_validate(payload)


def test_analysis_result_requires_summary() -> None:
    payload = valid_payload()
    payload["summary"] = ""

    with pytest.raises(ValidationError):
        AnalysisResult.model_validate(payload)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("outlook", "strong_buy"),
        ("confidence", "certain"),
    ],
)
def test_analysis_result_restricts_enums(field: str, value: str) -> None:
    payload = valid_payload()
    payload[field] = value

    with pytest.raises(ValidationError):
        AnalysisResult.model_validate(payload)


def test_analysis_result_adds_standard_disclaimer() -> None:
    result = AnalysisResult.model_validate(valid_payload())

    assert result.disclaimer == DEFAULT_DISCLAIMER
