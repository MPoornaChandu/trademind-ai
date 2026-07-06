# TradeMind AI Chrome Extension MVP

TradeMind AI is a read-only educational stock analysis extension. It opens as a Chrome popup or side panel, detects visible stock context when possible, supports manual symbol input, calls the live TradeMind AI backend, and shows setup score, setup quality, indicators, risk warnings, AI explanation, and relative watchlist ranking.

## What The Extension Does

- Detects public stock-symbol context when available.
- Lets you manually analyze symbols such as `RELIANCE.NS`.
- Shows setup score and setup quality from the deterministic backend ranking engine.
- Ranks the local watchlist with filters for stronger setups, lower risk, higher confidence, and setups that need caution.
- Highlights where the current analyzed stock ranks against the watchlist.
- Shows compact reasons, risk warnings, and what-could-go-wrong notes for enriched top-ranked setups.

## Safety Boundary

Educational analysis only. Not financial advice. No broker execution or real-money trading is included.

The extension does not place trades, submit orders, read broker cookies, read login data, read account balances, read holdings, read order books, read P&L, scrape portfolios, or interact with trading controls. Symbol detection uses only the page URL, page title, metadata title, and obvious visible headings.

## Build And Validate

```powershell
cd C:\Users\poorn\OneDrive\Desktop\AI-Agent-Stack\trademind-ai\extension
npm install
npm run validate
```

The loadable extension is generated in:

```text
extension/dist
```

## Package For Manual Sharing

```powershell
cd C:\Users\poorn\OneDrive\Desktop\AI-Agent-Stack\trademind-ai\extension
npm run package
```

The package is created at:

```text
extension/trademind-ai-extension.zip
```

The zip contains only the built `dist` files.

## Load Unpacked In Chrome

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click `Load unpacked`.
5. Select `C:\Users\poorn\OneDrive\Desktop\AI-Agent-Stack\trademind-ai\extension\dist`.
6. Open a supported site.
7. Click the TradeMind AI extension icon.
8. Use the detected symbol or enter a symbol manually.
9. Click `Analyze`.

## Supported Detection Sources

- TradingView
- Google Finance
- Screener
- Moneycontrol
- NSE India
- Zerodha Kite

Detection is best-effort. If a symbol is not detected, enter it manually.

## Detection Test Pages

- TradingView: `https://www.tradingview.com/symbols/NSE-RELIANCE/`
- Google Finance: `https://www.google.com/finance/quote/RELIANCE:NSE`
- Screener: `https://www.screener.in/company/RELIANCE/`
- Moneycontrol: open a stock quote page and use detected symbol if available
- NSE India: open an equity quote page and use detected symbol if available
- Zerodha Kite: use only visible stock context; manual input is the fallback

## Manual Symbol Fallback Examples

- `RELIANCE.NS`
- `TCS.NS`
- `INFY.NS`
- `HDFCBANK.NS`

Normalization examples:

- `RELIANCE` becomes `RELIANCE.NS`
- `NSE:RELIANCE` becomes `RELIANCE.NS`
- `RELIANCE:NSE` becomes `RELIANCE.NS`

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

## Troubleshooting

- The first backend request can be slow because Render may cold start.
- If symbol detection fails, use manual input such as `RELIANCE.NS`.
- If one data section fails, click `Retry analysis`.
- After rebuilding, reload the extension in `chrome://extensions`.
- If Chrome still shows old behavior, remove the extension and load `extension/dist` again.

## Manual Smoke Test Checklist

- Open the extension on the TradingView homepage.
- Open `https://www.tradingview.com/symbols/NSE-RELIANCE/`.
- Open `https://www.google.com/finance/quote/RELIANCE:NSE`.
- Open `https://www.screener.in/company/RELIANCE/`.
- Try manual input: `RELIANCE.NS`.
- Click `Analyze`.
- Click `Rank current watchlist`.
- Try the ranking filters.
- Expand one ranked setup.
- Click `Open full dashboard`.
- Confirm the disclaimer remains visible.
