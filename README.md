# TradeMind AI

TradeMind AI is an educational AI-ready market analysis dashboard for Indian stock symbols. It combines a FastAPI backend for market data, technical indicators, educational AI-style analysis, and risk summaries with a Next.js dashboard for search, watchlists, comparison, and smoke-tested user flows.

Educational analysis only. Not financial advice. No broker execution or real-money trading is included.

## Features

- FastAPI backend with health, market, indicator, analysis, and risk endpoints
- Market data from Yahoo Finance through `yfinance`
- Test symbols such as `RELIANCE.NS`, `TCS.NS`, `INFY.NS`, and `HDFCBANK.NS`
- Technical indicators: SMA, EMA, RSI, MACD, MACD signal, MACD histogram, and trend label
- Educational AI Analysis Agent with rule-based default plus optional Gemini and Ollama providers
- Educational Risk Management Agent with volatility, ATR, drawdown, and risk-level context
- Next.js dashboard with symbol search, quick examples, and error/loading states
- Browser `localStorage` watchlist
- Comparison view for 2 to 4 watchlist symbols
- Backend smoke tests and compile check
- Frontend production build and Playwright smoke test

## Tech Stack

- Backend: Python, FastAPI, Uvicorn, Pydantic, yfinance, pandas, NumPy
- AI-ready analysis: deterministic rule-based default, optional Gemini via `google-genai`, optional local Ollama, and a future cloud stub
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Testing: backend smoke tests, Python compile check, Playwright smoke tests
- Deployment targets: Render for backend, Vercel for frontend

## Architecture

```text
Next.js dashboard
  -> NEXT_PUBLIC_API_BASE_URL
  -> FastAPI backend
  -> yfinance market data
  -> indicators, educational analysis, risk summary
  -> JSON responses for dashboard cards, watchlist, and comparison
```

## Local Setup

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Useful local URLs:

```text
Backend: http://127.0.0.1:8000
Frontend: http://localhost:3000
API docs: http://127.0.0.1:8000/docs
Health check: http://127.0.0.1:8000/health
```

## Environment Variables

Backend example: `backend/.env.example`

```env
FRONTEND_URL=
AI_PROVIDER=rule_based
GEMINI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_FAST_MODEL=gemma3:4b
```

Frontend example: `frontend/.env.example`

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Notes:

- `FRONTEND_URL` should be set to the deployed Vercel frontend URL when the backend is deployed.
- `AI_PROVIDER` can be `rule_based`, `gemini`, `ollama`, or `cloud`.
- `GEMINI_API_KEY` is optional. If it is missing or Gemini is unavailable, the backend uses rule-based educational analysis.
- Ollama is optional. If it is missing or offline, the backend falls back safely.
- `NEXT_PUBLIC_API_BASE_URL` should point to the Render backend URL in production.
- Real `.env` files are ignored and should not be committed.

## Multi-Brain AI Providers

The analysis endpoint supports a provider router for educational AI analysis:

```text
GET /api/analysis/RELIANCE.NS
GET /api/analysis/RELIANCE.NS?provider=rule_based
GET /api/analysis/RELIANCE.NS?provider=gemini
GET /api/analysis/RELIANCE.NS?provider=ollama&depth=quick
GET /api/providers/health
```

Provider behavior:

- `rule_based` is the default and always available.
- `gemini` is optional and only runs when `GEMINI_API_KEY` is configured.
- `ollama` is optional and calls a local Ollama server when available.
- `cloud` is registered as a future stub and is not implemented yet.
- If a requested provider fails or returns unsafe wording, the router falls back to Ollama fast when available and then to rule-based analysis.
- The app works without Gemini and without Ollama because rule-based fallback is always available.

Local Ollama setup, optional:

```powershell
ollama pull qwen3:8b
ollama pull gemma3:4b
ollama pull deepseek-r1:8b
```

Example backend `.env` for Ollama:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_FAST_MODEL=gemma3:4b
```

All providers must return structured educational analysis, include uncertainty, and avoid direct financial advice, broker execution, real-money trading, or guaranteed predictions.

## Validation

From the project root:

```powershell
.\validate.ps1
```

If PowerShell blocks the script during local development:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\validate.ps1
```

The validation script runs:

- Backend smoke tests
- Backend compile check
- Frontend production build
- Frontend Playwright smoke tests

Backend smoke tests use live market data through `yfinance`, so they require internet access and Yahoo Finance availability. Frontend Playwright tests use mocked API responses.

## Deployment

Deployment instructions are in [DEPLOYMENT.md](DEPLOYMENT.md).

Summary:

- Backend target: Render web service
- Backend root directory: `backend`
- Backend start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Frontend target: Vercel project
- Frontend root directory: `frontend`
- Frontend build command: `npm run build`

## Test Symbols

```text
RELIANCE.NS
TCS.NS
INFY.NS
HDFCBANK.NS
```

## Current Status

This project is portfolio-ready as an educational analysis assistant prototype. It includes backend APIs, a working dashboard, watchlist and comparison workflows, optional AI analysis, risk context, deployment configuration guidance, and automated validation.

It does not include real-money trading, broker integration, order placement, automated buy/sell actions, or guaranteed predictions.
