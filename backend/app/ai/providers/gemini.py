from __future__ import annotations

import json
import os
import re
from typing import Any

from pydantic import ValidationError

from app.ai.providers.base import AIProvider
from app.ai.safety import SYSTEM_PROMPT
from app.ai.schemas import DEFAULT_DISCLAIMER, AnalysisResult, ProviderError, ProviderHealth


class GeminiProvider(AIProvider):
    name = "gemini"

    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        if not os.getenv("GEMINI_API_KEY"):
            raise ProviderError("GEMINI_API_KEY is not configured.")

        errors: list[str] = []
        for attempt in range(2):
            try:
                result = self._request_analysis(task, context, attempt)
                result.provider_used = self.name
                return result
            except Exception as exc:
                errors.append(str(exc))

        raise ProviderError(f"Gemini returned invalid analysis after retry: {'; '.join(errors)}")

    def health(self) -> ProviderHealth:
        configured = bool(os.getenv("GEMINI_API_KEY"))
        return ProviderHealth(
            provider=self.name,
            available=configured,
            configured=configured,
            status="ready" if configured else "missing_api_key",
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            error=None if configured else "GEMINI_API_KEY is not configured.",
        )

    def _request_analysis(self, task: str, context: dict[str, Any], attempt: int) -> AnalysisResult:
        from google import genai

        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        response = client.models.generate_content(
            model=model,
            contents=self._prompt(task, context, attempt),
        )
        return self._parse_result(response.text or "")

    def _prompt(self, task: str, context: dict[str, Any], attempt: int) -> str:
        retry_note = "The previous response was invalid. Return only strict JSON." if attempt else ""
        return f"""
{SYSTEM_PROMPT}

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
  "provider_used": "gemini",
  "disclaimer": "{DEFAULT_DISCLAIMER}"
}}

{retry_note}

Context:
{json.dumps(context, indent=2)}
""".strip()

    def _parse_result(self, text: str) -> AnalysisResult:
        clean_text = text.strip()
        clean_text = re.sub(r"^```(?:json)?", "", clean_text, flags=re.IGNORECASE).strip()
        clean_text = re.sub(r"```$", "", clean_text).strip()

        try:
            data = json.loads(clean_text)
            return AnalysisResult.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ProviderError(f"Gemini response did not match the analysis schema: {exc}") from exc
