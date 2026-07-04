# TradeMind AI Backend

For the main project overview, demo checklist, and one-command validation flow, see `../README.md`.

TradeMind AI Backend is the first backend milestone for an intelligent AI trading assistant. This version focuses on a safe foundation:

```text
market data -> technical indicators -> educational analysis -> risk analysis -> clean API output
```

It does not include broker APIs, real-money trading, buy/sell advice, alerts, or automated trading.

## Features

- FastAPI backend
- Stock market data from `yfinance`
- Supports Indian NSE symbols such as `RELIANCE.NS`, `TCS.NS`, `INFY.NS`, and `HDFCBANK.NS`
- Basic market summary endpoint
- Technical indicators:
  - SMA 20
  - SMA 50
  - EMA 20
  - RSI 14
  - MACD
  - MACD signal
  - MACD histogram
- Simple trend label: `bullish`, `bearish`, or `neutral`
- Educational analysis endpoint with a multi-provider AI router
- Rule-based default and fallback when optional providers are not configured or unavailable
- Educational risk management endpoint with volatility, ATR, drawdown, and risk-level metrics

## Endpoints

```text
GET /
GET /health
GET /api/market/{symbol}
GET /api/indicators/{symbol}
GET /api/analysis/{symbol}
GET /api/analysis/{symbol}?provider=rule_based
GET /api/analysis/{symbol}?provider=gemini
GET /api/analysis/{symbol}?provider=ollama&depth=quick
GET /api/providers/health
GET /api/risk/{symbol}
```

## Risk Metrics

The risk endpoint explains recent risk conditions in beginner-friendly terms:

- Daily volatility estimates how much the stock has moved day to day.
- Annualized volatility scales daily volatility to a yearly estimate.
- ATR 14 estimates average recent price range, not future direction.
- Recent high and low show the loaded period's price range.
- Distance from recent high/low shows where the latest close sits inside that range.
- Max drawdown shows the largest decline from a recent peak in the loaded data.
- Risk level is `low`, `medium`, or `high` based on simple volatility and drawdown rules.

## Setup On Windows PowerShell

From the repository root:

```powershell
cd trademind-ai/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## AI Provider Setup

The backend defaults to deterministic rule-based educational analysis.

Supported `AI_PROVIDER` values:

- `rule_based`: default, always available.
- `gemini`: optional, used only when `GEMINI_API_KEY` is configured.
- `ollama`: optional, uses a local Ollama server when available.
- `cloud`: future stub, currently falls back safely.

If Gemini, Ollama, or the cloud stub fails or returns unsafe wording, the router falls back safely. The response remains educational decision-support only.

To enable Gemini, create a local environment variable:

```powershell
$env:GEMINI_API_KEY = "your_api_key_here"
```

Optional local Ollama setup:

```powershell
ollama pull qwen3:8b
ollama pull gemma3:4b
ollama pull deepseek-r1:8b
```

Example local AI variables:

```powershell
$env:AI_PROVIDER = "ollama"
$env:OLLAMA_BASE_URL = "http://localhost:11434"
$env:OLLAMA_MODEL = "qwen3:8b"
$env:OLLAMA_FAST_MODEL = "gemma3:4b"
```

You can also copy the example env file:

```powershell
Copy-Item .env.example .env
```

`depth=quick` uses the configured fast Ollama model when Ollama is selected.

## Run The Backend

```powershell
uvicorn app.main:app --reload
```

The backend should start at:

```text
http://127.0.0.1:8000
```

## Production Start Command

For Render or another production host that injects a `PORT` environment variable, use:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Smoke Test

In a second PowerShell terminal, with the backend environment activated:

```powershell
cd trademind-ai/backend
.\.venv\Scripts\Activate.ps1
python smoke_test.py
```

The smoke test checks:

- Health response
- Market data for `RELIANCE.NS`
- Indicators for `RELIANCE.NS`
- Analysis for `RELIANCE.NS`
- Risk analysis for `RELIANCE.NS` and `TCS.NS`
- Controlled error handling for invalid market, indicator, analysis, and risk symbols
- JSON safety, including no `NaN` or `Infinity` values

The analysis smoke check forces the rule-based fallback path, so it does not require a Gemini key.

## Example URLs

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/health
http://127.0.0.1:8000/api/market/RELIANCE.NS
http://127.0.0.1:8000/api/indicators/RELIANCE.NS
http://127.0.0.1:8000/api/analysis/RELIANCE.NS
http://127.0.0.1:8000/api/risk/RELIANCE.NS
http://127.0.0.1:8000/api/market/TCS.NS
http://127.0.0.1:8000/api/indicators/TCS.NS
http://127.0.0.1:8000/api/analysis/TCS.NS
http://127.0.0.1:8000/api/risk/TCS.NS
```

## Common Issues

- `yfinance` requires an internet connection.
- Invalid, delisted, or missing Yahoo Finance symbols may return a controlled error.
- Indian NSE stocks should use the `.NS` suffix, for example `RELIANCE.NS`, `TCS.NS`, `INFY.NS`, or `HDFCBANK.NS`.
- Yahoo Finance data can be delayed or temporarily unavailable.
- Gemini and Ollama are optional. The analysis endpoint remains available through rule-based fallback without external AI services.

Educational analysis only. Not financial advice. No broker execution or real-money trading is included.
