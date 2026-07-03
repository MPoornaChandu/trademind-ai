"use client";

type WatchlistPanelProps = {
  activeSymbol: string;
  watchlist: string[];
  onAddCurrent: () => void;
  onRemove: (symbol: string) => void;
  onSelect: (symbol: string) => void;
};

export const DEFAULT_WATCHLIST = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"];
export const MAX_WATCHLIST_ITEMS = 8;

export function WatchlistPanel({
  activeSymbol,
  watchlist,
  onAddCurrent,
  onRemove,
  onSelect
}: WatchlistPanelProps) {
  const normalizedActive = activeSymbol.trim().toUpperCase();
  const isAlreadySaved = watchlist.includes(normalizedActive);
  const isFull = watchlist.length >= MAX_WATCHLIST_ITEMS;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">Local watchlist</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Saved symbols</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Stored only in this browser. No account or database is used.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddCurrent}
          disabled={!normalizedActive || isAlreadySaved || isFull}
          className="h-11 rounded-2xl bg-amber-200 px-4 text-sm font-bold text-zinc-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isAlreadySaved ? "Already saved" : isFull ? "Watchlist full" : "Add current"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {watchlist.map((item) => (
          <div key={item} className="group flex items-center gap-2 rounded-full border border-white/10 bg-black/25 p-1">
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="rounded-full px-3 py-2 text-xs font-bold text-zinc-100 transition hover:bg-teal-200/10 hover:text-teal-100"
            >
              {item}
            </button>
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="mr-1 rounded-full px-2 py-1 text-xs font-bold text-zinc-500 transition hover:bg-rose-300/15 hover:text-rose-100"
              aria-label={`Remove ${item}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs font-medium text-zinc-500">
        {watchlist.length}/{MAX_WATCHLIST_ITEMS} symbols saved
      </p>
    </section>
  );
}
