"use client";

export function ChatProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="shrink-0 overflow-hidden rounded-full bg-black/10 h-1">
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
