from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.ai.schemas import AnalysisResult, ProviderHealth


class AIProvider(ABC):
    name: str

    @abstractmethod
    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        raise NotImplementedError

    @abstractmethod
    def health(self) -> ProviderHealth:
        raise NotImplementedError
