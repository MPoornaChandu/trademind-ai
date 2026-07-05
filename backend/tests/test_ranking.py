from __future__ import annotations

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api import ranking as ranking_api
from app.agents.risk_agent import DISCLAIMER
from app.main import app
from app.services.ranking_engine import calculate_weighted_score, get_ranking_summary


client = TestClient(app)

BANNED_PHRASES = [
    "must buy",
    "must sell",
    "guaranteed",
    "sure shot",
    "risk-free",
    "100% profit",
    "guaranteed profit",
]


def ranking_payload(symbol: str, score: int) -> dict:
    return {
        "symbol": symbol,
        "score": score,
        "setup_quality": "medium-quality bullish setup" if score >= 65 else "neutral / mixed setup",
        "confidence": "medium",
        "risk_level": "medium",
        "subscores": {
            "trend_score": score,
            "momentum_score": score,
            "rsi_score": score,
            "macd_score": score,
            "volatility_score": score,
            "drawdown_score": score,
            "risk_score": score,
        },
        "reasons": ["Trend is constructive based on moving averages."],
        "warnings": ["Signals are mixed, so confidence is limited."],
        "what_could_go_wrong": ["Momentum indicators can lag price action."],
        "disclaimer": DISCLAIMER,
    }


def test_ranking_endpoint_returns_score_subscores_and_disclaimer(monkeypatch) -> None:
    monkeypatch.setattr(ranking_api, "get_ranking_summary", lambda symbol: ranking_payload(symbol, 78))

    response = client.get("/api/ranking/RELIANCE.NS")

    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "RELIANCE.NS"
    assert 0 <= data["score"] <= 100
    assert set(data["subscores"]) == {
        "trend_score",
        "momentum_score",
        "rsi_score",
        "macd_score",
        "volatility_score",
        "drawdown_score",
        "risk_score",
    }
    assert data["disclaimer"] == DISCLAIMER


def test_ranking_response_does_not_use_banned_phrases(monkeypatch) -> None:
    monkeypatch.setattr(ranking_api, "get_ranking_summary", lambda symbol: ranking_payload(symbol, 72))

    response = client.get("/api/ranking/TCS.NS")
    body = response.text.lower()

    assert response.status_code == 200
    for phrase in BANNED_PHRASES:
        assert phrase not in body


def test_compare_endpoint_returns_sorted_rankings(monkeypatch) -> None:
    scores = {"RELIANCE.NS": 68, "TCS.NS": 84, "INFY.NS": 51}
    monkeypatch.setattr(ranking_api, "get_ranking_summary", lambda symbol: ranking_payload(symbol, scores[symbol]))

    response = client.post("/api/ranking/compare", json={"symbols": ["RELIANCE.NS", "TCS.NS", "INFY.NS"]})

    assert response.status_code == 200
    data = response.json()
    assert [item["symbol"] for item in data["rankings"]] == ["TCS.NS", "RELIANCE.NS", "INFY.NS"]
    assert [item["rank"] for item in data["rankings"]] == [1, 2, 3]
    assert data["best_setup"] == "TCS.NS"
    assert data["disclaimer"] == DISCLAIMER


def test_compare_endpoint_keeps_valid_symbols_when_one_fails(monkeypatch) -> None:
    def fake_ranking(symbol: str) -> dict:
        if symbol == "INVALID":
            raise HTTPException(status_code=404, detail="No market data found for symbol INVALID")
        return ranking_payload(symbol, 71)

    monkeypatch.setattr(ranking_api, "get_ranking_summary", fake_ranking)

    response = client.post("/api/ranking/compare", json={"symbols": ["RELIANCE.NS", "INVALID"]})

    assert response.status_code == 200
    data = response.json()
    assert data["rankings"][0]["symbol"] == "RELIANCE.NS"
    assert data["rankings"][0]["rank"] == 1
    assert data["rankings"][1]["symbol"] == "INVALID"
    assert data["rankings"][1]["error"] == "No market data found for symbol INVALID"


def test_compare_endpoint_validates_symbol_count() -> None:
    response = client.post("/api/ranking/compare", json={"symbols": ["RELIANCE.NS"]})

    assert response.status_code == 422


def test_weighted_score_stays_in_range() -> None:
    score = calculate_weighted_score(
        {
            "trend_score": 100,
            "momentum_score": 100,
            "rsi_score": 82,
            "macd_score": 100,
            "volatility_score": 76,
            "drawdown_score": 74,
            "risk_score": 62,
        }
    )

    assert 0 <= score <= 100


def test_ranking_engine_uses_existing_services(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.ranking_engine.get_market_summary",
        lambda symbol: {"symbol": symbol, "price_change_percentage": 1.4},
    )
    monkeypatch.setattr(
        "app.services.ranking_engine.get_indicator_summary",
        lambda symbol: {
            "symbol": symbol,
            "latest_close": 120.0,
            "sma_20": 115.0,
            "sma_50": 110.0,
            "ema_20": 116.0,
            "rsi_14": 58.0,
            "macd": 2.2,
            "macd_signal": 1.4,
            "macd_histogram": 0.8,
            "trend": "bullish",
        },
    )
    monkeypatch.setattr(
        "app.services.ranking_engine.get_risk_summary",
        lambda symbol: {
            "symbol": symbol,
            "daily_volatility_percent": 1.1,
            "max_drawdown_percent": -4.2,
            "distance_from_recent_high_percent": -2.0,
            "risk_level": "low",
        },
    )

    result = get_ranking_summary("RELIANCE.NS")

    assert result["symbol"] == "RELIANCE.NS"
    assert 0 <= result["score"] <= 100
    assert result["subscores"]["trend_score"] > 70
    assert result["disclaimer"] == DISCLAIMER
