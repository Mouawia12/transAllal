type SectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur">
      <div className="mb-5 space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-brand)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
