import type { RiskLevel, RiskReport } from "@/lib/types";

type RiskManagementCardProps = {
  risk: RiskReport | null;
  warning: string | null;
};

const riskStyles: Record<RiskLevel, string> = {
  low: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  medium: "border-amber-200/30 bg-amber-200/10 text-amber-100",
  high: "border-rose-300/30 bg-rose-300/10 text-rose-100"
};

function formatNumber(value: number, suffix = ""): string {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })}${suffix}`;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RiskManagementCard({ risk, warning }: RiskManagementCardProps) {
  if (!risk) {
    return (
      <section className="rounded-3xl border border-amber-200/20 bg-amber-200/10 p-6 text-amber-50 backdrop-blur-xl">
        <p className="text-sm font-bold uppercase text-amber-100">Risk analysis unavailable</p>
        <p className="mt-3 text-sm leading-6 text-amber-50">
          {warning ?? "Market data loaded, but the educational risk section could not be loaded."}
        </p>
      </section>
    );
  }

  const metrics = [
    ["Daily volatility", formatNumber(risk.daily_volatility_percent, "%")],
    ["Annualized volatility", formatNumber(risk.annualized_volatility_percent, "%")],
    ["ATR 14", formatNumber(risk.atr_14)],
    ["Recent high", formatNumber(risk.recent_high)],
    ["Recent low", formatNumber(risk.recent_low)],
    ["From recent high", formatNumber(risk.distance_from_recent_high_percent, "%")],
    ["From recent low", formatNumber(risk.distance_from_recent_low_percent, "%")],
    ["Max drawdown", formatNumber(risk.max_drawdown_percent, "%")]
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">Risk management agent</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Risk condition overview</h2>
        </div>
        <span className={`w-fit rounded-full border px-4 py-2 text-sm font-black capitalize ${riskStyles[risk.risk_level]}`}>
          {risk.risk_level} risk
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
            <p className="mt-2 text-lg font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="text-sm font-bold uppercase text-zinc-500">Risk explanation</p>
        <p className="mt-3 text-base leading-7 text-zinc-200">{risk.risk_explanation}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListBlock title="Risk notes" items={risk.risk_notes} />
        <ListBlock title="Learning points" items={risk.learning_points} />
      </div>

      <p className="mt-5 text-sm font-semibold text-amber-100">{risk.disclaimer}</p>
    </section>
  );
}
