type MetricCardProps = {
  label: string;
  value: string;
  note: string;
};

export function MetricCard({ label, value, note }: MetricCardProps) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-white/75 p-5 shadow-[var(--shadow-panel)]">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-brand)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{note}</p>
    </div>
  );
}
