import type { AIAnalysis, AnalysisSource } from "@/lib/types";

type AIAnalysisCardProps = {
  analysis: AIAnalysis | null;
  warning: string | null;
};

const sourceLabels: Record<AnalysisSource, string> = {
  gemini: "Gemini",
  rule_based: "Rule-based",
  fallback_after_ai_error: "Fallback",
  ollama: "Ollama",
  cloud: "Cloud"
};

const sourceStyles: Record<AnalysisSource, string> = {
  gemini: "border-teal-200/30 bg-teal-200/10 text-teal-100",
  rule_based: "border-amber-200/30 bg-amber-200/10 text-amber-100",
  fallback_after_ai_error: "border-rose-200/30 bg-rose-200/10 text-rose-100",
  ollama: "border-sky-200/30 bg-sky-200/10 text-sky-100",
  cloud: "border-violet-200/30 bg-violet-200/10 text-violet-100"
};

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-200" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AIAnalysisCard({ analysis, warning }: AIAnalysisCardProps) {
  if (!analysis) {
    return (
      <section className="rounded-3xl border border-amber-200/20 bg-amber-200/10 p-6 text-amber-50 backdrop-blur-xl">
        <p className="text-sm font-bold uppercase text-amber-100">AI analysis unavailable</p>
        <p className="mt-3 text-sm leading-6 text-amber-50">
          {warning ?? "Market and indicator data loaded, but the educational analysis section could not be loaded."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">AI analysis agent</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Educational explanation</h2>
        </div>
        <span className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${sourceStyles[analysis.source]}`}>
          {analysis.provider_used ?? sourceLabels[analysis.source]}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="text-sm font-bold uppercase text-zinc-500">Summary</p>
        <p className="mt-3 text-base leading-7 text-zinc-200">{analysis.summary}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="text-sm font-bold uppercase text-zinc-500">Trend interpretation</p>
        <p className="mt-3 text-base leading-7 text-zinc-200">{analysis.trend_interpretation}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BulletList title="Indicator explanation" items={analysis.indicator_explanation} />
        <BulletList title="Risk notes" items={analysis.risk_notes} />
        <BulletList title="Learning points" items={analysis.learning_points} />
      </div>

      <p className="mt-5 text-sm font-semibold text-amber-100">{analysis.disclaimer}</p>
    </section>
  );
}
