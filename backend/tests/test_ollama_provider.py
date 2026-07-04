from __future__ import annotations

import json

import pytest

from app.ai.providers.ollama import OllamaProvider
from app.ai.schemas import ProviderError


class MockResponse:
    def __init__(self, body: dict, status_error: Exception | None = None) -> None:
        self.body = body
        self.status_error = status_error

    def raise_for_status(self) -> None:
        if self.status_error:
            raise self.status_error

    def json(self) -> dict:
        return self.body


def valid_analysis_payload() -> dict:
    return {
        "outlook": "mixed",
        "summary": "Signals are mixed in this educational response.",
        "key_drivers": ["Momentum and trend are not fully aligned."],
        "uncertainty_notes": ["Market data can change."],
        "risk_warnings": ["Volatility can affect the setup."],
        "what_could_go_wrong": ["News could change the reading."],
        "confidence": "low",
        "provider_used": "ollama",
    }


def test_ollama_valid_json_response_returns_analysis_result(monkeypatch: pytest.MonkeyPatch) -> None:
    captured_payload: dict = {}

    def mock_post(*args, **kwargs) -> MockResponse:
        captured_payload.update(kwargs["json"])
        return MockResponse({"message": {"content": json.dumps(valid_analysis_payload())}})

    monkeypatch.setattr("app.ai.providers.ollama.requests.post", mock_post)

    result = OllamaProvider(base_url="http://localhost:11434").analyze("Analyze", {}, depth="quick")

    assert result.provider_used == "ollama:gemma3:4b"
    assert captured_payload["model"] == "gemma3:4b"
    assert result.summary


def test_ollama_invalid_response_raises_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def mock_post(*args, **kwargs) -> MockResponse:
        return MockResponse({"message": {"content": "{}"}})

    monkeypatch.setattr("app.ai.providers.ollama.requests.post", mock_post)

    with pytest.raises(ProviderError):
        OllamaProvider(base_url="http://localhost:11434").analyze("Analyze", {})
