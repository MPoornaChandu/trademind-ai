type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section className="rounded-3xl border border-rose-300/20 bg-rose-300/10 p-6 text-rose-50 backdrop-blur-xl">
      <p className="text-sm font-bold uppercase text-rose-200">Could not load analysis</p>
      <p className="mt-3 text-base leading-7 text-rose-50">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-2xl bg-rose-100 px-4 py-2 text-sm font-bold text-rose-950 transition hover:bg-white"
      >
        Try again
      </button>
    </section>
  );
}
