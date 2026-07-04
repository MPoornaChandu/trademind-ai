from __future__ import annotations

import logging
import os
from typing import Any

from app.ai.providers.base import AIProvider
from app.ai.providers.cloud import CloudProvider
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.ollama import OllamaProvider
from app.ai.providers.rule_based import RuleBasedProvider
from app.ai.safety import is_safe_result
from app.ai.schemas import AnalysisResult, ProviderError, ProviderHealth

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional local development helper.
    load_dotenv = None

if load_dotenv:
    load_dotenv()


ALLOWED_PROVIDERS = {"rule_based", "gemini", "ollama", "cloud"}
DEFAULT_PROVIDER = "rule_based"
logger = logging.getLogger(__name__)


class AIProviderRouter:
    def __init__(self, providers: dict[str, AIProvider] | None = None) -> None:
        self.providers = providers or {
            "rule_based": RuleBasedProvider(),
            "gemini": GeminiProvider(),
            "ollama": OllamaProvider(),
            "cloud": CloudProvider(),
        }

    def analyze(
        self,
        task: str,
        context: dict[str, Any],
        provider: str | None = None,
        depth: str = "full",
    ) -> AnalysisResult:
        requested_provider = self._clean_provider(provider or os.getenv("AI_PROVIDER") or DEFAULT_PROVIDER)
        clean_depth = "quick" if depth == "quick" else "full"
        attempted: set[str] = set()

        for provider_name in self._fallback_chain(requested_provider):
            attempted.add(provider_name)
            selected_provider = self.providers[provider_name]
            attempt_depth = "quick" if provider_name == "ollama" and requested_provider != "ollama" else clean_depth

            if provider_name == "ollama" and not self._is_provider_available(selected_provider):
                logger.warning("AI provider %s is unavailable, falling back.", provider_name)
                continue

            try:
                result = selected_provider.analyze(task, context, attempt_depth)
            except Exception as exc:
                logger.warning("AI provider %s failed, falling back: %s", provider_name, exc)
                continue

            if not is_safe_result(result):
                logger.warning("AI provider %s returned unsafe wording, falling back.", provider_name)
                continue

            return result

        logger.warning("AI providers failed after attempts %s; forcing rule-based result.", sorted(attempted))
        return self.providers["rule_based"].analyze(task, context, clean_depth)

    def health(self) -> dict[str, Any]:
        default_provider = self._clean_provider(os.getenv("AI_PROVIDER") or DEFAULT_PROVIDER)
        providers: list[ProviderHealth] = []

        for name in ["rule_based", "gemini", "ollama", "cloud"]:
            try:
                providers.append(self.providers[name].health())
            except Exception as exc:
                providers.append(
                    ProviderHealth(
                        provider=name,
                        available=False,
                        configured=False,
                        status="health_check_failed",
                        error=str(exc),
                    )
                )

        return {
            "default_provider": default_provider,
            "providers": [provider.model_dump() for provider in providers],
        }

    def _fallback_chain(self, requested_provider: str) -> list[str]:
        chain = [requested_provider]
        if requested_provider != "ollama":
            chain.append("ollama")
        if "rule_based" not in chain:
            chain.append("rule_based")
        return chain

    def _clean_provider(self, provider: str) -> str:
        clean_provider = provider.strip().lower()
        if clean_provider in ALLOWED_PROVIDERS:
            return clean_provider

        logger.warning("Unknown AI provider %s; using %s.", provider, DEFAULT_PROVIDER)
        return DEFAULT_PROVIDER

    def _is_provider_available(self, provider: AIProvider) -> bool:
        try:
            return provider.health().available
        except Exception as exc:
            logger.warning("AI provider %s health check failed: %s", provider.name, exc)
            return False


def get_ai_router() -> AIProviderRouter:
    return AIProviderRouter()


def get_provider_health() -> dict[str, Any]:
    return get_ai_router().health()
