export function LoadingState() {
  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="mt-6 h-10 w-56 rounded bg-white/10" />
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="h-20 rounded-2xl bg-white/10" />
            <div className="h-20 rounded-2xl bg-white/10" />
            <div className="h-20 rounded-2xl bg-white/10" />
            <div className="h-20 rounded-2xl bg-white/10" />
          </div>
        </div>
      ))}
    </section>
  );
}
