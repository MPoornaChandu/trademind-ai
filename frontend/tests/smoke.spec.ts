import { expect, test } from "@playwright/test";

const SUPPORTED_SYMBOLS = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const [, apiPrefix, resource, rawSymbol] = url.pathname.split("/");
    const symbol = decodeURIComponent(rawSymbol ?? "").toUpperCase();

    if (apiPrefix === "api" && resource === "ranking" && rawSymbol === "compare") {
      const request = route.request().postDataJSON() as { symbols?: string[] };
      const rankings = (request.symbols ?? [])
        .filter((item) => SUPPORTED_SYMBOLS.includes(item))
        .map((item) => mockRanking(item))
        .sort((left, right) => right.score - left.score)
        .map((item, index) => ({
          rank: index + 1,
          symbol: item.symbol,
          score: item.score,
          setup_quality: item.setup_quality,
          risk_level: item.risk_level,
          confidence: item.confidence,
          reasons: item.reasons,
          warnings: item.warnings,
          error: null
        }));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rankings,
          best_setup: rankings[0]?.symbol ?? null,
          disclaimer: "Educational analysis only. Not financial advice. No broker execution or real-money trading is included."
        })
      });
      return;
    }

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
  await expect(
    page
      .locator("header")
      .getByText("Educational analysis only. Not financial advice. No broker execution or real-money trading is included.")
  ).toBeVisible();
  await expect(page.getByLabel("Stock symbol")).toHaveValue("RELIANCE.NS");

  const marketSummary = page.locator("section").filter({ hasText: "Market summary" });
  await expect(marketSummary.getByRole("heading", { name: "RELIANCE.NS" })).toBeVisible();

  const watchlist = page.locator("section").filter({ hasText: "Local watchlist" });
  await expect(watchlist.getByRole("button", { name: "RELIANCE.NS", exact: true })).toBeVisible();
  await expect(watchlist.getByRole("button", { name: "TCS.NS", exact: true })).toBeVisible();

  const comparison = page.locator("section").filter({ hasText: "Symbol comparison" });
  await expect(comparison.getByText("2/8 selected")).toBeVisible();
  await comparison.getByRole("button", { name: "HDFCBANK.NS" }).click();
  await expect(comparison.getByText("3/8 selected")).toBeVisible();
  await comparison.getByRole("button", { name: "HDFCBANK.NS" }).click();
  await expect(comparison.getByText("2/8 selected")).toBeVisible();
  await expect(comparison.getByText("Score").first()).toBeVisible();
  await expect(comparison.getByText("Setup quality").first()).toBeVisible();
  await expect(comparison.getByText("Confidence").first()).toBeVisible();
  await expect(comparison.getByText("Risk level").first()).toBeVisible();
  await expect(comparison.getByText("Strongest setup in this comparison")).toBeVisible();

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

  if (resource === "ranking") {
    return mockRanking(symbol);
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
    disclaimer: "Educational analysis only. Not financial advice. No broker execution or real-money trading is included.",
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
    disclaimer: "Educational analysis only. Not financial advice. No broker execution or real-money trading is included."
  };
}

function mockRanking(symbol: string) {
  const seed = symbolSeed(symbol);
  const score = 62 + seed * 5;

  return {
    symbol,
    score,
    setup_quality: score >= 75 ? "high-quality bullish setup" : "medium-quality bullish setup",
    confidence: "medium",
    risk_level: seed >= 3 ? "medium" : "low",
    subscores: {
      trend_score: score,
      momentum_score: score - 2,
      rsi_score: 82,
      macd_score: score,
      volatility_score: 76,
      drawdown_score: 74,
      risk_score: seed >= 3 ? 62 : 86
    },
    reasons: ["Trend is constructive based on moving averages."],
    warnings: ["Signals are mixed, so confidence is limited."],
    what_could_go_wrong: ["Momentum indicators can lag price action."],
    disclaimer: "Educational analysis only. Not financial advice. No broker execution or real-money trading is included."
  };
}
