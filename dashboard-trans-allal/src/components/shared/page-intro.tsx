type PageIntroProps = {
  title: string;
  summary: string;
};

export function PageIntro({ title, summary }: PageIntroProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--color-brand)]">
        Workspace Ready
      </p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
      <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted)] md:text-base">
        {summary}
      </p>
    </div>
  );
}
