import type { MarketSummary } from "@/lib/types";

type MarketSummaryCardProps = {
  market: MarketSummary;
};

function formatPrice(value: number, currency: string | null): string {
  const prefix = currency ? `${currency} ` : "";
  return `${prefix}${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })}`;
}

export function MarketSummaryCard({ market }: MarketSummaryCardProps) {
  const isPositive = market.price_change >= 0;

  const stats = [
    ["Previous close", formatPrice(market.previous_close, market.currency)],
    ["Price change", `${isPositive ? "+" : ""}${market.price_change.toFixed(2)}`],
    ["Change %", `${isPositive ? "+" : ""}${market.price_change_percentage.toFixed(2)}%`],
    ["Candles loaded", market.candles_loaded.toString()],
    ["Last updated", market.last_updated]
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 shadow-glow backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">Market summary</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{market.symbol}</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isPositive ? "bg-emerald-300/15 text-emerald-200" : "bg-rose-300/15 text-rose-200"
          }`}
        >
          {isPositive ? "Positive" : "Negative"}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-sm text-zinc-400">Latest close</p>
        <p className="mt-1 text-4xl font-black tracking-normal text-white">
          {formatPrice(market.latest_close, market.currency)}
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <dt className="text-xs font-medium uppercase text-zinc-500">{label}</dt>
            <dd className="mt-1 text-sm font-bold text-zinc-100">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
