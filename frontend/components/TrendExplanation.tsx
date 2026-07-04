import type { IndicatorSummary } from "@/lib/types";

type TrendExplanationProps = {
  indicators: IndicatorSummary;
};

const trendStyles = {
  bullish: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  bearish: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  neutral: "border-amber-200/30 bg-amber-200/10 text-amber-100"
};

export function TrendExplanation({ indicators }: TrendExplanationProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">Trend explanation</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Analysis summary</h2>
        </div>
        <span className={`w-fit rounded-full border px-4 py-2 text-sm font-black capitalize ${trendStyles[indicators.trend]}`}>
          {indicators.trend}
        </span>
      </div>

      <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300">{indicators.explanation}</p>
      <p className="mt-4 text-sm font-semibold text-amber-100">
        Educational analysis only. Not financial advice. No broker execution or real-money trading is included.
      </p>
    </section>
  );
}
