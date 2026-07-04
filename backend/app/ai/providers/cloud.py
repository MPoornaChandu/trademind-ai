from __future__ import annotations

from typing import Any

from app.ai.providers.base import AIProvider
from app.ai.schemas import AnalysisResult, ProviderError, ProviderHealth


class CloudProvider(AIProvider):
    name = "cloud"

    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        raise ProviderError(
            "Cloud provider is not implemented yet. TODO: evaluate Kimi K2.6, GLM-5.2, and Nemotron."
        )

    def health(self) -> ProviderHealth:
        return ProviderHealth(
            provider=self.name,
            available=False,
            configured=False,
            status="unimplemented",
            error="Cloud provider is registered as a future stub.",
        )
