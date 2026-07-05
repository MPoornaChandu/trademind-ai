import type { RankingConfidence, RankingReport, RiskLevel } from "@/lib/types";

type SetupRankingCardProps = {
  ranking: RankingReport | null;
  warning: string | null;
};

const riskStyles: Record<RiskLevel, string> = {
  low: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  medium: "border-amber-200/30 bg-amber-200/10 text-amber-100",
  high: "border-rose-300/30 bg-rose-300/10 text-rose-100"
};

const confidenceStyles: Record<RankingConfidence, string> = {
  high: "border-teal-200/30 bg-teal-200/10 text-teal-100",
  medium: "border-sky-200/30 bg-sky-200/10 text-sky-100",
  low: "border-zinc-300/20 bg-zinc-300/10 text-zinc-200"
};

const subscoreLabels: Record<keyof RankingReport["subscores"], string> = {
  trend_score: "Trend",
  momentum_score: "Momentum",
  rsi_score: "RSI",
  macd_score: "MACD",
  volatility_score: "Volatility",
  drawdown_score: "Drawdown",
  risk_score: "Risk"
};

function ListBlock({ title, items, tone = "teal" }: { title: string; items: string[]; tone?: "teal" | "amber" | "rose" }) {
  const dotStyles = {
    teal: "bg-teal-200",
    amber: "bg-amber-200",
    rose: "bg-rose-200"
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotStyles[tone]}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SetupRankingCard({ ranking, warning }: SetupRankingCardProps) {
  if (!ranking?.subscores) {
    return (
      <section className="rounded-3xl border border-amber-200/20 bg-amber-200/10 p-6 text-amber-50 backdrop-blur-xl">
        <p className="text-sm font-bold uppercase text-amber-100">Setup ranking unavailable</p>
        <p className="mt-3 text-sm leading-6 text-amber-50">
          {warning ?? "Market data loaded, but the educational setup ranking could not be loaded."}
        </p>
      </section>
    );
  }

  const subscores = Object.entries(ranking.subscores) as [keyof RankingReport["subscores"], number][];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">Setup quality engine</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Deterministic ranking</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            The score is calculated from indicators and risk metrics. Educational explanations describe the math.
          </p>
        </div>

        <div className="grid min-w-64 grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-teal-200/20 bg-teal-200/10 p-4">
            <p className="text-xs font-bold uppercase text-teal-100">Score</p>
            <p className="mt-1 text-3xl font-black text-white">{ranking.score}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${confidenceStyles[ranking.confidence]}`}>
            <p className="text-xs font-bold uppercase">Confidence</p>
            <p className="mt-2 text-sm font-black capitalize">{ranking.confidence}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${riskStyles[ranking.risk_level]}`}>
            <p className="text-xs font-bold uppercase">Risk</p>
            <p className="mt-2 text-sm font-black capitalize">{ranking.risk_level}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="text-sm font-bold uppercase text-zinc-500">Setup quality</p>
        <p className="mt-3 text-xl font-black capitalize text-amber-100">{ranking.setup_quality}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {subscores.map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase text-zinc-500">{subscoreLabels[key]}</p>
              <p className="text-sm font-black text-white">{value}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-teal-200" style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ListBlock title="Reasons" items={ranking.reasons} />
        <ListBlock title="Risk warnings" items={ranking.warnings} tone="amber" />
        <ListBlock title="What could go wrong" items={ranking.what_could_go_wrong} tone="rose" />
      </div>

      <p className="mt-5 text-sm font-semibold text-amber-100">{ranking.disclaimer}</p>
    </section>
  );
}
