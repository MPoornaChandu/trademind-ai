export type MarketSummary = {
  symbol: string;
  latest_close: number;
  previous_close: number;
  price_change: number;
  price_change_percentage: number;
  currency: string | null;
  candles_loaded: number;
  last_updated: string;
};

export type IndicatorSummary = {
  symbol: string;
  latest_close: number;
  sma_20: number | null;
  sma_50: number | null;
  ema_20: number | null;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  trend: "bullish" | "bearish" | "neutral";
  explanation: string;
};

export type AnalysisSource = "gemini" | "rule_based" | "fallback_after_ai_error" | "ollama" | "cloud";

export type AIAnalysis = {
  symbol: string;
  summary: string;
  trend_interpretation: string;
  indicator_explanation: string[];
  risk_notes: string[];
  learning_points: string[];
  disclaimer: string;
  source: AnalysisSource;
  provider_used?: string | null;
  outlook?: "bullish_bias" | "bearish_bias" | "neutral" | "mixed" | null;
  confidence?: "low" | "medium" | "high" | null;
};

export type RiskLevel = "low" | "medium" | "high";
export type RankingConfidence = "low" | "medium" | "high";

export type RiskReport = {
  symbol: string;
  daily_volatility_percent: number;
  annualized_volatility_percent: number;
  atr_14: number;
  recent_high: number;
  recent_low: number;
  distance_from_recent_high_percent: number;
  distance_from_recent_low_percent: number;
  max_drawdown_percent: number;
  risk_level: RiskLevel;
  risk_explanation: string;
  risk_notes: string[];
  learning_points: string[];
  disclaimer: string;
};

export type RankingSubscores = {
  trend_score: number;
  momentum_score: number;
  rsi_score: number;
  macd_score: number;
  volatility_score: number;
  drawdown_score: number;
  risk_score: number;
};

export type RankingReport = {
  symbol: string;
  score: number;
  setup_quality: string;
  confidence: RankingConfidence;
  risk_level: RiskLevel;
  subscores: RankingSubscores;
  reasons: string[];
  warnings: string[];
  what_could_go_wrong: string[];
  disclaimer: string;
};

export type RankingCompareItem = {
  rank: number | null;
  symbol: string;
  score: number | null;
  setup_quality: string | null;
  risk_level: RiskLevel | null;
  confidence: RankingConfidence | null;
  reasons: string[];
  warnings: string[];
  error: string | null;
};

export type RankingCompareResponse = {
  rankings: RankingCompareItem[];
  best_setup: string | null;
  disclaimer: string;
};

export type DashboardData = {
  market: MarketSummary;
  indicators: IndicatorSummary;
  analysis: AIAnalysis | null;
  analysisError: string | null;
  risk: RiskReport | null;
  riskError: string | null;
  ranking: RankingReport | null;
  rankingError: string | null;
};

export type ComparisonData = {
  symbol: string;
  market: MarketSummary | null;
  indicators: IndicatorSummary | null;
  risk: RiskReport | null;
  error: string | null;
};
