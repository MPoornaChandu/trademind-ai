from __future__ import annotations

import json
import os
from typing import Any

import requests
from pydantic import ValidationError

from app.ai.providers.base import AIProvider
from app.ai.safety import SYSTEM_PROMPT
from app.ai.schemas import DEFAULT_DISCLAIMER, AnalysisResult, ProviderError, ProviderHealth


DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_OLLAMA_MODEL = "qwen3:8b"
DEFAULT_OLLAMA_FAST_MODEL = "gemma3:4b"


class OllamaProvider(AIProvider):
    name = "ollama"

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL") or DEFAULT_OLLAMA_BASE_URL).rstrip("/")

    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        model = self._model_for_depth(depth)
        errors: list[str] = []

        for attempt in range(2):
            try:
                result = self._request_analysis(task, context, model, attempt)
                result.provider_used = f"ollama:{model}"
                return result
            except Exception as exc:
                errors.append(str(exc))

        raise ProviderError(f"Ollama returned invalid analysis after retry: {'; '.join(errors)}")

    def health(self) -> ProviderHealth:
        model = os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=3)
            response.raise_for_status()
        except requests.RequestException as exc:
            return ProviderHealth(
                provider=self.name,
                available=False,
                configured=True,
                status="offline",
                model=model,
                error=str(exc),
            )

        return ProviderHealth(
            provider=self.name,
            available=True,
            configured=True,
            status="ready",
            model=model,
        )

    def _request_analysis(self, task: str, context: dict[str, Any], model: str, attempt: int) -> AnalysisResult:
        payload = {
            "model": model,
            "stream": False,
            "format": "json",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": self._prompt(task, context, attempt)},
            ],
        }

        try:
            response = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=30)
            response.raise_for_status()
        except requests.RequestException as exc:
            raise ProviderError(f"Ollama request failed: {exc}") from exc

        try:
            body = response.json()
        except ValueError as exc:
            raise ProviderError("Ollama response was not valid JSON.") from exc

        content = body.get("message", {}).get("content", "")
        return self._parse_result(content)

    def _prompt(self, task: str, context: dict[str, Any], attempt: int) -> str:
        retry_note = "The previous response was invalid. Return only strict JSON." if attempt else ""
        return f"""
Task:
{task}

Return only valid JSON matching this exact shape:
{{
  "outlook": "bullish_bias | bearish_bias | neutral | mixed",
  "summary": "non-empty educational summary",
  "key_drivers": ["at least one driver"],
  "uncertainty_notes": ["at least one uncertainty note"],
  "risk_warnings": ["at least one risk warning"],
  "what_could_go_wrong": ["at least one item"],
  "confidence": "low | medium | high",
  "provider_used": "ollama",
  "disclaimer": "{DEFAULT_DISCLAIMER}"
}}

{retry_note}

Context:
{json.dumps(context, indent=2)}
""".strip()

    def _parse_result(self, text: str) -> AnalysisResult:
        try:
            data = json.loads(text.strip())
            return AnalysisResult.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ProviderError(f"Ollama response did not match the analysis schema: {exc}") from exc

    def _model_for_depth(self, depth: str) -> str:
        if depth == "quick":
            return os.getenv("OLLAMA_FAST_MODEL", DEFAULT_OLLAMA_FAST_MODEL)

        return os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
