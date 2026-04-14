'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import {
  Activity,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LanguageSwitcher } from './language-switcher';
import { CompanySwitcher } from './company-switcher';
import { ManagementActionButton } from '../shared/management-ui';
import { BrandLogo } from '../shared/brand-logo';
import { cn } from '../../lib/utils/cn';
import { useAuthStore } from '../../lib/auth/auth-store';
import { buildSignInHref, getCurrentAppPath } from '../../lib/auth/navigation';

interface TopbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function TopbarIconButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Topbar({ isSidebarOpen, onToggleSidebar }: TopbarProps) {
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
    <header className="sticky top-0 z-20 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-3 py-2.5 shadow-[0_18px_45px_rgba(23,18,14,0.08)] backdrop-blur md:rounded-[26px] md:px-3.5 md:py-3">
      <div className="flex flex-wrap items-center gap-2.5 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TopbarIconButton
            onClick={onToggleSidebar}
            className="border-[var(--color-border)] bg-white/72 text-[var(--color-muted)] hover:bg-white"
            aria-controls="dashboard-sidebar"
            aria-expanded={isSidebarOpen}
            aria-label={t(
              isSidebarOpen
                ? 'dashboard_shell.hide_sidebar'
                : 'dashboard_shell.show_sidebar',
            )}
            title={t(
              isSidebarOpen
                ? 'dashboard_shell.hide_sidebar'
                : 'dashboard_shell.show_sidebar',
            )}
          >
            {isSidebarOpen ? (
              <ChevronsLeft size={16} />
            ) : (
              <ChevronsRight size={16} />
            )}
          </TopbarIconButton>

          <div className="inline-flex items-center gap-2 rounded-[20px] border border-[var(--color-border)] bg-white/82 px-2 py-1 shadow-sm">
            <BrandLogo
              size={44}
              className="rounded-2xl border-[var(--color-border)] bg-white shadow-none"
            />
            <span className="hidden text-sm font-semibold tracking-tight text-[var(--color-ink)] md:inline">
              Trans Allal
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--color-ink)] md:text-xl">
              {tNav(currentSection as Parameters<typeof tNav>[0])}
            </h1>
          </div>

          <span
            aria-live="polite"
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
              isSyncing
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
            aria-label={t(
              isSyncing
                ? 'dashboard_shell.syncing_badge'
                : 'dashboard_shell.live_badge',
            )}
            title={t(
              isSyncing
                ? 'dashboard_shell.syncing_badge'
                : 'dashboard_shell.live_badge',
            )}
          >
            <Activity
              size={16}
              className={isSyncing ? 'animate-pulse' : undefined}
            />
          </span>
        </div>

        <CompanySwitcher compact className="min-w-0 flex-1 xl:w-[260px] xl:flex-none" />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {user ? (
            <div
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/72 px-2.5 shadow-sm"
              title={`${user.firstName} ${user.lastName}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[rgba(12,107,88,0.08)] text-sm font-semibold text-[var(--color-brand)]">
                {initials || <UserCircle2 size={15} />}
              </div>
              <span className="hidden max-w-[110px] truncate text-sm font-medium text-[var(--color-ink)] lg:inline">
                {user.firstName}
              </span>
            </div>
          ) : null}

          <div
            className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/72 text-[var(--color-muted)] shadow-sm sm:inline-flex"
            aria-label={t('dashboard_shell.secure_session')}
            title={t('dashboard_shell.secure_session')}
          >
            <ShieldCheck size={16} className="text-[var(--color-brand)]" />
          </div>

          <LanguageSwitcher compact />

          <TopbarIconButton
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            aria-label={t('sign_out')}
            title={t('sign_out')}
          >
            {isLoggingOut ? (
              <Activity size={16} className="animate-spin" />
            ) : (
              <LogOut size={18} strokeWidth={2.2} />
            )}
          </TopbarIconButton>
        </div>
      </div>
    </header>
  );
}
