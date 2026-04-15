'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { cn } from '../../lib/utils/cn';
import { realtimeClient, type OnlineChangedEvent } from '../../lib/api/realtime-client';
import { useCompanyScope } from '../../lib/company/use-company-scope';
import type { ApiResponse, Driver } from '../../types/shared';

const SIDEBAR_STORAGE_KEY = 'trans-allal:dashboard-sidebar-open';

export type DriverNotification = {
  id: string;
  driverId: string;
  driverName: string;
  isOnline: boolean;
  at: Date;
  read: boolean;
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const { companyId } = useCompanyScope();
  const qc = useQueryClient();

  useEffect(() => {
    const storedPreference = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedPreference === '0') {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      isSidebarOpen ? '1' : '0',
    );
  }, [isSidebarOpen]);

  // Request browser notification permission once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Subscribe to company room and keep drivers list in sync with real-time events
  useEffect(() => {
    if (!companyId) return;

    realtimeClient.subscribeToCompany(companyId);

    const handleOnlineChanged = (event: OnlineChangedEvent) => {
      // Update every cached page of the drivers query without a round-trip
      qc.setQueriesData<ApiResponse<Driver[]>>(
        { queryKey: ['drivers', companyId] },
        (old) => {
          if (!old) return old;

          // Find driver name for the notification
          const driver = old.data.find((d) => d.id === event.driverId);
          const driverName = driver
            ? `${driver.firstName} ${driver.lastName}`.trim()
            : 'سائق';

          // Add to in-app notification list (keep last 20)
          const newNotif: DriverNotification = {
            id: `${event.driverId}-${Date.now()}`,
            driverId: event.driverId,
            driverName,
            isOnline: event.isOnline,
            at: new Date(),
            read: false,
          };
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));

          // Show browser notification if permission granted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(
              event.isOnline ? 'سائق متصل' : 'سائق غير متصل',
              {
                body: event.isOnline
                  ? `${driverName} بدأ البث الآن`
                  : `${driverName} قطع الاتصال`,
                icon: '/favicon.ico',
                tag: `driver-${event.driverId}`,
              },
            );
          }

          return {
            ...old,
            data: old.data.map((d) =>
              d.id === event.driverId
                ? {
                    ...d,
                    isOnline: event.isOnline,
                    lastSeenAt: event.lastSeenAt,
                    sessionStartedAt: event.sessionStartedAt,
                  }
                : d,
            ),
          };
        },
      );
    };

    realtimeClient.onOnlineChanged(handleOnlineChanged);

    return () => {
      realtimeClient.offOnlineChanged(handleOnlineChanged);
    };
  }, [companyId, qc]);

  return (
    <div className="relative min-h-screen overflow-hidden px-2.5 py-2.5 sm:px-3 sm:py-3 md:px-4 md:py-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[rgba(12,107,88,0.12)] blur-3xl" />
        <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-[rgba(201,95,58,0.12)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-white/35 blur-3xl" />
      </div>

      <div
        className={cn(
          'relative mx-auto grid max-w-[1600px] gap-2.5 lg:h-[calc(100dvh-2rem)] lg:gap-3',
          isSidebarOpen
            ? 'lg:grid-cols-[280px_minmax(0,1fr)]'
            : 'lg:grid-cols-[minmax(0,1fr)]',
        )}
      >
        {isSidebarOpen ? (
          <Sidebar onHide={() => setIsSidebarOpen(false)} />
        ) : null}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-panel-muted)] p-2.5 shadow-[var(--shadow-elevated)] backdrop-blur sm:rounded-[28px] sm:p-3 md:rounded-[30px] md:p-4 lg:h-full">
          <Topbar
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
          />
          <main className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden sm:mt-4 sm:pr-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
