from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.ai.schemas import AnalysisResult


class AppInfoResponse(BaseModel):
    name: str
    version: str
    description: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class MarketResponse(BaseModel):
    symbol: str
    latest_close: float
    previous_close: float
    price_change: float
    price_change_percentage: float
    currency: str | None = None
    candles_loaded: int = Field(ge=0)
    last_updated: str


class IndicatorsResponse(BaseModel):
    symbol: str
    latest_close: float
    sma_20: float | None = None
    sma_50: float | None = None
    ema_20: float | None = None
    rsi_14: float | None = None
    macd: float | None = None
    macd_signal: float | None = None
    macd_histogram: float | None = None
    trend: str
    explanation: str


class AnalysisResponse(BaseModel):
    symbol: str
    summary: str
    trend_interpretation: str
    indicator_explanation: list[str]
    risk_notes: list[str]
    learning_points: list[str]
    disclaimer: str
    source: str
    provider_used: str | None = None
    outlook: str | None = None
    key_drivers: list[str] | None = None
    uncertainty_notes: list[str] | None = None
    risk_warnings: list[str] | None = None
    what_could_go_wrong: list[str] | None = None
    confidence: str | None = None
    ai_disclaimer: str | None = None
    ai_result: AnalysisResult | None = None


class RiskResponse(BaseModel):
    symbol: str
    daily_volatility_percent: float
    annualized_volatility_percent: float
    atr_14: float
    recent_high: float
    recent_low: float
    distance_from_recent_high_percent: float
    distance_from_recent_low_percent: float
    max_drawdown_percent: float
    risk_level: str
    risk_explanation: str
    risk_notes: list[str]
    learning_points: list[str]
    disclaimer: str


class RankingSubscores(BaseModel):
    trend_score: int = Field(ge=0, le=100)
    momentum_score: int = Field(ge=0, le=100)
    rsi_score: int = Field(ge=0, le=100)
    macd_score: int = Field(ge=0, le=100)
    volatility_score: int = Field(ge=0, le=100)
    drawdown_score: int = Field(ge=0, le=100)
    risk_score: int = Field(ge=0, le=100)


class RankingResponse(BaseModel):
    symbol: str
    score: int = Field(ge=0, le=100)
    setup_quality: str
    confidence: str
    risk_level: str
    subscores: RankingSubscores
    reasons: list[str]
    warnings: list[str]
    what_could_go_wrong: list[str]
    disclaimer: str


class RankingCompareRequest(BaseModel):
    symbols: list[str] = Field(min_length=2, max_length=8)

    @field_validator("symbols")
    @classmethod
    def normalize_symbols(cls, symbols: list[str]) -> list[str]:
        clean_symbols: list[str] = []
        for symbol in symbols:
            clean_symbol = str(symbol).strip().upper()
            if clean_symbol and clean_symbol not in clean_symbols:
                clean_symbols.append(clean_symbol)

        if len(clean_symbols) < 2:
            raise ValueError("Provide at least 2 unique symbols")

        return clean_symbols


class RankingCompareItem(BaseModel):
    rank: int | None = None
    symbol: str
    score: int | None = Field(default=None, ge=0, le=100)
    setup_quality: str | None = None
    risk_level: str | None = None
    confidence: str | None = None
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    error: str | None = None


class RankingCompareResponse(BaseModel):
    rankings: list[RankingCompareItem]
    best_setup: str | None = None
    disclaimer: str


class ErrorResponse(BaseModel):
    detail: str
