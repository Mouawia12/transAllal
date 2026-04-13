'use client';

import { Languages } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const toggle = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    router.refresh();
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/70 px-3.5 py-2.5 text-sm font-medium text-[var(--color-ink)] shadow-sm transition-colors hover:bg-white"
    >
      <Languages size={16} className="text-[var(--color-brand)]" />
      {locale === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}
