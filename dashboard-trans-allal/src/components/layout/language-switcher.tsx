'use client';

import { Languages } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ManagementActionButton } from '../shared/management-ui';
import { cn } from '../../lib/utils/cn';

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <ManagementActionButton
      onClick={toggle}
      loading={isPending}
      tone="neutral"
      size="md"
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={cn(
        'rounded-2xl bg-white/72 px-3 py-2 text-sm font-medium text-[var(--color-ink)] shadow-sm',
        className,
      )}
    >
      {!isPending ? (
        <Languages size={16} className="text-[var(--color-brand)]" />
      ) : null}
      <span className="hidden sm:inline">
        {locale === 'ar' ? 'English' : 'العربية'}
      </span>
      <span className="sm:hidden">{locale === 'ar' ? 'EN' : 'AR'}</span>
    </ManagementActionButton>
  );
}
