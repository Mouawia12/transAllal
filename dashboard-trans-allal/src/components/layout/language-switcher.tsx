'use client';

import { Globe2, LoaderCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ManagementActionButton } from '../shared/management-ui';
import { cn } from '../../lib/utils/cn';

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
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

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-busy={isPending || undefined}
        aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        title={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/72 text-[var(--color-brand)] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none',
          className,
        )}
      >
        {isPending ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Globe2 size={18} strokeWidth={2.2} aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <ManagementActionButton
      onClick={toggle}
      loading={isPending}
      tone="neutral"
      size="md"
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={cn(
        'rounded-2xl bg-white/72 text-sm font-medium text-[var(--color-ink)] shadow-sm',
        compact ? 'h-10 w-10 px-0 py-0' : 'px-3 py-2',
        className,
      )}
      title={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      {!isPending ? (
        <Globe2 size={16} className="text-[var(--color-brand)]" />
      ) : null}
      <span className="hidden sm:inline">
        {locale === 'ar' ? 'English' : 'العربية'}
      </span>
      <span className="sm:hidden">{locale === 'ar' ? 'EN' : 'AR'}</span>
    </ManagementActionButton>
  );
}
