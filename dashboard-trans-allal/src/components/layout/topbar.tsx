'use client';

import { LogOut, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageSwitcher } from './language-switcher';
import { CompanySwitcher } from './company-switcher';
import { useAuthStore } from '../../lib/auth/auth-store';

export function Topbar() {
  const t = useTranslations();
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const currentSection =
    pathname === '/' ? 'overview' : pathname.split('/')[1] ?? 'overview';

  const handleLogout = async () => {
    await logout();
    router.replace('/sign-in');
  };

  return (
    <header className="sticky top-0 z-20 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-4 shadow-[0_18px_45px_rgba(23,18,14,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--color-brand)]">
            {t('dashboard_shell.topbar_eyebrow')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {tNav(currentSection as Parameters<typeof tNav>[0])}
            </h1>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {t('dashboard_shell.live_badge')}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            {t('dashboard_shell.topbar_summary')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <CompanySwitcher />
          <LanguageSwitcher />

          {user ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/70 px-3.5 py-2.5 shadow-sm">
              <div className="rounded-2xl bg-[rgba(12,107,88,0.08)] p-2 text-[var(--color-brand)]">
                <UserCircle2 size={18} />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {user.firstName} {user.lastName}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {t(`roles.${user.role}` as Parameters<typeof t>[0])}
                </p>
              </div>
            </div>
          ) : null}

          <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/70 px-3 py-2 text-xs font-medium text-[var(--color-muted)] shadow-sm">
            <ShieldCheck size={15} className="text-[var(--color-brand)]" />
            <span>{t('dashboard_shell.secure_session')}</span>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <LogOut size={16} />
            <span>{t('sign_out')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
