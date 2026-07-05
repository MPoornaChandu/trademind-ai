import type {
  AIAnalysis,
  ComparisonData,
  DashboardData,
  IndicatorSummary,
  MarketSummary,
  RankingCompareResponse,
  RankingReport,
  RiskReport
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 20000;

type ApiErrorBody = {
  detail?: string;
};

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {})
      },
      cache: "no-store",
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out while contacting the backend.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Keep the status-based message if the backend does not return JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchDashboardData(symbol: string): Promise<DashboardData> {
  const cleanSymbol = encodeURIComponent(symbol.trim().toUpperCase());

  const [market, indicators] = await Promise.all([
    fetchJson<MarketSummary>(`/api/market/${cleanSymbol}`),
    fetchJson<IndicatorSummary>(`/api/indicators/${cleanSymbol}`)
  ]);

  const [analysisResult, riskResult, rankingResult] = await Promise.allSettled([
    fetchJson<AIAnalysis>(`/api/analysis/${cleanSymbol}`),
    fetchJson<RiskReport>(`/api/risk/${cleanSymbol}`),
    fetchJson<RankingReport>(`/api/ranking/${cleanSymbol}`)
  ]);

  return {
    market,
    indicators,
    analysis: analysisResult.status === "fulfilled" ? analysisResult.value : null,
    analysisError:
      analysisResult.status === "rejected" ? errorMessage(analysisResult.reason, "Analysis could not be loaded.") : null,
    risk: riskResult.status === "fulfilled" ? riskResult.value : null,
    riskError: riskResult.status === "rejected" ? errorMessage(riskResult.reason, "Risk analysis could not be loaded.") : null,
    ranking: rankingResult.status === "fulfilled" ? rankingResult.value : null,
    rankingError:
      rankingResult.status === "rejected" ? errorMessage(rankingResult.reason, "Setup ranking could not be loaded.") : null
  };
}

export async function fetchRankingComparison(symbols: string[]): Promise<RankingCompareResponse> {
  const cleanSymbols = symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean).slice(0, 8);

  return fetchJson<RankingCompareResponse>("/api/ranking/compare", {
    method: "POST",
    body: JSON.stringify({ symbols: cleanSymbols })
  });
}

export async function getComparisonData(symbol: string): Promise<ComparisonData> {
  const displaySymbol = symbol.trim().toUpperCase();
  const cleanSymbol = encodeURIComponent(displaySymbol);

  try {
    const [market, indicators, risk] = await Promise.all([
      fetchJson<MarketSummary>(`/api/market/${cleanSymbol}`),
      fetchJson<IndicatorSummary>(`/api/indicators/${cleanSymbol}`),
      fetchJson<RiskReport>(`/api/risk/${cleanSymbol}`)
    ]);

    return {
      symbol: displaySymbol,
      market,
      indicators,
      risk,
      error: null
    };
  } catch (caughtError) {
    return {
      symbol: displaySymbol,
      market: null,
      indicators: null,
      risk: null,
      error: errorMessage(caughtError, "Comparison data could not be loaded.")
    };
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
