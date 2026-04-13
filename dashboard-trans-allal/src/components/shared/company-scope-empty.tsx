'use client';

import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CompanyScopeEmpty() {
  const t = useTranslations();

  return (
    <div className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-[var(--color-panel-strong)] p-8 text-center shadow-[var(--shadow-panel)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]">
        <Building2 size={24} />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-[var(--color-ink)]">
        {t('company_scope.empty_title')}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-muted)]">
        {t('company_scope.empty_description')}
      </p>
    </div>
  );
}
