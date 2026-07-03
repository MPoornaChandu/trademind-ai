from __future__ import annotations

import json
import math
import os
import warnings
from typing import Any

warnings.filterwarnings("ignore", message="Using `httpx` with `starlette.testclient` is deprecated.*")

from fastapi.testclient import TestClient

# Keep this smoke test deterministic. The analysis endpoint should use the
# rule-based fallback even if a local .env file exists.
os.environ["GEMINI_API_KEY"] = ""

from app.main import app  # noqa: E402


client = TestClient(app)

VALID_ENDPOINTS = [
    ("health endpoint", "/health"),
    ("market endpoint for RELIANCE.NS", "/api/market/RELIANCE.NS"),
    ("indicators endpoint for RELIANCE.NS", "/api/indicators/RELIANCE.NS"),
    ("analysis endpoint for RELIANCE.NS", "/api/analysis/RELIANCE.NS"),
    ("risk endpoint for RELIANCE.NS", "/api/risk/RELIANCE.NS"),
    ("risk endpoint for TCS.NS", "/api/risk/TCS.NS"),
]

INVALID_ENDPOINTS = [
    ("market endpoint invalid symbol handling", "/api/market/INVALID_SYMBOL"),
    ("indicators endpoint invalid symbol handling", "/api/indicators/INVALID_SYMBOL"),
    ("analysis endpoint invalid symbol handling", "/api/analysis/INVALID_SYMBOL"),
    ("risk endpoint invalid symbol handling", "/api/risk/INVALID_SYMBOL"),
]

CONTROLLED_ERROR_CODES = {400, 404, 502}


def assert_json_safe(value: Any) -> None:
    json.dumps(value, allow_nan=False)
    assert_no_invalid_numbers(value)


def assert_no_invalid_numbers(value: Any) -> None:
    if isinstance(value, dict):
        for item in value.values():
            assert_no_invalid_numbers(item)
        return

    if isinstance(value, list):
        for item in value:
            assert_no_invalid_numbers(item)
        return

    if isinstance(value, float) and not math.isfinite(value):
        raise AssertionError(f"Invalid JSON number found: {value}")


def get_json(response) -> Any:
    try:
        data = response.json()
    except ValueError as exc:
        raise AssertionError("Response was not valid JSON") from exc

    assert_json_safe(data)
    return data


def assert_valid_endpoint(name: str, path: str) -> None:
    response = client.get(path)
    if response.status_code != 200:
        raise AssertionError(f"{name} expected 200, got {response.status_code}: {response.text}")

    data = get_json(response)

    if path == "/health":
        assert data["status"] == "ok"

    if path.startswith("/api/market/"):
        assert data["symbol"] == "RELIANCE.NS"
        assert data["candles_loaded"] > 0
        assert data["latest_close"] > 0

    if path.startswith("/api/indicators/"):
        assert data["symbol"] == "RELIANCE.NS"
        assert data["trend"] in {"bullish", "bearish", "neutral"}
        assert data["explanation"]

    if path.startswith("/api/analysis/"):
        assert data["symbol"] == "RELIANCE.NS"
        assert data["source"] in {"rule_based", "fallback_after_ai_error"}
        assert data["disclaimer"] == "Educational analysis only. Not financial advice."
        assert data["summary"]

    if path.startswith("/api/risk/"):
        expected_symbol = path.rsplit("/", 1)[-1]
        assert data["symbol"] == expected_symbol
        assert data["risk_level"] in {"low", "medium", "high"}
        assert data["disclaimer"] == "Educational risk analysis only. Not financial advice."


def assert_invalid_endpoint(name: str, path: str) -> None:
    response = client.get(path)
    if response.status_code not in CONTROLLED_ERROR_CODES:
        raise AssertionError(f"{name} expected controlled error, got {response.status_code}: {response.text}")

    data = get_json(response)
    if not data.get("detail"):
        raise AssertionError(f"{name} did not return a clear error detail")


def run_check(name: str, check) -> bool:
    try:
        check()
    except Exception as exc:
        print(f"FAIL: {name}")
        print(f"      {exc}")
        return False

    print(f"PASS: {name}")
    return True


def main() -> None:
    results: list[bool] = []

    for name, path in VALID_ENDPOINTS:
        results.append(run_check(name, lambda path=path, name=name: assert_valid_endpoint(name, path)))

    for name, path in INVALID_ENDPOINTS:
        results.append(run_check(name, lambda path=path, name=name: assert_invalid_endpoint(name, path)))

    passed = sum(results)
    total = len(results)
    print(f"Smoke test complete: {passed}/{total} checks passed.")

    if not all(results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
