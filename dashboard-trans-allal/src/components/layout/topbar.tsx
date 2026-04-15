'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import {
  Activity,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  ShieldCheck,
  UserCircle2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LanguageSwitcher } from './language-switcher';
import { CompanySwitcher } from './company-switcher';
import { BrandLogo } from '../shared/brand-logo';
import { cn } from '../../lib/utils/cn';
import { useAuthStore } from '../../lib/auth/auth-store';
import { buildSignInHref, getCurrentAppPath } from '../../lib/auth/navigation';
import type { DriverNotification } from './dashboard-shell';

interface TopbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  notifications: DriverNotification[];
  onMarkAllRead: () => void;
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

function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} ي`;
}

export function Topbar({ isSidebarOpen, onToggleSidebar, notifications, onMarkAllRead }: TopbarProps) {
  const t = useTranslations();
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const activeFetches = useIsFetching();
  const activeMutations = useIsMutating();
  const { user, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const isSyncing = activeFetches > 0 || activeMutations > 0;

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isNotifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNotifOpen]);

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
          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <TopbarIconButton
              onClick={() => {
                setIsNotifOpen((o) => !o);
                if (!isNotifOpen && unreadCount > 0) onMarkAllRead();
              }}
              className="relative border-[var(--color-border)] bg-white/72 text-[var(--color-muted)] hover:bg-white"
              aria-label={t('dashboard_shell.notifications')}
              title={t('dashboard_shell.notifications')}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </TopbarIconButton>

            {isNotifOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-80 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_8px_32px_rgba(23,18,14,0.12)]">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                  <span className="text-sm font-semibold text-[var(--color-ink)]">
                    {t('dashboard_shell.notifications')}
                  </span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="text-xs text-[var(--color-brand)] hover:underline"
                    >
                      {t('dashboard_shell.mark_all_read')}
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">
                      {t('dashboard_shell.no_notifications')}
                    </p>
                  ) : (
                    <ul>
                      {notifications.map((notif) => (
                        <li
                          key={notif.id}
                          className={cn(
                            'flex items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0',
                            !notif.read && 'bg-[rgba(12,107,88,0.04)]',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                              notif.isOnline
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-gray-100 text-gray-500',
                            )}
                          >
                            {notif.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                              {notif.driverName}
                            </p>
                            <p className="text-xs text-[var(--color-muted)]">
                              {notif.isOnline
                                ? t('dashboard_shell.driver_online')
                                : t('dashboard_shell.driver_offline')}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-[var(--color-muted)]">
                            {formatRelativeTime(notif.at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

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
