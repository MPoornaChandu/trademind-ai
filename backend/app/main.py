from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents.analysis_agent import get_analysis_summary
from app.agents.risk_agent import get_risk_summary
from app.models import AnalysisResponse, AppInfoResponse, HealthResponse, IndicatorsResponse, MarketResponse, RiskResponse
from app.services.market_data import get_indicator_summary, get_market_summary


APP_NAME = "TradeMind AI Backend"
APP_VERSION = "0.1.0"
APP_DESCRIPTION = "FastAPI foundation for market data and technical indicator analysis."

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/", response_model=AppInfoResponse)
def read_root() -> AppInfoResponse:
    return AppInfoResponse(
        name=APP_NAME,
        version=APP_VERSION,
        description=APP_DESCRIPTION,
    )


@app.get("/health", response_model=HealthResponse)
def read_health() -> HealthResponse:
    return HealthResponse(status="ok", service=APP_NAME, version=APP_VERSION)


@app.get("/api/market/{symbol}", response_model=MarketResponse)
def read_market_data(symbol: str) -> MarketResponse:
    return MarketResponse(**get_market_summary(symbol))


@app.get("/api/indicators/{symbol}", response_model=IndicatorsResponse)
def read_indicators(symbol: str) -> IndicatorsResponse:
    return IndicatorsResponse(**get_indicator_summary(symbol))


@app.get("/api/analysis/{symbol}", response_model=AnalysisResponse)
def read_analysis(symbol: str) -> AnalysisResponse:
    return AnalysisResponse(**get_analysis_summary(symbol))


@app.get("/api/risk/{symbol}", response_model=RiskResponse)
def read_risk(symbol: str) -> RiskResponse:
    return RiskResponse(**get_risk_summary(symbol))
