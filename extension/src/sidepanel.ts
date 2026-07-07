import {
  API_BASE_URL_STORAGE_KEY,
  BACKEND_MODE_STORAGE_KEY,
  type BackendMode,
  DASHBOARD_URL,
  DEFAULT_API_BASE_URL,
  DEFAULT_WATCHLIST,
  DISCLAIMER,
  LOCAL_API_BASE_URL,
  MAX_WATCHLIST_ITEMS,
  WATCHLIST_STORAGE_KEY,
  type DetectionResult,
  type RuntimeResponse
} from "./constants.js";
import { normalizeSymbol } from "./symbol.js";

type RiskLevel = "low" | "medium" | "high";
type Confidence = "low" | "medium" | "high";

type MarketSummary = {
  symbol: string;
  latest_close: number;
  price_change_percentage: number;
  currency: string | null;
  last_updated: string;
};

type IndicatorSummary = {
  trend: string;
  sma_20: number | null;
  sma_50: number | null;
  ema_20: number | null;
  rsi_14: number | null;
  macd_histogram: number | null;
  explanation: string;
};

type RankingReport = {
  symbol: string;
  score: number;
  setup_quality: string;
  confidence: Confidence;
  risk_level: RiskLevel;
  subscores: Record<string, number>;
  reasons: string[];
  warnings: string[];
  what_could_go_wrong: string[];
  disclaimer: string;
};

type RiskReport = {
  risk_level: RiskLevel;
  daily_volatility_percent: number;
  max_drawdown_percent: number;
  risk_explanation: string;
  risk_notes: string[];
};

type AnalysisReport = {
  summary: string;
  trend_interpretation: string;
  indicator_explanation: string[];
  risk_notes: string[];
  learning_points: string[];
  disclaimer: string;
};

type CompareItem = {
  rank: number | null;
  symbol: string;
  score: number | null;
  setup_quality: string | null;
  confidence: Confidence | null;
  risk_level: RiskLevel | null;
  reasons: string[];
  warnings: string[];
  error: string | null;
};

type CompareResponse = {
  rankings: CompareItem[];
  best_setup: string | null;
  disclaimer: string;
};

type ProviderHealthEntry = {
  provider?: string;
  available?: boolean;
  configured?: boolean;
  status?: string;
  model?: string | null;
  error?: string | null;
};

type ProviderHealthResponse = {
  default_provider?: string;
  requested_provider?: string;
  active_provider?: string;
  providers?: ProviderHealthEntry[];
};

type AnalysisBundle = {
  ranking: RankingReport | null;
  market: MarketSummary | null;
  indicators: IndicatorSummary | null;
  risk: RiskReport | null;
  analysis: AnalysisReport | null;
  cachedAt: number;
};

type DetectionState = "detecting" | "detected" | "not_detected" | "error";
type RankingFilter = "all" | "stronger" | "lower_risk" | "higher_confidence" | "needs_caution";
type RankingSort = "score" | "risk" | "confidence";

const DETECTION_TIMEOUT_MS = 2500;
const REQUEST_TIMEOUT_MS = 30000;
const HEALTH_TIMEOUT_MS = 8000;
const CONNECTION_TEST_TIMEOUT_MS = 15000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const SOFT_SECTION_MESSAGE = "This section could not load right now. Market data providers can be slow. Try again in a few seconds.";

let symbolInput: HTMLInputElement;
let watchlistInput: HTMLInputElement;
let analyzeButton: HTMLButtonElement;
let addWatchlistButton: HTMLButtonElement;
let rankWatchlistButton: HTMLButtonElement;
let openDashboardButton: HTMLButtonElement;
let detectedSymbolButton: HTMLButtonElement;
let statusText: HTMLElement;
let setupSection: HTMLElement;
let marketSection: HTMLElement;
let indicatorSection: HTMLElement;
let analysisSection: HTMLElement;
let riskSection: HTMLElement;
let watchlistItems: HTMLElement;
let watchlistCount: HTMLElement;
let rankingCompare: HTMLElement;
let backendModeSelect: HTMLSelectElement;
let backendUrlInput: HTMLInputElement;
let backendModeSummary: HTMLElement;
let saveBackendSettingsButton: HTMLButtonElement;
let resetBackendSettingsButton: HTMLButtonElement;
let testBackendConnectionButton: HTMLButtonElement;
let backendSettingsStatus: HTMLElement;
let providerHealth: HTMLElement;
let localModeNote: HTMLElement;

let apiBaseUrl = DEFAULT_API_BASE_URL;
let backendMode: BackendMode = "cloud";
let watchlist = [...DEFAULT_WATCHLIST];
let detectedSymbol: string | null = null;
let currentSymbol: string | null = null;
let eventsAttached = false;
let latestCompareResult: CompareResponse | null = null;
let latestCompareSymbols: string[] = [];
let activeRankingFilter: RankingFilter = "all";
let activeRankingSort: RankingSort = "score";
let expandedRankingSymbols = new Set<string>();
let rankingDetails = new Map<string, RankingReport>();

document.addEventListener("DOMContentLoaded", () => {
  initPanel().catch((error: unknown) => {
    console.error("TradeMind panel init failed", error);
    showSafeError("Extension initialization failed. Try reloading the extension.");
  });
});

async function initPanel(): Promise<void> {
  console.log("TradeMind panel loaded");
  bindElements();
  attachEvents();
  renderWatchlist();
  await loadStoredSettings();
  void detectActiveSymbol();
}

function bindElements(): void {
  symbolInput = getElement<HTMLInputElement>("symbolInput");
  watchlistInput = getElement<HTMLInputElement>("watchlistInput");
  analyzeButton = getElement<HTMLButtonElement>("analyzeButton");
  addWatchlistButton = getElement<HTMLButtonElement>("addWatchlist");
  rankWatchlistButton = getElement<HTMLButtonElement>("rankWatchlist");
  openDashboardButton = getElement<HTMLButtonElement>("openDashboard");
  detectedSymbolButton = getElement<HTMLButtonElement>("detectedSymbol");
  statusText = getElement<HTMLElement>("statusText");
  setupSection = getElement<HTMLElement>("setupSection");
  marketSection = getElement<HTMLElement>("marketSection");
  indicatorSection = getElement<HTMLElement>("indicatorSection");
  analysisSection = getElement<HTMLElement>("analysisSection");
  riskSection = getElement<HTMLElement>("riskSection");
  watchlistItems = getElement<HTMLElement>("watchlistItems");
  watchlistCount = getElement<HTMLElement>("watchlistCount");
  rankingCompare = getElement<HTMLElement>("rankingCompare");
  backendModeSelect = getElement<HTMLSelectElement>("backendModeSelect");
  backendUrlInput = getElement<HTMLInputElement>("backendUrlInput");
  backendModeSummary = getElement<HTMLElement>("backendModeSummary");
  saveBackendSettingsButton = getElement<HTMLButtonElement>("saveBackendSettings");
  resetBackendSettingsButton = getElement<HTMLButtonElement>("resetBackendSettings");
  testBackendConnectionButton = getElement<HTMLButtonElement>("testBackendConnection");
  backendSettingsStatus = getElement<HTMLElement>("backendSettingsStatus");
  providerHealth = getElement<HTMLElement>("providerHealth");
  localModeNote = getElement<HTMLElement>("localModeNote");
}

function attachEvents(): void {
  if (eventsAttached) {
    return;
  }

  analyzeButton.addEventListener("click", () => void analyzeFromInput());
  symbolInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void analyzeFromInput();
    }
  });
  addWatchlistButton.addEventListener("click", () => void addWatchlistSymbol());
  watchlistInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void addWatchlistSymbol();
    }
  });
  rankWatchlistButton.addEventListener("click", () => void rankCurrentWatchlist());
  backendModeSelect.addEventListener("change", () => applyBackendModeSelection(backendModeSelect.value));
  backendUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void saveBackendSettings();
    }
  });
  saveBackendSettingsButton.addEventListener("click", () => void saveBackendSettings());
  resetBackendSettingsButton.addEventListener("click", () => void resetBackendSettings());
  testBackendConnectionButton.addEventListener("click", () => void testBackendConnection());
  openDashboardButton.addEventListener("click", () => {
    console.log("Open dashboard clicked");
    void chrome.runtime.sendMessage({ type: "TRADEMIND_OPEN_DASHBOARD" }).catch(() => chrome.tabs.create({ url: DASHBOARD_URL }));
  });
  detectedSymbolButton.addEventListener("click", () => {
    if (detectedSymbol) {
      symbolInput.value = detectedSymbol;
      void analyzeSymbol(detectedSymbol);
    }
  });
  eventsAttached = true;
}

async function detectActiveSymbol(): Promise<void> {
  setDetectionState("detecting");
  setStatus("Checking the active tab for a visible stock symbol...");
  try {
    const response = await withTimeout(
      chrome.runtime.sendMessage({ type: "TRADEMIND_DETECT_SYMBOL" }) as Promise<RuntimeResponse>,
      DETECTION_TIMEOUT_MS
    );
    const detection = response.detection;
    console.log("Detected symbol result", detection);
    applyDetection(detection);
  } catch (error) {
    console.warn("TradeMind symbol detection failed.", error);
    applyDetection({ symbol: null, source: "manual input required" });
    setDetectionState("error");
  }
}

function applyDetection(detection: DetectionResult | undefined): void {
  detectedSymbol = detection?.symbol ?? null;
  if (detectedSymbol) {
    setDetectionState("detected", detectedSymbol);
    symbolInput.value = detectedSymbol;
    setStatus(`Detected from ${detection?.source ?? "visible page context"}. Click Analyze to load educational analysis.`);
    return;
  }

  setDetectionState("not_detected");
  symbolInput.value = symbolInput.value || DEFAULT_WATCHLIST[0] || "";
  setStatus("Symbol was not detected on this page. Manual input is ready.");
}

function setDetectionState(state: DetectionState, symbol?: string): void {
  if (state === "detecting") {
    detectedSymbolButton.textContent = "Detecting...";
    detectedSymbolButton.disabled = true;
    return;
  }

  if (state === "detected" && symbol) {
    detectedSymbolButton.textContent = symbol;
    detectedSymbolButton.disabled = false;
    return;
  }

  detectedSymbolButton.textContent = "Not detected";
  detectedSymbolButton.disabled = true;
}

async function analyzeFromInput(): Promise<void> {
  console.log("Analyze clicked");
  const symbol = normalizeSymbol(symbolInput.value);
  if (!symbol) {
    setStatus("Enter a valid NSE symbol such as RELIANCE.NS.");
    return;
  }
  symbolInput.value = symbol;
  await analyzeSymbol(symbol);
}

async function analyzeSymbol(symbol: string): Promise<void> {
  currentSymbol = symbol;
  setLoading(true);
  setStatus(`Loading educational analysis for ${symbol}...`);
  hideSections(setupSection, marketSection, indicatorSection, analysisSection, riskSection);

  const cachedBundle = await getCachedAnalysis(symbol);
  if (cachedBundle) {
    renderAnalysisBundle(cachedBundle, true);
    setStatus(`Showing recently loaded educational analysis for ${symbol}. Refreshing...`);
  }

  void wakeBackend();

  const bundle: AnalysisBundle = {
    ranking: null,
    market: null,
    indicators: null,
    risk: null,
    analysis: null,
    cachedAt: Date.now()
  };
  let hadFailure = false;

  try {
    const ranking = await fetchApi<RankingReport>(`/api/ranking/${encodeURIComponent(symbol)}`);
    bundle.ranking = ranking;
    setupSection.classList.remove("hidden");
    setupSection.innerHTML = renderSetupRanking(ranking);
  } catch (error) {
    hadFailure = true;
    console.warn("TradeMind ranking request failed.", error);
    setupSection.classList.remove("hidden");
    setupSection.innerHTML = softWarningCard("Setup score is temporarily unavailable.", true);
  }

  const [market, indicators, risk, analysis] = await Promise.allSettled([
    fetchApi<MarketSummary>(`/api/market/${encodeURIComponent(symbol)}`),
    fetchApi<IndicatorSummary>(`/api/indicators/${encodeURIComponent(symbol)}`),
    fetchApi<RiskReport>(`/api/risk/${encodeURIComponent(symbol)}`),
    fetchApi<AnalysisReport>(`/api/analysis/${encodeURIComponent(symbol)}`)
  ]);

  hadFailure = renderOptionalSettled(market, marketSection, renderMarketSummary, "Market summary is temporarily unavailable.") || hadFailure;
  if (market.status === "fulfilled") {
    bundle.market = market.value;
  }

  hadFailure = renderOptionalSettled(indicators, indicatorSection, renderIndicators, "Technical indicators are temporarily unavailable.") || hadFailure;
  if (indicators.status === "fulfilled") {
    bundle.indicators = indicators.value;
  }

  hadFailure = renderOptionalSettled(analysis, analysisSection, renderAnalysis, "AI explanation is temporarily unavailable.") || hadFailure;
  if (analysis.status === "fulfilled") {
    bundle.analysis = analysis.value;
  }

  hadFailure = renderOptionalSettled(risk, riskSection, renderRisk, "Risk warnings are temporarily unavailable.") || hadFailure;
  if (risk.status === "fulfilled") {
    bundle.risk = risk.value;
  }

  if (bundle.ranking || bundle.market || bundle.indicators || bundle.risk || bundle.analysis) {
    await setCachedAnalysis(symbol, bundle);
  }

  setLoading(false);
  setStatus(
    hadFailure
      ? `Loaded available educational analysis for ${symbol}. Some sections may be delayed.`
      : `Loaded ${symbol}. ${DISCLAIMER}`
  );
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...options,
    signal: controller.signal
  }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(SOFT_SECTION_MESSAGE);
    }
    throw error;
  }).finally(() => window.clearTimeout(timeoutId));

  if (!response.ok) {
    try {
      const body = await response.json() as { detail?: string };
      console.warn("TradeMind API request failed.", path, body.detail ?? `Status ${response.status}`);
    } catch {
      console.warn("TradeMind API request failed.", path, `Status ${response.status}`);
    }
    throw new Error(SOFT_SECTION_MESSAGE);
  }

  return response.json() as Promise<T>;
}

function applyBackendModeSelection(value: string): void {
  backendMode = isBackendMode(value) ? value : "cloud";
  if (backendMode !== "custom") {
    apiBaseUrl = backendUrlForMode(backendMode);
  } else {
    apiBaseUrl = trimTrailingSlash(backendUrlInput.value || apiBaseUrl || DEFAULT_API_BASE_URL);
  }
  renderBackendSettings();
}

async function saveBackendSettings(): Promise<void> {
  const selectedMode = isBackendMode(backendModeSelect.value) ? backendModeSelect.value : "cloud";
  const nextUrl = selectedMode === "custom"
    ? trimTrailingSlash(backendUrlInput.value)
    : backendUrlForMode(selectedMode);

  if (!isValidBackendUrl(nextUrl)) {
    setBackendSettingsStatus("Enter a valid HTTP or HTTPS backend URL before saving.");
    backendUrlInput.focus();
    return;
  }

  if (selectedMode === "custom") {
    const hasPermission = await requestBackendOriginPermission(nextUrl);
    if (!hasPermission) {
      setBackendSettingsStatus("Custom backend permission was not granted. Settings were not saved.");
      return;
    }
  }

  backendMode = selectedMode;
  apiBaseUrl = nextUrl;
  await chrome.storage.local.set({
    [BACKEND_MODE_STORAGE_KEY]: backendMode,
    [API_BASE_URL_STORAGE_KEY]: apiBaseUrl
  });
  renderBackendSettings();
  setBackendSettingsStatus(`${backendModeLabel(backendMode)} backend saved.`);
}

async function resetBackendSettings(): Promise<void> {
  backendMode = "cloud";
  apiBaseUrl = DEFAULT_API_BASE_URL;
  await chrome.storage.local.set({
    [BACKEND_MODE_STORAGE_KEY]: backendMode,
    [API_BASE_URL_STORAGE_KEY]: apiBaseUrl
  });
  providerHealth.innerHTML = `<p class="status-text">Provider status will appear after testing the connection.</p>`;
  renderBackendSettings();
  setBackendSettingsStatus("Cloud backend restored.");
}

async function testBackendConnection(): Promise<void> {
  const selectedMode = isBackendMode(backendModeSelect.value) ? backendModeSelect.value : "cloud";
  const testUrl = selectedMode === "custom"
    ? trimTrailingSlash(backendUrlInput.value)
    : backendUrlForMode(selectedMode);

  if (!isValidBackendUrl(testUrl)) {
    setBackendSettingsStatus("Enter a valid HTTP or HTTPS backend URL before testing.");
    backendUrlInput.focus();
    return;
  }

  if (selectedMode === "custom") {
    const hasPermission = await requestBackendOriginPermission(testUrl);
    if (!hasPermission) {
      setBackendSettingsStatus("Custom backend permission was not granted. Connection was not tested.");
      return;
    }
  }

  testBackendConnectionButton.disabled = true;
  testBackendConnectionButton.textContent = "Testing...";
  setBackendSettingsStatus("Connecting... Render may take a few seconds on the first request.");

  try {
    await fetchBackendJson<Record<string, unknown>>("/health", CONNECTION_TEST_TIMEOUT_MS, testUrl);
    const health = await fetchBackendJson<ProviderHealthResponse>("/api/providers/health", CONNECTION_TEST_TIMEOUT_MS, testUrl);
    renderProviderHealth(health);
    setBackendSettingsStatus("Connection succeeded. Provider status loaded.");
  } catch (error) {
    console.warn("TradeMind backend connection test failed.", error);
    renderProviderHealthUnavailable();
    setBackendSettingsStatus("Connection failed. Check the selected backend URL and try again.");
  } finally {
    testBackendConnectionButton.disabled = false;
    testBackendConnectionButton.textContent = "Test connection";
  }
}

async function fetchBackendJson<T>(path: string, timeoutMs: number, baseUrl = apiBaseUrl): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}.`);
    }

    return response.json() as Promise<T>;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function renderBackendSettings(): void {
  backendModeSelect.value = backendMode;
  backendModeSummary.textContent = backendModeLabel(backendMode);
  backendUrlInput.value = backendMode === "custom" ? trimTrailingSlash(apiBaseUrl) : backendUrlForMode(backendMode);
  backendUrlInput.readOnly = backendMode !== "custom";
  localModeNote.classList.toggle("hidden", backendMode !== "local");
}

function renderProviderHealth(health: ProviderHealthResponse): void {
  const providerRows = ["rule_based", "gemini", "ollama", "cloud"]
    .map((name) => providerStatusRow(providerLabel(name), providerStatus(health, name)))
    .join("");

  providerHealth.innerHTML = `
    <h3>AI Provider Status</h3>
    <div class="provider-list">
      ${providerStatusRow("Current backend", backendModeLabel(backendMode))}
      ${providerStatusRow("Requested provider", displayProvider(health.requested_provider ?? health.default_provider))}
      ${providerStatusRow("Active provider", displayProvider(health.active_provider))}
      ${providerRows}
    </div>
  `;
}

function renderProviderHealthUnavailable(): void {
  providerHealth.innerHTML = `<p class="status-text">Provider status unavailable. Check backend connection.</p>`;
}

function providerStatusRow(label: string, value: string): string {
  return `
    <div class="provider-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function providerStatus(health: ProviderHealthResponse, providerName: string): string {
  const entry = health.providers?.find((provider) => provider.provider === providerName);
  if (!entry) {
    return "not returned";
  }

  if (entry.status) {
    return entry.status.replace(/_/g, " ");
  }

  if (entry.available === true) {
    return "ready";
  }

  if (entry.available === false) {
    return "unavailable";
  }

  return "unknown";
}

function displayProvider(value: string | undefined): string {
  return value ? value.replace(/_/g, " ") : "not returned";
}

function providerLabel(value: string): string {
  if (value === "rule_based") {
    return "Rule-based";
  }
  if (value === "gemini") {
    return "Gemini";
  }
  if (value === "ollama") {
    return "Ollama";
  }
  return "Cloud";
}

function backendUrlForMode(mode: BackendMode): string {
  if (mode === "local") {
    return LOCAL_API_BASE_URL;
  }
  return DEFAULT_API_BASE_URL;
}

function backendModeLabel(mode: BackendMode): string {
  if (mode === "local") {
    return "Local";
  }
  if (mode === "custom") {
    return "Custom";
  }
  return "Cloud";
}

function isBackendMode(value: string): value is BackendMode {
  return value === "cloud" || value === "local" || value === "custom";
}

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isValidBackendUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function permissionPatternForBackend(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return `${url.protocol}//${url.host}/*`;
  } catch {
    return null;
  }
}

async function requestBackendOriginPermission(value: string): Promise<boolean> {
  const origin = permissionPatternForBackend(value);
  if (!origin || !chrome.permissions) {
    return true;
  }

  return new Promise((resolve) => {
    chrome.permissions.contains({ origins: [origin] }, (alreadyGranted) => {
      if (alreadyGranted) {
        resolve(true);
        return;
      }

      if (chrome.runtime.lastError) {
        console.warn("TradeMind custom backend permission lookup failed.", chrome.runtime.lastError.message);
      }

      chrome.permissions.request({ origins: [origin] }, (granted) => {
        if (chrome.runtime.lastError) {
          console.warn("TradeMind custom backend permission request failed.", chrome.runtime.lastError.message);
          resolve(false);
          return;
        }
        resolve(Boolean(granted));
      });
    });
  });
}

function setBackendSettingsStatus(message: string): void {
  backendSettingsStatus.textContent = message;
}

function renderOptionalSettled<T>(
  result: PromiseSettledResult<T>,
  section: HTMLElement,
  renderer: (value: T) => string,
  title: string
): boolean {
  section.classList.remove("hidden");
  if (result.status === "fulfilled") {
    section.innerHTML = renderer(result.value);
    return false;
  }

  console.warn("TradeMind optional section failed.", title, result.reason);
  section.innerHTML = softWarningCard(title, true);
  return true;
}

function renderSetupRanking(ranking: RankingReport, fromCache = false): string {
  const subscoreItems = Object.entries(ranking.subscores)
    .map(([key, value]) => `<div class="metric"><span>${labelize(key)}</span><strong>${formatNumber(value)}</strong></div>`)
    .join("");

  return `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Setup Score</p>
        <h2>${escapeHtml(ranking.symbol)}</h2>
      </div>
      <div class="score-orb">${formatNumber(ranking.score, 0)}</div>
    </div>
    ${fromCache ? `<p class="cache-note">Recently loaded result. Refreshing latest data in the background.</p>` : ""}
    <div class="label-grid">
      <span>${escapeHtml(ranking.setup_quality)}</span>
      <span>Confidence: ${escapeHtml(ranking.confidence)}</span>
      <span>Risk: ${escapeHtml(ranking.risk_level)}</span>
    </div>
    <div class="metric-grid">${subscoreItems}</div>
    ${listBlock("Reasons", ranking.reasons)}
    ${listBlock("Risk Warnings", ranking.warnings)}
    ${listBlock("What Could Go Wrong", ranking.what_could_go_wrong)}
  `;
}

function renderMarketSummary(market: MarketSummary): string {
  return `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Market summary</p>
        <h2>${escapeHtml(market.symbol)}</h2>
      </div>
      <span class="subtle-pill">${escapeHtml(market.currency ?? "Market")}</span>
    </div>
    <div class="metric-grid">
      <div class="metric"><span>Latest close</span><strong>${formatNumber(market.latest_close)}</strong></div>
      <div class="metric"><span>Change</span><strong>${formatNumber(market.price_change_percentage)}%</strong></div>
      <div class="metric"><span>Updated</span><strong>${escapeHtml(market.last_updated)}</strong></div>
    </div>
  `;
}

function renderIndicators(indicators: IndicatorSummary): string {
  return `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Technical indicators</p>
        <h2>${escapeHtml(indicators.trend)}</h2>
      </div>
    </div>
    <div class="metric-grid">
      <div class="metric"><span>SMA 20</span><strong>${formatMaybe(indicators.sma_20)}</strong></div>
      <div class="metric"><span>SMA 50</span><strong>${formatMaybe(indicators.sma_50)}</strong></div>
      <div class="metric"><span>EMA 20</span><strong>${formatMaybe(indicators.ema_20)}</strong></div>
      <div class="metric"><span>RSI 14</span><strong>${formatMaybe(indicators.rsi_14)}</strong></div>
      <div class="metric"><span>MACD histogram</span><strong>${formatMaybe(indicators.macd_histogram)}</strong></div>
    </div>
    <p class="body-copy">${escapeHtml(indicators.explanation)}</p>
  `;
}

function renderAnalysis(analysis: AnalysisReport): string {
  return `
    <div class="section-heading">
      <div>
        <p class="eyebrow">AI explanation</p>
        <h2>Educational view</h2>
      </div>
    </div>
    <p class="body-copy">${escapeHtml(analysis.summary)}</p>
    <p class="body-copy">${escapeHtml(analysis.trend_interpretation)}</p>
    ${listBlock("Learning Points", analysis.learning_points)}
  `;
}

function renderRisk(risk: RiskReport): string {
  return `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Risk Warnings</p>
        <h2>${escapeHtml(risk.risk_level)} risk</h2>
      </div>
    </div>
    <div class="metric-grid">
      <div class="metric"><span>Daily volatility</span><strong>${formatNumber(risk.daily_volatility_percent)}%</strong></div>
      <div class="metric"><span>Max drawdown</span><strong>${formatNumber(risk.max_drawdown_percent)}%</strong></div>
    </div>
    <p class="body-copy">${escapeHtml(risk.risk_explanation)}</p>
    ${listBlock("Risk Notes", risk.risk_notes)}
  `;
}

async function addWatchlistSymbol(): Promise<void> {
  console.log("Add watchlist clicked");
  const symbol = normalizeSymbol(watchlistInput.value || symbolInput.value);
  if (!symbol) {
    setStatus("Enter a valid symbol before adding it to the watchlist.");
    return;
  }

  if (watchlist.includes(symbol)) {
    setStatus(`${symbol} is already in the watchlist.`);
    return;
  }

  if (watchlist.length >= MAX_WATCHLIST_ITEMS) {
    setStatus(`Watchlist limit reached: ${MAX_WATCHLIST_ITEMS} symbols.`);
    return;
  }

  watchlist = [...watchlist, symbol];
  watchlistInput.value = "";
  await saveWatchlist();
  renderWatchlist();
  setStatus(`${symbol} added to watchlist.`);
}

async function removeWatchlistSymbol(symbol: string): Promise<void> {
  watchlist = watchlist.filter((item) => item !== symbol);
  await saveWatchlist();
  renderWatchlist();
  setStatus(`${symbol} removed from watchlist.`);
}

async function rankCurrentWatchlist(): Promise<void> {
  console.log("Ranking watchlist clicked");
  const symbols = comparisonSymbols();
  if (symbols.length < 2) {
    setStatus("Add at least two symbols to rank the watchlist.");
    return;
  }

  rankWatchlistButton.disabled = true;
  rankWatchlistButton.textContent = "Ranking...";
  rankingCompare.classList.remove("hidden");
  rankingCompare.innerHTML = `<p class="status-text">Ranking current watchlist...</p>`;

  try {
    const result = await fetchApi<CompareResponse>("/api/ranking/compare", {
      method: "POST",
      body: JSON.stringify({ symbols })
    });
    latestCompareResult = result;
    latestCompareSymbols = symbols;
    activeRankingFilter = "all";
    activeRankingSort = "score";
    expandedRankingSymbols = new Set<string>();
    rankingDetails = new Map<string, RankingReport>();
    renderLatestRankingBoard();
    void enrichTopRankedSetups(result);
    setStatus("Watchlist ranking loaded.");
  } catch (error) {
    console.warn("TradeMind watchlist ranking failed.", error);
    rankingCompare.innerHTML = softWarningCard("Relative ranking is temporarily unavailable.", false);
  } finally {
    rankWatchlistButton.disabled = false;
    rankWatchlistButton.textContent = "Rank current watchlist";
  }
}

function comparisonSymbols(): string[] {
  const symbols = watchlist.slice(0, MAX_WATCHLIST_ITEMS);
  if (!currentSymbol || symbols.includes(currentSymbol) || symbols.length >= MAX_WATCHLIST_ITEMS) {
    return symbols;
  }

  return [...symbols, currentSymbol];
}

async function enrichTopRankedSetups(result: CompareResponse): Promise<void> {
  const symbols = result.rankings
    .filter((item) => item.score !== null && !item.error)
    .slice(0, 3)
    .map((item) => item.symbol);

  const detailResults = await Promise.allSettled(
    symbols.map((symbol) => fetchApi<RankingReport>(`/api/ranking/${encodeURIComponent(symbol)}`))
  );

  detailResults.forEach((detailResult) => {
    if (detailResult.status === "fulfilled") {
      rankingDetails.set(detailResult.value.symbol, detailResult.value);
    } else {
      console.warn("TradeMind ranking detail enrichment failed.", detailResult.reason);
    }
  });

  renderLatestRankingBoard();
}

async function wakeBackend(): Promise<void> {
  setStatus("Connecting to TradeMind backend... first request may take a few seconds.");
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    await fetch(`${apiBaseUrl}/health`, {
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    console.warn("TradeMind backend wake-up check did not complete.", error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function retryCurrentAnalysis(): Promise<void> {
  if (!currentSymbol) {
    await analyzeFromInput();
    return;
  }

  await analyzeSymbol(currentSymbol);
}

function renderAnalysisBundle(bundle: AnalysisBundle, fromCache: boolean): void {
  if (bundle.ranking) {
    setupSection.classList.remove("hidden");
    setupSection.innerHTML = renderSetupRanking(bundle.ranking, fromCache);
  }
  if (bundle.market) {
    marketSection.classList.remove("hidden");
    marketSection.innerHTML = renderMarketSummary(bundle.market);
  }
  if (bundle.indicators) {
    indicatorSection.classList.remove("hidden");
    indicatorSection.innerHTML = renderIndicators(bundle.indicators);
  }
  if (bundle.analysis) {
    analysisSection.classList.remove("hidden");
    analysisSection.innerHTML = renderAnalysis(bundle.analysis);
  }
  if (bundle.risk) {
    riskSection.classList.remove("hidden");
    riskSection.innerHTML = renderRisk(bundle.risk);
  }
}

function renderWatchlist(): void {
  watchlistCount.textContent = `${watchlist.length}/${MAX_WATCHLIST_ITEMS}`;
  watchlistItems.innerHTML = "";

  for (const symbol of watchlist) {
    const item = document.createElement("div");
    item.className = "watchlist-item";

    const analyze = document.createElement("button");
    analyze.type = "button";
    analyze.textContent = symbol;
    analyze.addEventListener("click", () => {
      symbolInput.value = symbol;
      void analyzeSymbol(symbol);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => void removeWatchlistSymbol(symbol));

    item.append(analyze, remove);
    watchlistItems.append(item);
  }
}

function renderLatestRankingBoard(): void {
  if (!latestCompareResult) {
    return;
  }

  rankingCompare.innerHTML = renderRankingBoard(latestCompareResult);
}

function renderRankingBoard(result: CompareResponse): string {
  const validCount = result.rankings.filter((item) => item.score !== null && !item.error).length;
  const currentInsight = renderCurrentStockInsight(result, validCount);
  const filteredItems = sortRankingItems(result.rankings.filter(matchesRankingFilter));
  const failedItems = result.rankings.filter((item) => item.error);
  const cards = filteredItems.map(renderRankCard).join("");
  const failedCards = failedItems.map(renderFailedRankCard).join("");

  return `
    ${result.best_setup ? `<p class="highlight">Strongest setup in this comparison: ${escapeHtml(result.best_setup)}</p>` : ""}
    ${currentInsight}
    <div class="ranking-toolbar">
      <div class="filter-chip-row">
        ${rankingFilterButton("all", "All")}
        ${rankingFilterButton("stronger", "Stronger setups")}
        ${rankingFilterButton("lower_risk", "Lower risk")}
        ${rankingFilterButton("higher_confidence", "Higher confidence")}
        ${rankingFilterButton("needs_caution", "Needs caution")}
      </div>
      <label class="sort-control">
        <span>Sort</span>
        <select data-rank-sort="true">
          <option value="score" ${activeRankingSort === "score" ? "selected" : ""}>Score</option>
          <option value="risk" ${activeRankingSort === "risk" ? "selected" : ""}>Risk</option>
          <option value="confidence" ${activeRankingSort === "confidence" ? "selected" : ""}>Confidence</option>
        </select>
      </label>
    </div>
    <div class="rank-card-list">
      ${cards || `<p class="status-text">No ranked symbols match this view.</p>`}
      ${failedCards}
    </div>
    <p class="mini-disclaimer">${escapeHtml(result.disclaimer)}</p>
  `;
}

function renderCurrentStockInsight(result: CompareResponse, validCount: number): string {
  if (!currentSymbol) {
    return "";
  }

  const currentItem = result.rankings.find((item) => item.symbol === currentSymbol && item.rank !== null);
  if (currentItem?.rank) {
    return `<p class="comparison-insight">Current stock ranks #${currentItem.rank} out of ${validCount} in this watchlist comparison.</p>`;
  }

  if (!watchlist.includes(currentSymbol)) {
    return `<p class="comparison-insight muted">Current stock is not in watchlist. Add it to compare directly.</p>`;
  }

  return "";
}

function rankingFilterButton(filter: RankingFilter, label: string): string {
  const activeClass = activeRankingFilter === filter ? " active" : "";
  return `<button class="filter-chip${activeClass}" type="button" data-rank-filter="${filter}">${escapeHtml(label)}</button>`;
}

function matchesRankingFilter(item: CompareItem): boolean {
  if (item.error) {
    return false;
  }

  if (activeRankingFilter === "all") {
    return true;
  }

  const score = item.score ?? 0;
  const warnings = item.warnings.length + (rankingDetails.get(item.symbol)?.warnings.length ?? 0);

  if (activeRankingFilter === "stronger") {
    return score >= 70;
  }
  if (activeRankingFilter === "lower_risk") {
    return item.risk_level === "low" || item.risk_level === "medium";
  }
  if (activeRankingFilter === "higher_confidence") {
    return item.confidence === "high" || item.confidence === "medium";
  }

  return item.risk_level === "high" || item.confidence === "low" || score < 50 || warnings > 0;
}

function sortRankingItems(items: CompareItem[]): CompareItem[] {
  const sortedItems = [...items];
  sortedItems.sort((left, right) => {
    if (activeRankingSort === "risk") {
      return riskRank(left.risk_level) - riskRank(right.risk_level) || (right.score ?? -1) - (left.score ?? -1);
    }
    if (activeRankingSort === "confidence") {
      return confidenceRank(right.confidence) - confidenceRank(left.confidence) || (right.score ?? -1) - (left.score ?? -1);
    }

    return (right.score ?? -1) - (left.score ?? -1);
  });
  return sortedItems;
}

function renderRankCard(item: CompareItem): string {
  const detail = rankingDetails.get(item.symbol);
  const isCurrent = currentSymbol === item.symbol;
  const expanded = expandedRankingSymbols.has(item.symbol);
  const reason = firstText(item.reasons, detail?.reasons) ?? "Signals are mixed in this comparison.";
  const warning = firstText(item.warnings, detail?.warnings) ?? "Review risk warnings before relying on one setup.";

  return `
    <article class="rank-card ${isCurrent ? "current" : ""}">
      <div class="rank-card-top">
        <div>
          <p class="rank-kicker">Rank ${item.rank ?? "-"}</p>
          <h3>${escapeHtml(item.symbol)}${isCurrent ? ` <span class="current-badge">Current</span>` : ""}</h3>
        </div>
        <div class="score-pill">${item.score ?? "-"}</div>
      </div>
      <div class="rank-badges">
        ${badge(item.setup_quality ?? "Setup quality unavailable", "quality")}
        ${badge(`Confidence: ${item.confidence ?? "-"}`, `confidence-${item.confidence ?? "unknown"}`)}
        ${badge(`Risk: ${item.risk_level ?? "-"}`, `risk-${item.risk_level ?? "unknown"}`)}
      </div>
      <p class="rank-note"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p class="rank-note warning"><strong>Risk warning:</strong> ${escapeHtml(warning)}</p>
      <button class="details-button" type="button" data-rank-toggle="${escapeHtml(item.symbol)}">
        ${expanded ? "Hide details" : "Show details"}
      </button>
      ${expanded ? renderRankDetails(item, detail) : ""}
    </article>
  `;
}

function renderRankDetails(item: CompareItem, detail: RankingReport | undefined): string {
  if (!detail) {
    return `<div class="rank-details"><p class="status-text">More detail is loading for top-ranked setups.</p></div>`;
  }

  return `
    <div class="rank-details">
      ${compactList("Reasons", detail.reasons)}
      ${compactList("Risk warnings", detail.warnings)}
      ${compactList("What could go wrong", detail.what_could_go_wrong)}
    </div>
  `;
}

function renderFailedRankCard(item: CompareItem): string {
  return `
    <article class="rank-card failed">
      <div class="rank-card-top">
        <div>
          <p class="rank-kicker">Unavailable</p>
          <h3>${escapeHtml(item.symbol)}</h3>
        </div>
      </div>
      <p class="rank-note warning">This symbol could not be ranked right now. Try again in a few seconds.</p>
    </article>
  `;
}

function badge(label: string, tone: string): string {
  return `<span class="rank-badge ${tone}">${escapeHtml(label)}</span>`;
}

function firstText(primary: string[], secondary?: string[]): string | null {
  return primary[0] ?? secondary?.[0] ?? null;
}

function compactList(title: string, items: string[]): string {
  if (!items.length) {
    return "";
  }

  return `
    <div class="compact-list">
      <h4>${escapeHtml(title)}</h4>
      <ul>${items.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function riskRank(riskLevel: RiskLevel | null): number {
  if (riskLevel === "low") {
    return 1;
  }
  if (riskLevel === "medium") {
    return 2;
  }
  if (riskLevel === "high") {
    return 3;
  }
  return 4;
}

function confidenceRank(confidence: Confidence | null): number {
  if (confidence === "high") {
    return 3;
  }
  if (confidence === "medium") {
    return 2;
  }
  if (confidence === "low") {
    return 1;
  }
  return 0;
}

function softWarningCard(title: string, showRetry: boolean): string {
  return `
    <div class="soft-warning">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(SOFT_SECTION_MESSAGE)}</p>
      ${showRetry ? `<button class="retry-button" type="button" data-retry-analysis="true">Retry analysis</button>` : ""}
    </div>
  `;
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.dataset.retryAnalysis === "true") {
    void retryCurrentAnalysis();
    return;
  }

  if (target instanceof HTMLElement && target.dataset.rankFilter) {
    activeRankingFilter = target.dataset.rankFilter as RankingFilter;
    renderLatestRankingBoard();
    return;
  }

  if (target instanceof HTMLElement && target.dataset.rankToggle) {
    const symbol = target.dataset.rankToggle;
    if (expandedRankingSymbols.has(symbol)) {
      expandedRankingSymbols.delete(symbol);
    } else {
      expandedRankingSymbols.add(symbol);
    }
    renderLatestRankingBoard();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.dataset.rankSort === "true") {
    activeRankingSort = target.value as RankingSort;
    renderLatestRankingBoard();
  }
});

async function getCachedAnalysis(symbol: string): Promise<AnalysisBundle | null> {
  try {
    const key = analysisCacheKey(symbol);
    const stored = await chrome.storage.local.get(key);
    const cached = stored[key] as AnalysisBundle | undefined;
    if (!cached?.cachedAt || Date.now() - cached.cachedAt > CACHE_TTL_MS) {
      return null;
    }
    return cached;
  } catch (error) {
    console.warn("TradeMind analysis cache read failed.", error);
    return null;
  }
}

async function setCachedAnalysis(symbol: string, bundle: AnalysisBundle): Promise<void> {
  try {
    await chrome.storage.local.set({ [analysisCacheKey(symbol)]: bundle });
  } catch (error) {
    console.warn("TradeMind analysis cache save failed.", error);
  }
}

function analysisCacheKey(symbol: string): string {
  return `analysis_cache_${symbol}`;
}

async function saveWatchlist(): Promise<void> {
  try {
    await chrome.storage.local.set({ [WATCHLIST_STORAGE_KEY]: watchlist });
  } catch (error) {
    console.warn("TradeMind watchlist storage save failed.", error);
  }
}

function normalizeWatchlist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_WATCHLIST];
  }

  const symbols = value
    .map((item) => normalizeSymbol(String(item)))
    .filter((item): item is string => Boolean(item))
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, MAX_WATCHLIST_ITEMS);

  return symbols.length >= 1 ? symbols : [...DEFAULT_WATCHLIST];
}

async function loadStoredSettings(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([BACKEND_MODE_STORAGE_KEY, API_BASE_URL_STORAGE_KEY, WATCHLIST_STORAGE_KEY]);
    const storedMode = typeof stored[BACKEND_MODE_STORAGE_KEY] === "string" && isBackendMode(stored[BACKEND_MODE_STORAGE_KEY])
      ? stored[BACKEND_MODE_STORAGE_KEY]
      : "cloud";
    const storedUrl = typeof stored[API_BASE_URL_STORAGE_KEY] === "string" ? trimTrailingSlash(stored[API_BASE_URL_STORAGE_KEY]) : "";
    const normalizedUrl = storedMode === "custom" && isValidBackendUrl(storedUrl) ? storedUrl : backendUrlForMode(storedMode);
    backendMode = storedMode;
    apiBaseUrl = normalizedUrl;
    renderBackendSettings();
    setBackendSettingsStatus(`${backendModeLabel(backendMode)} backend is selected.`);

    const hasSavedWatchlist = Object.prototype.hasOwnProperty.call(stored, WATCHLIST_STORAGE_KEY);
    watchlist = hasSavedWatchlist ? normalizeWatchlist(stored[WATCHLIST_STORAGE_KEY]) : [...DEFAULT_WATCHLIST];
    renderWatchlist();
    console.log("Watchlist loaded", watchlist);

    if (!Object.prototype.hasOwnProperty.call(stored, BACKEND_MODE_STORAGE_KEY) || !Object.prototype.hasOwnProperty.call(stored, API_BASE_URL_STORAGE_KEY)) {
      await chrome.storage.local.set({
        [BACKEND_MODE_STORAGE_KEY]: backendMode,
        [API_BASE_URL_STORAGE_KEY]: apiBaseUrl
      });
    }

    if (!hasSavedWatchlist) {
      await saveWatchlist();
    }
  } catch (error) {
    console.warn("TradeMind storage unavailable; using default settings in memory.", error);
    backendMode = "cloud";
    apiBaseUrl = DEFAULT_API_BASE_URL;
    renderBackendSettings();
    setBackendSettingsStatus("Cloud backend is selected.");
    watchlist = [...DEFAULT_WATCHLIST];
    renderWatchlist();
    console.log("Watchlist loaded", watchlist);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error("Symbol detection timed out.")), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((error: unknown) => reject(error))
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function listBlock(title: string, items: string[]): string {
  if (!items.length) {
    return "";
  }

  return `
    <div class="list-block">
      <h3>${escapeHtml(title)}</h3>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function errorCard(title: string, message: string): string {
  return `
    <div class="error-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function setLoading(isLoading: boolean): void {
  analyzeButton.disabled = isLoading;
  analyzeButton.textContent = isLoading ? "Loading..." : "Analyze";
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function hideSections(...sections: HTMLElement[]): void {
  for (const section of sections) {
    section.classList.add("hidden");
    section.innerHTML = "";
  }
}

function formatMaybe(value: number | null): string {
  return value === null ? "-" : formatNumber(value);
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits
  });
}

function labelize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}

function showSafeError(message: string): void {
  const target = document.getElementById("statusText");
  if (target) {
    target.textContent = message;
    return;
  }

  const fallback = document.createElement("p");
  fallback.textContent = message;
  fallback.style.padding = "12px";
  fallback.style.color = "#fde68a";
  document.body.append(fallback);
}
