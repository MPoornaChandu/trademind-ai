import { expect, test } from "@playwright/test";

const SUPPORTED_SYMBOLS = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const [, apiPrefix, resource, rawSymbol] = url.pathname.split("/");
    const symbol = decodeURIComponent(rawSymbol ?? "").toUpperCase();

    if (apiPrefix !== "api" || !SUPPORTED_SYMBOLS.includes(symbol)) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: `No market data found for symbol ${symbol}` })
      });
      return;
    }

    const body = mockApiResponse(resource, symbol);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  });
});

test("loads dashboard, manages watchlist, and compares symbols", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "TradeMind AI" })).toBeVisible();
  await expect(page.locator("header").getByText("Educational analysis only. Not financial advice.")).toBeVisible();
  await expect(page.getByLabel("Stock symbol")).toHaveValue("RELIANCE.NS");

  const marketSummary = page.locator("section").filter({ hasText: "Market summary" });
  await expect(marketSummary.getByRole("heading", { name: "RELIANCE.NS" })).toBeVisible();

  const watchlist = page.locator("section").filter({ hasText: "Local watchlist" });
  await expect(watchlist.getByRole("button", { name: "RELIANCE.NS", exact: true })).toBeVisible();
  await expect(watchlist.getByRole("button", { name: "TCS.NS", exact: true })).toBeVisible();

  const comparison = page.locator("section").filter({ hasText: "Symbol comparison" });
  await expect(comparison.getByText("2/4 selected")).toBeVisible();
  await comparison.getByRole("button", { name: "HDFCBANK.NS" }).click();
  await expect(comparison.getByText("3/4 selected")).toBeVisible();
  await comparison.getByRole("button", { name: "HDFCBANK.NS" }).click();
  await expect(comparison.getByText("2/4 selected")).toBeVisible();
  await expect(comparison.getByText("Trend").first()).toBeVisible();
  await expect(comparison.getByText("Risk Level").first()).toBeVisible();
  await expect(comparison.getByText("Daily volatility").first()).toBeVisible();
  await expect(comparison.getByText("Max drawdown").first()).toBeVisible();

  await watchlist.getByRole("button", { name: "Remove TCS.NS" }).click();
  await expect(watchlist.getByRole("button", { name: "TCS.NS", exact: true })).toHaveCount(0);

  await page.getByLabel("Stock symbol").fill("TCS.NS");
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(marketSummary.getByRole("heading", { name: "TCS.NS" })).toBeVisible();

  await watchlist.getByRole("button", { name: "Add current" }).click();
  await expect(watchlist.getByRole("button", { name: "TCS.NS", exact: true })).toHaveCount(1);
  await expect(watchlist.getByRole("button", { name: "Already saved" })).toBeDisabled();
  await expect(watchlist.getByRole("button", { name: "TCS.NS", exact: true })).toHaveCount(1);

  await watchlist.getByRole("button", { name: "Remove TCS.NS" }).click();
  await expect(watchlist.getByRole("button", { name: "TCS.NS", exact: true })).toHaveCount(0);
});

function mockApiResponse(resource: string, symbol: string) {
  if (resource === "market") {
    return mockMarket(symbol);
  }

  if (resource === "indicators") {
    return mockIndicators(symbol);
  }

  if (resource === "analysis") {
    return mockAnalysis(symbol);
  }

  if (resource === "risk") {
    return mockRisk(symbol);
  }

  return { detail: "Unknown test route" };
}

function symbolSeed(symbol: string): number {
  return SUPPORTED_SYMBOLS.indexOf(symbol) + 1;
}

function mockMarket(symbol: string) {
  const seed = symbolSeed(symbol);
  const latestClose = 1000 + seed * 125;
  const previousClose = latestClose - seed * 8;

  return {
    symbol,
    latest_close: latestClose,
    previous_close: previousClose,
    price_change: latestClose - previousClose,
    price_change_percentage: Number((((latestClose - previousClose) / previousClose) * 100).toFixed(2)),
    currency: "INR",
    candles_loaded: 126,
    last_updated: "2026-07-01"
  };
}

function mockIndicators(symbol: string) {
  const seed = symbolSeed(symbol);

  return {
    symbol,
    latest_close: 1000 + seed * 125,
    sma_20: 990 + seed * 120,
    sma_50: 970 + seed * 115,
    ema_20: 995 + seed * 118,
    rsi_14: 52 + seed,
    macd: 8.5 + seed,
    macd_signal: 7.1 + seed,
    macd_histogram: 1.4,
    trend: seed % 2 === 0 ? "neutral" : "bullish",
    explanation: "Mocked educational trend explanation for smoke testing."
  };
}

function mockAnalysis(symbol: string) {
  return {
    symbol,
    summary: `${symbol} has mocked educational analysis for smoke testing.`,
    trend_interpretation: "The mocked indicators are only used to verify the UI flow.",
    indicator_explanation: ["RSI, moving averages, and MACD are shown for learning."],
    risk_notes: ["This mocked response is not financial advice."],
    learning_points: ["Use multiple indicators when studying market behavior."],
    disclaimer: "Educational analysis only. Not financial advice.",
    source: "rule_based"
  };
}

function mockRisk(symbol: string) {
  const seed = symbolSeed(symbol);

  return {
    symbol,
    daily_volatility_percent: 1.1 + seed / 10,
    annualized_volatility_percent: 18 + seed,
    atr_14: 22 + seed,
    recent_high: 1200 + seed * 120,
    recent_low: 900 + seed * 100,
    distance_from_recent_high_percent: -4.2,
    distance_from_recent_low_percent: 12.5,
    max_drawdown_percent: -8.4 - seed,
    risk_level: seed >= 3 ? "medium" : "low",
    risk_explanation: "Mocked risk explanation for smoke testing.",
    risk_notes: ["Volatility and drawdown are educational risk metrics."],
    learning_points: ["Risk metrics describe past movement, not future certainty."],
    disclaimer: "Educational risk analysis only. Not financial advice."
  };
}
