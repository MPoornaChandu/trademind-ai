from __future__ import annotations

from pydantic import BaseModel, Field


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


class ErrorResponse(BaseModel):
    detail: str
