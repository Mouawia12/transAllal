'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { LogOut, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LanguageSwitcher } from './language-switcher';
import { CompanySwitcher } from './company-switcher';
import { ManagementActionButton } from '../shared/management-ui';
import { useAuthStore } from '../../lib/auth/auth-store';
import { buildSignInHref, getCurrentAppPath } from '../../lib/auth/navigation';

export function Topbar() {
  const t = useTranslations();
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const activeFetches = useIsFetching();
  const activeMutations = useIsMutating();
  const { user, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isSyncing = activeFetches > 0 || activeMutations > 0;

  const currentSection =
    pathname === '/' ? 'overview' : pathname.split('/')[1] ?? 'overview';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace(buildSignInHref(getCurrentAppPath(), 'signed-out'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.trim();

  return (
    <header className="sticky top-0 z-20 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-3 py-3 shadow-[0_18px_45px_rgba(23,18,14,0.08)] backdrop-blur md:rounded-[26px] md:px-4 md:py-3.5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--color-brand)]">
              {t('dashboard_shell.topbar_eyebrow')}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--color-ink)] md:text-2xl">
                {tNav(currentSection as Parameters<typeof tNav>[0])}
              </h1>
              <span
                aria-live="polite"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                  isSyncing
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSyncing ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                {t(
                  isSyncing
                    ? 'dashboard_shell.syncing_badge'
                    : 'dashboard_shell.live_badge',
                )}
              </span>
            </div>
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-[var(--color-muted)] lg:block">
              {t('dashboard_shell.topbar_summary')}
            </p>
          </div>

          {user ? (
            <div className="hidden items-center gap-2.5 rounded-2xl border border-[var(--color-border)] bg-white/70 px-3 py-2 shadow-sm lg:flex">
              <div className="rounded-2xl bg-[rgba(12,107,88,0.08)] p-2 text-[var(--color-brand)]">
                <UserCircle2 size={17} />
              </div>
              <div
                className="min-w-0 max-w-[220px] leading-tight"
                title={`${user.firstName} ${user.lastName}`}
              >
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                  {user.firstName} {user.lastName}
                </p>
                <p
                  className="mt-1 truncate text-xs text-[var(--color-muted)]"
                  title={t(`roles.${user.role}` as Parameters<typeof t>[0])}
                >
                  {t(`roles.${user.role}` as Parameters<typeof t>[0])}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
          <CompanySwitcher className="md:max-w-[360px]" />

          {user ? (
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-[var(--color-border)] bg-white/72 px-3 py-2 shadow-sm lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgba(12,107,88,0.08)] text-sm font-semibold text-[var(--color-brand)]">
                {initials || <UserCircle2 size={16} />}
              </div>
              <div className="min-w-0 max-w-[140px] leading-tight" title={user.firstName}>
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                  {user.firstName}
                </p>
                <p
                  className="mt-1 truncate text-xs text-[var(--color-muted)]"
                  title={t(`roles.${user.role}` as Parameters<typeof t>[0])}
                >
                  {t(`roles.${user.role}` as Parameters<typeof t>[0])}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <LanguageSwitcher />

            <div className="hidden items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/72 px-3 py-2 text-xs font-medium text-[var(--color-muted)] shadow-sm xl:inline-flex">
              <ShieldCheck size={15} className="text-[var(--color-brand)]" />
              <span>{t('dashboard_shell.secure_session')}</span>
            </div>

            <ManagementActionButton
              onClick={handleLogout}
              loading={isLoggingOut}
              tone="danger"
              size="md"
              className="rounded-2xl px-3 py-2 text-sm"
              aria-label={t('sign_out')}
            >
              {!isLoggingOut ? <LogOut size={16} /> : null}
              <span className="hidden sm:inline">{t('sign_out')}</span>
            </ManagementActionButton>
          </div>
        </div>
      </div>
    </header>
  );
}
