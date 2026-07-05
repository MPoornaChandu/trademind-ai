const KNOWN_INDIAN_SYMBOLS = new Set([
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "LT",
  "ITC",
  "AXISBANK",
  "KOTAKBANK",
  "BHARTIARTL",
  "HINDUNILVR",
  "BAJFINANCE",
  "WIPRO",
  "HCLTECH",
  "MARUTI",
  "TITAN",
  "SUNPHARMA",
  "ASIANPAINT",
  "ULTRACEMCO"
]);

const NOISE_WORDS = new Set([
  "NSE",
  "BSE",
  "NASDAQ",
  "NYSE",
  "INDEX",
  "INDIA",
  "LIMITED",
  "STOCK",
  "PRICE",
  "CHART",
  "SHARE",
  "TRADINGVIEW",
  "MONEYCONTROL",
  "SCREENER",
  "GOOGLE",
  "FINANCE",
  "KITE",
  "ZERODHA"
]);

export function normalizeSymbol(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().toUpperCase().replace(/[()]/g, "").replace(/_/g, "-");
  if (!cleaned) {
    return null;
  }

  const tradingViewPath = cleaned.match(/\/SYMBOLS\/NSE-([A-Z0-9-]{2,20})(?:\/|$)/);
  if (tradingViewPath?.[1]) {
    return toNseSymbol(tradingViewPath[1]);
  }

  const nsePrefix = cleaned.match(/\bNSE[:\s-]+([A-Z0-9-]{2,20})(?:\.NS)?\b/);
  if (nsePrefix?.[1]) {
    return toNseSymbol(nsePrefix[1]);
  }

  const nseSuffix = cleaned.match(/\b([A-Z0-9-]{2,20})(?:\.NS)?[:\s-]+NSE\b/);
  if (nseSuffix?.[1]) {
    return toNseSymbol(nseSuffix[1]);
  }

  const yahooNse = cleaned.match(/\b([A-Z0-9-]{2,20})\.NS\b/);
  if (yahooNse?.[1]) {
    return toNseSymbol(yahooNse[1]);
  }

  const pathSymbol = cleaned.match(/(?:SYMBOL|QUOTE|EQUITIES|STOCK)[/=:-]+([A-Z0-9-]{2,20})/);
  if (pathSymbol?.[1]) {
    return toNseSymbol(pathSymbol[1]);
  }

  const simple = cleaned.match(/\b[A-Z][A-Z0-9-]{1,19}\b/);
  if (simple?.[0] && isLikelySymbol(simple[0])) {
    return toNseSymbol(simple[0]);
  }

  return null;
}

export function detectSymbolFromText(values: string[]): string | null {
  for (const value of values) {
    const symbol = normalizeSymbol(value);
    if (symbol) {
      return symbol;
    }
  }

  const joined = values.join(" ").toUpperCase();
  for (const knownSymbol of KNOWN_INDIAN_SYMBOLS) {
    if (new RegExp(`\\b${escapeRegExp(knownSymbol)}\\b`).test(joined)) {
      return toNseSymbol(knownSymbol);
    }
  }

  return null;
}

function toNseSymbol(symbol: string): string | null {
  const cleanSymbol = symbol.replace(/\.NS$/, "").replace(/[^A-Z0-9-]/g, "");
  if (!cleanSymbol || NOISE_WORDS.has(cleanSymbol)) {
    return null;
  }
  return `${cleanSymbol}.NS`;
}

function isLikelySymbol(symbol: string): boolean {
  if (NOISE_WORDS.has(symbol)) {
    return false;
  }

  return KNOWN_INDIAN_SYMBOLS.has(symbol);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
