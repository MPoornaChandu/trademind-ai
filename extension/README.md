# TradeMind AI Chrome Extension MVP

This is the read-only browser extension surface for TradeMind AI. It opens a Chrome side panel, detects visible stock context when possible, allows manual symbol input, calls the live TradeMind AI backend, and shows educational setup ranking, indicators, risk notes, AI explanation, and watchlist ranking.

## Safety Boundary

TradeMind AI is educational decision-support only.

Educational analysis only. Not financial advice. No broker execution or real-money trading is included.

The extension does not place trades, read broker cookies, read account balances, read holdings, read order books, read P&L, or scrape portfolio data. Symbol detection uses only the page URL, page title, metadata title, and obvious visible headings.

## Build

```powershell
cd C:\Users\poorn\OneDrive\Desktop\AI-Agent-Stack\trademind-ai\extension
npm install
npm run validate
```

The loadable extension is generated in:

```text
extension/dist
```

## Load In Chrome

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click `Load unpacked`.
5. Select `C:\Users\poorn\OneDrive\Desktop\AI-Agent-Stack\trademind-ai\extension\dist`.
6. Open a supported site such as TradingView, Moneycontrol, Zerodha Kite, Google Finance, NSE, or Screener.
7. Open the TradeMind AI extension side panel.
8. Use the detected symbol or enter a symbol such as `RELIANCE.NS`.
9. Click `Analyze`.

## Supported Detection Sources

- Zerodha Kite
- TradingView
- Moneycontrol
- Google Finance
- NSE India
- Screener

Detection is best-effort. If a symbol is not detected, enter it manually. Indian stock symbols are normalized to the Yahoo Finance style used by the backend, such as `RELIANCE.NS`, `TCS.NS`, `INFY.NS`, and `HDFCBANK.NS`.

## Backend Defaults

The default API base URL is:

```text
https://trademind-ai-backend-uw1j.onrender.com
```

The extension can use `chrome.storage.local` for a future API URL setting, but the default works immediately.

The full dashboard button opens:

```text
https://trademind-ai-delta.vercel.app/
```
