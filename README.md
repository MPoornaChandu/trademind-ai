# TradeMind AI

TradeMind AI is an educational AI-ready market analysis dashboard. It combines a FastAPI backend for market data, technical indicators, AI-style analysis, and risk management with a Next.js frontend dashboard that includes symbol search, a local watchlist, comparison view, and automated smoke tests.

Educational analysis only. Not financial advice. No broker execution or real-money trading is included.

## Current Features

- FastAPI backend
- Market data API using Yahoo Finance through `yfinance`
- Technical indicators: SMA, EMA, RSI, MACD, and trend labels
- AI Analysis Agent with optional Gemini support and rule-based fallback
- Risk Management Agent with volatility, ATR, drawdown, and risk level
- Next.js frontend dashboard
- Local watchlist stored in browser `localStorage`
- Comparison view for 2 to 4 watchlist symbols
- Backend smoke tests
- Frontend Playwright smoke tests with mocked API responses

## Run Backend

From the repository root:

```powershell
cd trademind-ai/backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

## Run Frontend

In a second terminal:

```powershell
cd trademind-ai/frontend
npm run dev
```

The frontend usually runs at:

```text
http://localhost:3000
```

## Validate Everything

From the repository root:

```powershell
cd trademind-ai
.\validate.ps1
```

If PowerShell blocks the script during local development, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\validate.ps1
```

You can also run the Windows batch wrapper:

```cmd
validate.bat
```

The validation script runs:

- Backend smoke tests
- Backend compile check
- Frontend production build
- Frontend Playwright smoke tests

Note: backend smoke tests use the FastAPI TestClient but still fetch live market data through `yfinance`, so they require internet access and Yahoo Finance availability. Frontend Playwright tests use mocked API responses and do not require the backend, yfinance, or Gemini.

## Useful URLs

```text
Backend: http://127.0.0.1:8000
Frontend: http://localhost:3000
API docs: http://127.0.0.1:8000/docs
```

## Test Symbols

```text
RELIANCE.NS
TCS.NS
INFY.NS
HDFCBANK.NS
```

## Environment Variables

Backend:

```text
GEMINI_API_KEY=
```

Frontend:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Gemini is optional. If `GEMINI_API_KEY` is not configured, the AI Analysis Agent uses a rule-based educational fallback.

## Demo Flow

1. Start backend.
2. Start frontend.
3. Search `RELIANCE.NS`.
4. Show market summary and indicators.
5. Show AI Analysis Agent.
6. Show Risk Management Agent.
7. Add symbols to watchlist.
8. Compare `RELIANCE.NS` and `TCS.NS`.
9. Run validation script.

## Future Roadmap

- Paper trading simulator
- Backtesting
- Chart visualization
- Supabase watchlist sync
- Alerts
- Broker API later only after safety controls
