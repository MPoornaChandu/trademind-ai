"use client";

type SymbolSearchProps = {
  symbol: string;
  isLoading: boolean;
  onSymbolChange: (symbol: string) => void;
  onSubmit: () => void;
  onQuickSelect: (symbol: string) => void;
};

const QUICK_SYMBOLS = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"];

export function SymbolSearch({
  symbol,
  isLoading,
  onSymbolChange,
  onSubmit,
  onQuickSelect
}: SymbolSearchProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 shadow-glow backdrop-blur-xl md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="symbol">
            Stock symbol
          </label>
          <input
            id="symbol"
            value={symbol}
            onChange={(event) => onSymbolChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSubmit();
              }
            }}
            className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-base font-semibold uppercase text-white outline-none transition focus:border-teal-300/70 focus:ring-4 focus:ring-teal-300/10"
            placeholder="RELIANCE.NS"
            disabled={isLoading}
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !symbol.trim()}
          className="h-12 rounded-2xl bg-teal-300 px-6 text-sm font-bold text-zinc-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {QUICK_SYMBOLS.map((quickSymbol) => (
          <button
            key={quickSymbol}
            type="button"
            onClick={() => onQuickSelect(quickSymbol)}
            disabled={isLoading}
            className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-200/50 hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {quickSymbol}
          </button>
        ))}
      </div>
    </section>
  );
}
