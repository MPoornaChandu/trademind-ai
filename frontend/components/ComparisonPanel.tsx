"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchRankingComparison } from "@/lib/api";
import type { RankingCompareResponse, RiskLevel } from "@/lib/types";

type ComparisonPanelProps = {
  watchlist: string[];
};

const MAX_COMPARISON_ITEMS = 8;

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-emerald-300/15 text-emerald-100",
  medium: "bg-amber-200/15 text-amber-100",
  high: "bg-rose-300/15 text-rose-100"
};

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return value.toString();
}

export function ComparisonPanel({ watchlist }: ComparisonPanelProps) {
  const defaultSelection = useMemo(() => watchlist.slice(0, Math.min(2, watchlist.length)), [watchlist]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(defaultSelection);
  const [result, setResult] = useState<RankingCompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedSymbols((current) => {
      const stillAvailable = current.filter((symbol) => watchlist.includes(symbol)).slice(0, MAX_COMPARISON_ITEMS);
      if (stillAvailable.length >= 2) {
        return stillAvailable;
      }
      return watchlist.slice(0, Math.min(2, watchlist.length));
    });
  }, [watchlist]);

  useEffect(() => {
    if (selectedSymbols.length < 2) {
      setResult(null);
      setError(null);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    fetchRankingComparison(selectedSymbols)
      .then((rankingResult) => {
        if (isCurrent) {
          setResult(rankingResult);
        }
      })
      .catch((caughtError) => {
        if (isCurrent) {
          setResult(null);
          setError(caughtError instanceof Error ? caughtError.message : "Ranking comparison could not be loaded.");
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

  function rankCurrentWatchlist() {
    setSelectedSymbols(watchlist.slice(0, MAX_COMPARISON_ITEMS));
  }

  const topSymbol = result?.best_setup;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">Comparison view</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Symbol comparison</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Compare 2 to 8 watchlist symbols by deterministic setup score.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={rankCurrentWatchlist}
            disabled={watchlist.length < 2}
            className="h-10 rounded-2xl border border-teal-200/30 bg-teal-200/10 px-4 text-xs font-bold text-teal-100 transition hover:bg-teal-200/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            Rank current watchlist
          </button>
          <p className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-300">
            {selectedSymbols.length}/{MAX_COMPARISON_ITEMS} selected
          </p>
        </div>
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

      {watchlist.length === 1 ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
          Add one more symbol to compare setup quality.
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          {selectedSymbols.map((symbol) => (
            <div key={symbol} className="h-10 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      ) : null}

      {!isLoading && error ? (
        <p className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm leading-6 text-rose-50">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && result ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          {topSymbol ? (
            <div className="border-b border-white/10 bg-teal-200/10 px-4 py-3 text-sm font-bold text-teal-100">
              Strongest setup in this comparison: {topSymbol}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Setup quality</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Risk level</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {result.rankings.map((item) => {
                  const isTop = item.symbol === topSymbol && item.rank === 1;

                  return (
                    <tr key={item.symbol} className={isTop ? "bg-teal-200/[0.06]" : ""}>
                      <td className="px-4 py-4 font-black text-white">{item.rank ?? "-"}</td>
                      <td className="px-4 py-4 font-black text-white">{item.symbol}</td>
                      <td className="px-4 py-4 text-lg font-black text-amber-100">{formatScore(item.score)}</td>
                      <td className="px-4 py-4 capitalize text-zinc-200">{item.setup_quality ?? "-"}</td>
                      <td className="px-4 py-4 capitalize text-zinc-200">{item.confidence ?? "-"}</td>
                      <td className="px-4 py-4">
                        {item.risk_level ? (
                          <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${riskStyles[item.risk_level]}`}>
                            {item.risk_level}
                          </span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-zinc-400">
                        {item.error ?? item.reasons[0] ?? item.warnings[0] ?? "No note available."}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="border-t border-white/10 px-4 py-3 text-xs font-semibold text-amber-100">{result.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}
