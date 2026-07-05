export const DEFAULT_API_BASE_URL = "https://trademind-ai-backend-uw1j.onrender.com";
export const DASHBOARD_URL = "https://trademind-ai-delta.vercel.app/";
export const DISCLAIMER = "Educational analysis only. Not financial advice. No broker execution or real-money trading is included.";
export const DEFAULT_WATCHLIST = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"];
export const MAX_WATCHLIST_ITEMS = 8;
export const API_BASE_URL_STORAGE_KEY = "trademind_api_base_url";
export const WATCHLIST_STORAGE_KEY = "trademind_watchlist";

export type DetectionResult = {
  symbol: string | null;
  source: string;
  pageTitle?: string;
  pageUrl?: string;
};

export type RuntimeRequest =
  | { type: "TRADEMIND_DETECT_SYMBOL" }
  | { type: "TRADEMIND_OPEN_DASHBOARD" };

export type RuntimeResponse = {
  ok: boolean;
  detection?: DetectionResult;
  error?: string;
};
