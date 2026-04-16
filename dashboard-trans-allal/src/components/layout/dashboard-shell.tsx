'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { cn } from '../../lib/utils/cn';
import {
  realtimeClient,
  type OnlineChangedEvent,
  type TripStatusChangedEvent,
} from '../../lib/api/realtime-client';
import { useCompanyScope } from '../../lib/company/use-company-scope';
import type { ApiResponse, Driver } from '../../types/shared';

const SIDEBAR_STORAGE_KEY = 'trans-allal:dashboard-sidebar-open';

export type DashboardNotification = {
  id: string;
  kind:
    | 'driver-online'
    | 'driver-offline'
    | 'trip-started'
    | 'trip-completed';
  title: string;
  description: string;
  at: Date;
  read: boolean;
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
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

  const pushNotification = useCallback(
    ({
      kind,
      title,
      description,
      tag,
      at,
    }: {
      kind: DashboardNotification['kind'];
      title: string;
      description: string;
      tag: string;
      at?: Date;
    }) => {
      const nextNotification: DashboardNotification = {
        id: `${tag}-${Date.now()}`,
        kind,
        title,
        description,
        at: at ?? new Date(),
        read: false,
      };

      setNotifications((prev) => [nextNotification, ...prev].slice(0, 20));

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(title, {
          body: description,
          icon: '/favicon.ico',
          tag,
        });
      }
    },
    [],
  );

  const resolveDriverName = useCallback(
    (driverId: string | null): string => {
      if (!driverId || !companyId) {
        return t('dashboard_shell.driver_unknown');
      }

      const cachedQueries = qc.getQueriesData<ApiResponse<Driver[]>>({
        queryKey: ['drivers', companyId],
      });

      for (const [, queryData] of cachedQueries) {
        const driver = queryData?.data?.find((item) => item.id === driverId);
        if (driver) {
          return `${driver.firstName} ${driver.lastName}`.trim();
        }
      }

      return t('dashboard_shell.driver_unknown');
    },
    [companyId, qc, t],
  );

  // Subscribe to company room and keep drivers list in sync with real-time events
  useEffect(() => {
    if (!companyId) return;

    realtimeClient.subscribeToCompany(companyId);

    const handleOnlineChanged = (event: OnlineChangedEvent) => {
      const driverName = resolveDriverName(event.driverId);

      pushNotification({
        kind: event.isOnline ? 'driver-online' : 'driver-offline',
        title: event.isOnline
          ? t('dashboard_shell.driver_online')
          : t('dashboard_shell.driver_offline'),
        description: event.isOnline
          ? t('dashboard_shell.driver_online_description', { driverName })
          : t('dashboard_shell.driver_offline_description', { driverName }),
        tag: `driver-status-${event.driverId}-${event.isOnline ? '1' : '0'}`,
        at: event.lastSeenAt ? new Date(event.lastSeenAt) : new Date(),
      });

      // Update every cached page of the drivers query without a round-trip
      qc.setQueriesData<ApiResponse<Driver[]>>(
        { queryKey: ['drivers', companyId] },
        (old) => {
          if (!old) return old;

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

    const handleTripStatusChanged = (event: TripStatusChangedEvent) => {
      void qc.invalidateQueries({ queryKey: ['trips', companyId] });

      if (
        event.status !== 'IN_PROGRESS' &&
        event.status !== 'COMPLETED'
      ) {
        return;
      }

      const driverName =
        event.driverName?.trim() || resolveDriverName(event.driverId);
      const isStarted = event.status === 'IN_PROGRESS';

      pushNotification({
        kind: isStarted ? 'trip-started' : 'trip-completed',
        title: isStarted
          ? t('dashboard_shell.trip_started')
          : t('dashboard_shell.trip_completed'),
        description: isStarted
          ? t('dashboard_shell.trip_started_description', {
              driverName,
              origin: event.origin,
              destination: event.destination,
            })
          : t('dashboard_shell.trip_completed_description', {
              driverName,
              origin: event.origin,
              destination: event.destination,
            }),
        tag: `trip-status-${event.tripId}-${event.status}`,
        at: event.occurredAt ? new Date(event.occurredAt) : new Date(),
      });
    };

    realtimeClient.onOnlineChanged(handleOnlineChanged);
    realtimeClient.onTripStatusChanged(handleTripStatusChanged);

    return () => {
      realtimeClient.offOnlineChanged(handleOnlineChanged);
      realtimeClient.offTripStatusChanged(handleTripStatusChanged);
    };
  }, [companyId, pushNotification, qc, resolveDriverName, t]);

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
