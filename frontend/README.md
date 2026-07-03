# TradeMind AI Frontend

For the main project overview, demo checklist, and one-command validation flow, see `../README.md`.

TradeMind AI Frontend is a Next.js dashboard for the TradeMind AI FastAPI backend. It shows market data, technical indicators, a trend explanation, educational AI analysis, a Risk Management Agent section, a local watchlist, and a comparison view for supported Yahoo Finance symbols.

This dashboard is for learning and portfolio demonstration only. It does not provide financial advice, broker integration, real-money trading, automated trading, authentication, or a database.

## Requirements

- Node.js
- npm
- TradeMind AI backend running at `http://127.0.0.1:8000`
- Backend `/api/analysis/{symbol}` endpoint for the AI analysis card
- Backend `/api/risk/{symbol}` endpoint for the risk management card

## Dashboard Features

- Symbol search with quick examples
- Local watchlist stored in browser `localStorage`
- Add/remove watchlist symbols
- Click a watchlist symbol to load the main dashboard
- Compare 2 to 4 watchlist symbols side by side
- Comparison metrics include trend, RSI, MACD histogram, volatility, drawdown, and risk level
- No database, Supabase, or authentication yet

## Environment Variable

Create a local environment file from the example if needed:

```powershell
Copy-Item .env.example .env.local
```

Required value:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Run Backend

From the repository root:

```powershell
cd trademind-ai/backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

## Run Frontend

In a second PowerShell terminal, from the repository root:

```powershell
cd trademind-ai/frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

If another local app is already using port `3000`, Next.js may choose the next free port such as:

```text
http://localhost:3001
```

## Build Check

```powershell
cd trademind-ai/frontend
npm run build
```

## Frontend Smoke Tests

The Playwright smoke tests use mocked API responses for the backend endpoints. They do not require the FastAPI backend, yfinance internet access, or Gemini.

Install dependencies:

```powershell
cd trademind-ai/frontend
npm install
```

If Playwright browsers are not installed yet:

```powershell
npx playwright install
```

Run the smoke tests:

```powershell
npm run test:e2e
```

Run headed for visual debugging:

```powershell
npm run test:e2e:headed
```

## Test Symbols

```text
RELIANCE.NS
TCS.NS
INFY.NS
HDFCBANK.NS
```

## Notes

- The backend uses `yfinance`, so it requires internet access.
- The watchlist is stored only in the current browser using `localStorage`.
- The AI analysis card uses the backend analysis endpoint. That endpoint works with Gemini when configured, or rule-based fallback when no key is available.
- The Risk Management Agent explains volatility, ATR, drawdown, and risk level for education only.
- The comparison view is educational and does not rank symbols or recommend actions.
- Indian stocks should use the `.NS` suffix.
- Invalid or missing Yahoo Finance symbols return an error state in the dashboard.
- All analysis text is educational and should not be treated as financial advice.
