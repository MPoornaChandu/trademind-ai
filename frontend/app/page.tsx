"use client";

import { useCallback, useEffect, useState } from "react";

import { AIAnalysisCard } from "@/components/AIAnalysisCard";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { ErrorState } from "@/components/ErrorState";
import { IndicatorCard } from "@/components/IndicatorCard";
import { LoadingState } from "@/components/LoadingState";
import { MarketSummaryCard } from "@/components/MarketSummaryCard";
import { RiskManagementCard } from "@/components/RiskManagementCard";
import { SetupRankingCard } from "@/components/SetupRankingCard";
import { SymbolSearch } from "@/components/SymbolSearch";
import { TrendExplanation } from "@/components/TrendExplanation";
import { DEFAULT_WATCHLIST, MAX_WATCHLIST_ITEMS, WatchlistPanel } from "@/components/WatchlistPanel";
import { fetchDashboardData } from "@/lib/api";
import type { DashboardData } from "@/lib/types";

const DEFAULT_SYMBOL = "RELIANCE.NS";
const WATCHLIST_STORAGE_KEY = "trademind_watchlist";

export default function DashboardPage() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [activeSymbol, setActiveSymbol] = useState(DEFAULT_SYMBOL);
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedWatchlist = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (!savedWatchlist) {
        setWatchlist(DEFAULT_WATCHLIST);
        return;
      }

      const parsed = JSON.parse(savedWatchlist);
      if (!Array.isArray(parsed)) {
        setWatchlist(DEFAULT_WATCHLIST);
        return;
      }

      const cleanItems = parsed
        .map((item) => String(item).trim().toUpperCase())
        .filter(Boolean)
        .filter((item, index, items) => items.indexOf(item) === index)
        .slice(0, MAX_WATCHLIST_ITEMS);

      setWatchlist(cleanItems.length > 0 ? cleanItems : DEFAULT_WATCHLIST);
    } catch {
      setWatchlist(DEFAULT_WATCHLIST);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const loadDashboard = useCallback(async (nextSymbol: string) => {
    const cleanSymbol = nextSymbol.trim().toUpperCase();
    if (!cleanSymbol) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setActiveSymbol(cleanSymbol);

    try {
      const result = await fetchDashboardData(cleanSymbol);
      setData(result);
    } catch (caughtError) {
      setData(null);
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong while loading market data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectSymbol = useCallback(
    (nextSymbol: string) => {
      const cleanSymbol = nextSymbol.trim().toUpperCase();
      setSymbol(cleanSymbol);
      void loadDashboard(cleanSymbol);
    },
    [loadDashboard]
  );

  function addCurrentSymbolToWatchlist() {
    const cleanSymbol = activeSymbol.trim().toUpperCase();
    if (!cleanSymbol) {
      return;
    }

    setWatchlist((current) => {
      if (current.includes(cleanSymbol) || current.length >= MAX_WATCHLIST_ITEMS) {
        return current;
      }

      return [...current, cleanSymbol];
    });
  }

  function removeFromWatchlist(symbolToRemove: string) {
    setWatchlist((current) => current.filter((item) => item !== symbolToRemove));
  }

  useEffect(() => {
    void loadDashboard(DEFAULT_SYMBOL);
  }, [loadDashboard]);

  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_30%),linear-gradient(180deg,rgba(24,24,27,0.1),rgba(9,9,11,1))]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-6 py-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-teal-200/20 bg-teal-200/10 px-4 py-2 text-xs font-bold uppercase text-teal-100">
              Educational analysis only. Not financial advice. No broker execution or real-money trading is included.
            </div>
            <h1 className="text-4xl font-black tracking-normal text-white sm:text-6xl">TradeMind AI</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
              AI-ready market analysis dashboard for learning, indicators, and risk-aware decision support.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase text-zinc-500">Active symbol</p>
            <p className="mt-2 text-2xl font-black text-amber-100">{activeSymbol}</p>
          </div>
        </header>

        <SymbolSearch
          symbol={symbol}
          isLoading={isLoading}
          onSymbolChange={setSymbol}
          onSubmit={() => void loadDashboard(symbol)}
          onQuickSelect={selectSymbol}
        />

        <WatchlistPanel
          activeSymbol={activeSymbol}
          watchlist={watchlist}
          onAddCurrent={addCurrentSymbolToWatchlist}
          onRemove={removeFromWatchlist}
          onSelect={selectSymbol}
        />

        {isLoading ? <LoadingState /> : null}

        {!isLoading && error ? <ErrorState message={error} onRetry={() => void loadDashboard(symbol)} /> : null}

        {!isLoading && !error && data ? (
          <div className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <MarketSummaryCard market={data.market} />
              <IndicatorCard indicators={data.indicators} />
            </div>
            <TrendExplanation indicators={data.indicators} />
            <SetupRankingCard ranking={data.ranking} warning={data.rankingError} />
            <AIAnalysisCard analysis={data.analysis} warning={data.analysisError} />
            <RiskManagementCard risk={data.risk} warning={data.riskError} />
            <ComparisonPanel watchlist={watchlist} />
          </div>
        ) : null}

        {!isLoading && !error && !data ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 text-zinc-300 backdrop-blur-xl">
            Enter a stock symbol to load market analysis.
          </section>
        ) : null}
      </div>
    </main>
  );
}
