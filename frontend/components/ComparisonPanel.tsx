"use client";

import { useEffect, useMemo, useState } from "react";

import { getComparisonData } from "@/lib/api";
import type { ComparisonData, RiskLevel } from "@/lib/types";

type ComparisonPanelProps = {
  watchlist: string[];
};

const MAX_COMPARISON_ITEMS = 4;

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-emerald-300/15 text-emerald-100",
  medium: "bg-amber-200/15 text-amber-100",
  high: "bg-rose-300/15 text-rose-100"
};

function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })}${suffix}`;
}

export function ComparisonPanel({ watchlist }: ComparisonPanelProps) {
  const defaultSelection = useMemo(() => watchlist.slice(0, Math.min(2, watchlist.length)), [watchlist]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(defaultSelection);
  const [results, setResults] = useState<ComparisonData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedSymbols((current) => {
      const stillAvailable = current.filter((symbol) => watchlist.includes(symbol)).slice(0, MAX_COMPARISON_ITEMS);
      if (stillAvailable.length > 0) {
        return stillAvailable;
      }
      return watchlist.slice(0, Math.min(2, watchlist.length));
    });
  }, [watchlist]);

  useEffect(() => {
    if (selectedSymbols.length === 0) {
      setResults([]);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);

    Promise.all(selectedSymbols.map((symbol) => getComparisonData(symbol)))
      .then((items) => {
        if (isCurrent) {
          setResults(items);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedSymbols]);

  function toggleSymbol(symbol: string) {
    setSelectedSymbols((current) => {
      if (current.includes(symbol)) {
        return current.filter((item) => item !== symbol);
      }

      if (current.length >= MAX_COMPARISON_ITEMS) {
        return current;
      }

      return [...current, symbol];
    });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">Comparison view</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Symbol comparison</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Compare 2 to 4 watchlist symbols using neutral indicator and risk metrics.
          </p>
        </div>
        <p className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-300">
          {selectedSymbols.length}/{MAX_COMPARISON_ITEMS} selected
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {watchlist.map((symbol) => {
          const selected = selectedSymbols.includes(symbol);
          const disabled = !selected && selectedSymbols.length >= MAX_COMPARISON_ITEMS;

          return (
            <button
              key={symbol}
              type="button"
              onClick={() => toggleSymbol(symbol)}
              disabled={disabled}
              className={`rounded-full border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? "border-teal-200/40 bg-teal-200/15 text-teal-100"
                  : "border-white/10 bg-black/20 text-zinc-300 hover:border-amber-200/40 hover:bg-amber-200/10"
              }`}
            >
              {symbol}
            </button>
          );
        })}
      </div>

      {watchlist.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
          Add symbols to the watchlist before comparing.
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {selectedSymbols.map((symbol) => (
            <div key={symbol} className="h-72 animate-pulse rounded-2xl border border-white/10 bg-black/20 p-5" />
          ))}
        </div>
      ) : null}

      {!isLoading && selectedSymbols.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {results.map((item) => (
            <article key={item.symbol} className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black text-white">{item.symbol}</h3>
                {item.risk ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${riskStyles[item.risk.risk_level]}`}>
                    {item.risk.risk_level}
                  </span>
                ) : null}
              </div>

              {item.error ? (
                <p className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm leading-6 text-rose-50">
                  {item.error}
                </p>
              ) : (
                <dl className="mt-4 space-y-3 text-sm">
                  <Metric label="Latest close" value={formatNumber(item.market?.latest_close)} />
                  <Metric label="Change %" value={formatNumber(item.market?.price_change_percentage, "%")} />
                  <Metric label="Trend" value={item.indicators?.trend ?? "-"} capitalize />
                  <Metric label="RSI 14" value={formatNumber(item.indicators?.rsi_14)} />
                  <Metric label="MACD histogram" value={formatNumber(item.indicators?.macd_histogram)} />
                  <Metric label="Risk Level" value={item.risk?.risk_level ?? "-"} capitalize />
                  <Metric label="Daily volatility" value={formatNumber(item.risk?.daily_volatility_percent, "%")} />
                  <Metric label="Annualized volatility" value={formatNumber(item.risk?.annualized_volatility_percent, "%")} />
                  <Metric label="Max drawdown" value={formatNumber(item.risk?.max_drawdown_percent, "%")} />
                </dl>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`text-right font-bold text-zinc-100 ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
