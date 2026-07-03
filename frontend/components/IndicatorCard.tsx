import type { IndicatorSummary } from "@/lib/types";

type IndicatorCardProps = {
  indicators: IndicatorSummary;
};

function formatIndicator(value: number | null): string {
  if (value === null) {
    return "Not enough data";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

export function IndicatorCard({ indicators }: IndicatorCardProps) {
  const items: Array<[string, number | null]> = [
    ["SMA 20", indicators.sma_20],
    ["SMA 50", indicators.sma_50],
    ["EMA 20", indicators.ema_20],
    ["RSI 14", indicators.rsi_14],
    ["MACD", indicators.macd],
    ["MACD signal", indicators.macd_signal],
    ["MACD histogram", indicators.macd_histogram]
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">
      <div className="mb-5">
        <p className="text-sm font-medium text-zinc-400">Technical indicators</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Momentum snapshot</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-teal-200/30 hover:bg-white/[0.08]">
            <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
            <p className="mt-2 text-xl font-black text-white">{formatIndicator(value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
