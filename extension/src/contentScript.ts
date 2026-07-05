type ContentDetectionResult = {
  symbol: string | null;
  source: string;
  pageTitle?: string;
  pageUrl?: string;
};

type ContentRuntimeRequest = {
  type: string;
};

type ContentRuntimeResponse = {
  ok: boolean;
  detection?: ContentDetectionResult;
  error?: string;
};

const contentKnownIndianSymbols = new Set([
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

const contentNoiseWords = new Set([
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

chrome.runtime.onMessage.addListener((request: ContentRuntimeRequest, _sender, sendResponse: (response: ContentRuntimeResponse) => void) => {
  if (request.type !== "TRADEMIND_DETECT_SYMBOL") {
    return false;
  }

  sendResponse({
    ok: true,
    detection: detectSymbol()
  });
  return false;
});

function detectSymbol(): ContentDetectionResult {
  const pageUrl = window.location.href;
  const pageTitle = document.title;
  const candidates = [
    pageUrl,
    pageTitle,
    getMetaContent("og:title"),
    getMetaContent("twitter:title"),
    ...visibleHeadingTexts()
  ].filter(Boolean);

  const symbol = contentDetectSymbolFromText(candidates);
  return {
    symbol,
    source: symbol ? "visible page context" : "manual input required",
    pageTitle,
    pageUrl
  };
}

function contentNormalizeSymbol(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const decoded = contentSafeDecode(value);
  const cleaned = decoded.trim().toUpperCase().replace(/[()]/g, "").replace(/_/g, "-");
  if (!cleaned) {
    return null;
  }

  const tradingViewPath = cleaned.match(/\/SYMBOLS\/NSE-([A-Z0-9-]{2,20})(?:\/|$)/);
  if (tradingViewPath?.[1]) {
    return contentToNseSymbol(tradingViewPath[1]);
  }

  const googleFinancePath = cleaned.match(/\/FINANCE\/QUOTE\/([A-Z0-9-]{2,20})[:%-]+NSE(?:[/?#]|$)/);
  if (googleFinancePath?.[1]) {
    return contentToNseSymbol(googleFinancePath[1]);
  }

  const screenerPath = cleaned.match(/\/COMPANY\/([A-Z0-9-]{2,20})(?:\/|$)/);
  if (screenerPath?.[1]) {
    return contentToNseSymbol(screenerPath[1]);
  }

  const nseQuery = cleaned.match(/[?&](?:SYMBOL|SYMBOL_NAME|UNDERLYING)=([A-Z0-9-]{2,20})(?:[&#]|$)/);
  if (nseQuery?.[1]) {
    return contentToNseSymbol(nseQuery[1]);
  }

  const nsePrefix = cleaned.match(/\bNSE[:\s-]+([A-Z0-9-]{2,20})(?:\.NS)?\b/);
  if (nsePrefix?.[1]) {
    return contentToNseSymbol(nsePrefix[1]);
  }

  const nseSuffix = cleaned.match(/\b([A-Z0-9-]{2,20})(?:\.NS)?[:\s-]+NSE\b/);
  if (nseSuffix?.[1]) {
    return contentToNseSymbol(nseSuffix[1]);
  }

  const yahooNse = cleaned.match(/\b([A-Z0-9-]{2,20})\.NS\b/);
  if (yahooNse?.[1]) {
    return contentToNseSymbol(yahooNse[1]);
  }

  const pathSymbol = cleaned.match(/(?:SYMBOL|QUOTE|EQUITIES|STOCK|COMPANY)[/=:-]+([A-Z0-9-]{2,20})/);
  if (pathSymbol?.[1]) {
    return contentToNseSymbol(pathSymbol[1]);
  }

  const simple = cleaned.match(/\b[A-Z][A-Z0-9-]{1,19}\b/);
  if (simple?.[0] && contentIsLikelySymbol(simple[0])) {
    return contentToNseSymbol(simple[0]);
  }

  return null;
}

function contentDetectSymbolFromText(values: string[]): string | null {
  for (const value of values) {
    const symbol = contentNormalizeSymbol(value);
    if (symbol) {
      return symbol;
    }
  }

  const joined = values.join(" ").toUpperCase();
  for (const knownSymbol of contentKnownIndianSymbols) {
    if (new RegExp(`\\b${contentEscapeRegExp(knownSymbol)}\\b`).test(joined)) {
      return contentToNseSymbol(knownSymbol);
    }
  }

  return null;
}

function contentToNseSymbol(symbol: string): string | null {
  const cleanSymbol = symbol.replace(/\.NS$/, "").replace(/[^A-Z0-9-]/g, "");
  if (!cleanSymbol || contentNoiseWords.has(cleanSymbol)) {
    return null;
  }
  return `${cleanSymbol}.NS`;
}

function contentIsLikelySymbol(symbol: string): boolean {
  if (contentNoiseWords.has(symbol)) {
    return false;
  }

  return contentKnownIndianSymbols.has(symbol);
}

function contentEscapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contentSafeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getMetaContent(property: string): string {
  const element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"], meta[name="${property}"]`);
  return element?.content?.trim() ?? "";
}

function visibleHeadingTexts(): string[] {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,[data-symbol],[data-name]")).slice(0, 12);
  return headings
    .filter((element) => element.offsetParent !== null)
    .map((element) => element.innerText || element.getAttribute("data-symbol") || element.getAttribute("data-name") || "")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
}
