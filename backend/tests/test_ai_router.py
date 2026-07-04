from __future__ import annotations

from typing import Any

from app.ai.providers.base import AIProvider
from app.ai.providers.cloud import CloudProvider
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.rule_based import RuleBasedProvider
from app.ai.router import AIProviderRouter
from app.ai.schemas import AnalysisResult, ProviderError, ProviderHealth


class FailingProvider(AIProvider):
    def __init__(self, name: str, available: bool = False) -> None:
        self.name = name
        self.available = available

    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        raise ProviderError("offline")

    def health(self) -> ProviderHealth:
        return ProviderHealth(provider=self.name, available=self.available, configured=True, status="offline")


class SafeProvider(AIProvider):
    def __init__(self, name: str) -> None:
        self.name = name

    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        return AnalysisResult(
            outlook="mixed",
            summary="This mocked response is cautious and educational.",
            key_drivers=["Mocked driver"],
            uncertainty_notes=["Mocked uncertainty"],
            risk_warnings=["Mocked risk"],
            what_could_go_wrong=["Mocked failure path"],
            confidence="low",
            provider_used=self.name,
        )

    def health(self) -> ProviderHealth:
        return ProviderHealth(provider=self.name, available=True, configured=True, status="ready")


class RecordingOllamaProvider(SafeProvider):
    def __init__(self) -> None:
        super().__init__("ollama")
        self.depths: list[str] = []

    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        self.depths.append(depth)
        result = super().analyze(task, context, depth)
        result.provider_used = "ollama:test-fast"
        return result


class UnsafeProvider(AIProvider):
    name = "gemini"

    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        return AnalysisResult(
            outlook="bullish_bias",
            summary="This has guaranteed profit in the mocked response.",
            key_drivers=["Mocked driver"],
            uncertainty_notes=["Mocked uncertainty"],
            risk_warnings=["Mocked risk"],
            what_could_go_wrong=["Mocked failure path"],
            confidence="low",
            provider_used=self.name,
        )

    def health(self) -> ProviderHealth:
        return ProviderHealth(provider=self.name, available=True, configured=True, status="ready")


def sample_context() -> dict:
    return {
        "market": {"symbol": "RELIANCE.NS", "price_change_percentage": 0.5},
        "indicators": {"trend": "neutral", "rsi_14": 50, "macd_histogram": 0},
        "risk": {"risk_level": "medium"},
    }


def test_router_falls_back_to_rule_based_when_ollama_fails() -> None:
    router = AIProviderRouter(
        providers={
            "rule_based": RuleBasedProvider(),
            "ollama": FailingProvider("ollama"),
            "gemini": FailingProvider("gemini"),
            "cloud": FailingProvider("cloud"),
        }
    )

    result = router.analyze("Analyze", sample_context(), provider="ollama")

    assert result.provider_used == "rule_based"


def test_router_discards_banned_phrase_and_falls_back() -> None:
    router = AIProviderRouter(
        providers={
            "rule_based": RuleBasedProvider(),
            "ollama": FailingProvider("ollama"),
            "gemini": UnsafeProvider(),
            "cloud": FailingProvider("cloud"),
        }
    )

    result = router.analyze("Analyze", sample_context(), provider="gemini")

    assert result.provider_used == "rule_based"
    assert "guaranteed profit" not in result.summary.lower()


def test_router_discards_banned_phrase_in_disclaimer_and_falls_back() -> None:
    class UnsafeDisclaimerProvider(UnsafeProvider):
        def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
            result = SafeProvider("gemini").analyze(task, context, depth)
            result.disclaimer = "Educational analysis only with guaranteed profit."
            return result

    router = AIProviderRouter(
        providers={
            "rule_based": RuleBasedProvider(),
            "ollama": FailingProvider("ollama"),
            "gemini": UnsafeDisclaimerProvider(),
            "cloud": FailingProvider("cloud"),
        }
    )

    result = router.analyze("Analyze", sample_context(), provider="gemini")

    assert result.provider_used == "rule_based"


def test_router_query_provider_overrides_env_default(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "rule_based")
    router = AIProviderRouter(
        providers={
            "rule_based": RuleBasedProvider(),
            "ollama": FailingProvider("ollama"),
            "gemini": SafeProvider("gemini"),
            "cloud": FailingProvider("cloud"),
        }
    )

    result = router.analyze("Analyze", sample_context(), provider="gemini")

    assert result.provider_used == "gemini"


def test_router_invalid_provider_falls_back_without_crashing() -> None:
    router = AIProviderRouter(
        providers={
            "rule_based": RuleBasedProvider(),
            "ollama": FailingProvider("ollama"),
            "gemini": FailingProvider("gemini"),
            "cloud": FailingProvider("cloud"),
        }
    )

    result = router.analyze("Analyze", sample_context(), provider="unknown-provider")

    assert result.provider_used == "rule_based"


def test_router_gemini_missing_key_falls_back_safely(monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    router = AIProviderRouter(
        providers={
            "rule_based": RuleBasedProvider(),
            "ollama": FailingProvider("ollama"),
            "gemini": GeminiProvider(),
            "cloud": FailingProvider("cloud"),
        }
    )

    result = router.analyze("Analyze", sample_context(), provider="gemini")

    assert result.provider_used == "rule_based"


def test_router_cloud_stub_falls_back_safely() -> None:
    router = AIProviderRouter(
        providers={
            "rule_based": RuleBasedProvider(),
            "ollama": FailingProvider("ollama"),
            "gemini": FailingProvider("gemini"),
            "cloud": CloudProvider(),
        }
    )

    result = router.analyze("Analyze", sample_context(), provider="cloud")

    assert result.provider_used == "rule_based"


def test_router_uses_quick_ollama_depth_when_falling_back_from_ai_provider() -> None:
    ollama = RecordingOllamaProvider()
    router = AIProviderRouter(
        providers={
            "rule_based": RuleBasedProvider(),
            "ollama": ollama,
            "gemini": FailingProvider("gemini", available=True),
            "cloud": FailingProvider("cloud"),
        }
    )

    result = router.analyze("Analyze", sample_context(), provider="gemini", depth="full")

    assert result.provider_used == "ollama:test-fast"
    assert ollama.depths == ["quick"]
