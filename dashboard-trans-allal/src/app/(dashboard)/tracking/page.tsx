'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Radar,
  Route as RouteIcon,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import {
  ManagementDetailTile,
  ManagementField,
  ManagementHero,
  ManagementIconBadge,
  ManagementInlineState,
  ManagementPanel,
  ManagementPageState,
  ManagementRowsSkeleton,
  ManagementSelectField,
  ManagementSegmentedControl,
  ManagementStatCard,
  ManagementSurfaceCard,
  SearchField,
  ToneBadge,
} from '../../../components/shared/management-ui';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { realtimeClient } from '../../../lib/api/realtime-client';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import { cn } from '../../../lib/utils/cn';
import type { ApiResponse, LiveDriver } from '../../../types/shared';

type Mode = 'live' | 'fleet';
type StatusFilter = 'all' | 'online' | 'offline' | 'trip';
type HistoryRange = '6h' | '24h' | '7d';

interface DriverHistoryPoint {
  id: string;
  tripId: string | null;
  lat: number;
  lng: number;
  speedKmh: number | null;
  heading: number | null;
  recordedAt: string;
}

const LiveTrackingMap = dynamic(
  () =>
    import('../../../components/maps/live-tracking-map').then(
      (module) => module.LiveTrackingMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#edf5ff_0%,#ffffff_52%,#f4f8f6_100%)] text-sm text-[var(--color-muted)]">
        Loading map…
      </div>
    ),
  },
);

function normalizeNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
}

function normalizeLiveDriver(driver: LiveDriver): LiveDriver {
  const nextDriver = driver as LiveDriver & {
    lat: number | string;
    lng: number | string;
    speedKmh: number | string | null;
    heading: number | string | null;
  };

  return {
    ...driver,
    lat: Number(nextDriver.lat),
    lng: Number(nextDriver.lng),
    speedKmh: normalizeNullableNumber(nextDriver.speedKmh),
    heading: normalizeNullableNumber(nextDriver.heading),
  };
}

function normalizeHistoryPoint(point: DriverHistoryPoint): DriverHistoryPoint {
  const nextPoint = point as DriverHistoryPoint & {
    lat: number | string;
    lng: number | string;
    speedKmh: number | string | null;
    heading: number | string | null;
  };

  return {
    ...point,
    lat: Number(nextPoint.lat),
    lng: Number(nextPoint.lng),
    speedKmh: normalizeNullableNumber(nextPoint.speedKmh),
    heading: normalizeNullableNumber(nextPoint.heading),
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTimeOnly(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatDayOnly(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function getDriverActivityLabel(
  t: ReturnType<typeof useTranslations>,
  driver: LiveDriver,
) {
  if (driver.isOnline && driver.tripId) {
    return t('tracking.in_trip');
  }

  if (driver.isOnline) {
    return t('tracking.standalone');
  }

  return t('tracking.offline');
}

function driverTone(driver: LiveDriver) {
  if (driver.isOnline && driver.tripId) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (driver.isOnline) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function markerClassName(driver: LiveDriver) {
  if (driver.isOnline && driver.tripId) {
    return 'bg-emerald-500';
  }

  if (driver.isOnline) {
    return 'bg-amber-400';
  }

  return 'bg-slate-400';
}

export default function TrackingPage() {
  const t = useTranslations();
  const { user, hasHydrated, companyId } = useCompanyScope();
  const [mode, setMode] = useState<Mode>('live');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [historyRange, setHistoryRange] = useState<HistoryRange>('24h');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [liveMap, setLiveMap] = useState<Record<string, LiveDriver>>({});
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const { data: fleetData, isLoading } = useQuery({
    queryKey: ['tracking', 'fleet', companyId],
    queryFn: () =>
      apiClient.get<ApiResponse<LiveDriver[]>>(ENDPOINTS.TRACKING_FLEET, {
        companyId,
      }),
    enabled: !!companyId,
    select: (response) => ({
      ...response,
      data: response.data.map(normalizeLiveDriver),
    }),
  });

  const historyWindow = useMemo(() => {
    const to = new Date();
    const from = new Date(to);

    if (historyRange === '6h') {
      from.setHours(from.getHours() - 6);
    } else if (historyRange === '24h') {
      from.setDate(from.getDate() - 1);
    } else {
      from.setDate(from.getDate() - 7);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }, [historyRange]);

  const { data: historyData, isLoading: historyIsLoading } = useQuery({
    queryKey: [
      'tracking',
      'history',
      selectedDriver,
      historyWindow.from,
      historyWindow.to,
    ],
    queryFn: () =>
      apiClient.get<ApiResponse<DriverHistoryPoint[]>>(
        ENDPOINTS.TRACKING_DRIVER_HISTORY(selectedDriver!),
        historyWindow,
      ),
    enabled: !!selectedDriver && !!companyId,
    select: (response) => ({
      ...response,
      data: response.data.map(normalizeHistoryPoint),
    }),
  });

  useEffect(() => {
    setSelectedDriver(null);
    setSearch('');
    setLiveMap({});
  }, [companyId]);

  useEffect(() => {
    if (!fleetData?.data) {
      return;
    }

    const nextMap: Record<string, LiveDriver> = {};
    fleetData.data.forEach((driver) => {
      nextMap[driver.driverId] = driver;
    });
    setLiveMap(nextMap);
  }, [fleetData]);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const handleLocation = (update: {
      driverId: string;
      tripId: string | null;
      lat: number;
      lng: number;
      speedKmh: number | null;
      heading: number | null;
      recordedAt: string;
    }) => {
      setLiveMap((current) => {
        const previous = current[update.driverId];
        if (!previous) {
          return current;
        }

        return {
          ...current,
          [update.driverId]: {
            ...previous,
            driverId: update.driverId,
            tripId: update.tripId,
            lat: Number(update.lat),
            lng: Number(update.lng),
            speedKmh: normalizeNullableNumber(update.speedKmh),
            heading: normalizeNullableNumber(update.heading),
            isOnline: true,
            lastSeenAt: update.recordedAt,
          },
        };
      });
    };

    const handleOnlineChanged = (event: {
      driverId: string;
      isOnline: boolean;
      lastSeenAt: string | null;
    }) => {
      setLiveMap((current) => {
        const previous = current[event.driverId];
        if (!previous) {
          return current;
        }

        return {
          ...current,
          [event.driverId]: {
            ...previous,
            isOnline: event.isOnline,
            lastSeenAt: event.lastSeenAt,
          },
        };
      });
    };

    // WS connection lifecycle is owned by Providers/DashboardShell.
    // Here we only register/unregister event handlers.
    realtimeClient.onDriverLocation(handleLocation);
    realtimeClient.onOnlineChanged(handleOnlineChanged);

    return () => {
      realtimeClient.offDriverLocation(handleLocation);
      realtimeClient.offOnlineChanged(handleOnlineChanged);
    };
  }, [companyId]);

  const allDrivers = useMemo(() => {
    const baseDrivers = Object.values(liveMap);
    return baseDrivers.sort((left, right) => {
      if (left.isOnline !== right.isOnline) {
        return Number(right.isOnline) - Number(left.isOnline);
      }

      if (Boolean(left.tripId) !== Boolean(right.tripId)) {
        return Number(Boolean(right.tripId)) - Number(Boolean(left.tripId));
      }

      return (
        new Date(right.lastSeenAt ?? 0).getTime() -
        new Date(left.lastSeenAt ?? 0).getTime()
      );
    });
  }, [liveMap]);

  const displayedDrivers = useMemo(() => {
    return allDrivers.filter((driver) => {
      if (mode === 'live' && !driver.isOnline) {
        return false;
      }

      if (statusFilter === 'online' && !driver.isOnline) {
        return false;
      }

      if (statusFilter === 'offline' && driver.isOnline) {
        return false;
      }

      if (statusFilter === 'trip' && !driver.tripId) {
        return false;
      }

      if (!deferredSearch) {
        return true;
      }

      const haystack = `${driver.firstName} ${driver.lastName}`.toLowerCase();
      return haystack.includes(deferredSearch);
    });
  }, [allDrivers, deferredSearch, mode, statusFilter]);

  const selected = useMemo(() => {
    if (!selectedDriver) {
      return null;
    }

    return liveMap[selectedDriver] ?? null;
  }, [liveMap, selectedDriver]);

  useEffect(() => {
    if (displayedDrivers.length === 0) {
      setSelectedDriver(null);
      return;
    }

    const isSelectedVisible = displayedDrivers.some(
      (driver) => driver.driverId === selectedDriver,
    );

    if (!selectedDriver || !isSelectedVisible) {
      setSelectedDriver(displayedDrivers[0].driverId);
    }
  }, [displayedDrivers, selectedDriver]);

  const summary = useMemo(() => {
    const onlineCount = allDrivers.filter((driver) => driver.isOnline).length;
    const inTripCount = allDrivers.filter((driver) => Boolean(driver.tripId)).length;

    return {
      tracked: allDrivers.length,
      online: onlineCount,
      offline: Math.max(allDrivers.length - onlineCount, 0),
      inTrip: inTripCount,
    };
  }, [allDrivers]);

  const historyPoints = historyData?.data ?? [];
  const recentHistory = historyPoints.slice().reverse();
  const activeFilterCount = [
    mode !== 'live',
    statusFilter !== 'all',
    search.trim(),
  ].filter(Boolean).length;
  const historySummary = useMemo(() => {
    if (recentHistory.length === 0) {
      return null;
    }

    const latestPoint = recentHistory[0];

    return {
      total: recentHistory.length,
      latestAt: latestPoint.recordedAt,
      latestSpeed: latestPoint.speedKmh,
      latestHeading: latestPoint.heading,
    };
  }, [recentHistory]);

  if (!hasHydrated) {
    return (
      <ManagementPageState
        title={t('ui_state.loading_title')}
        description={t('ui_state.loading_description')}
      />
    );
  }

  if (!user || !companyId) {
    return <CompanyScopeEmpty />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <ManagementHero
        eyebrow={t('tracking.eyebrow')}
        title={t('nav.tracking')}
        description={t('tracking.description')}
        className="bg-[linear-gradient(135deg,#0c1820_0%,#19334b_48%,#1e6c6b_100%)]"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ManagementStatCard
            icon={Radar}
            label={t('tracking.summary_total')}
            value={summary.tracked}
            note={t('tracking.tracked_note')}
          />
          <ManagementStatCard
            icon={Wifi}
            label={t('tracking.summary_online')}
            value={summary.online}
            note={t('tracking.online_note')}
            toneClassName="bg-emerald-400/18 text-emerald-50"
          />
          <ManagementStatCard
            icon={WifiOff}
            label={t('tracking.summary_offline')}
            value={summary.offline}
            note={t('tracking.offline_note')}
            toneClassName="bg-slate-300/18 text-slate-100"
          />
          <ManagementStatCard
            icon={RouteIcon}
            label={t('tracking.summary_in_trip')}
            value={summary.inTrip}
            note={t('tracking.in_trip_note')}
            toneClassName="bg-sky-400/18 text-sky-50"
          />
        </div>
      </ManagementHero>

      <div className="grid gap-5 md:gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <ManagementPanel
          title={t('tracking.driver_list_title')}
          bodyClassName="space-y-4 p-0"
          headerSlot={
            <ToneBadge
              label={`${t('tracking.filtered_results')}: ${displayedDrivers.length}`}
              toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
            />
          }
        >
          <div className="space-y-4 px-4 pt-4 md:px-5 md:pt-5">
            <ManagementSegmentedControl
              value={mode}
              onChange={(value) => setMode(value as Mode)}
              options={[
                { value: 'live', label: t('tracking.live_only') },
                { value: 'fleet', label: t('tracking.fleet_overview') },
              ]}
            />

            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('tracking.search_placeholder')}
            />

            <div className="grid gap-2">
              <ManagementField label={t('status')}>
                <ManagementSelectField
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option value="all">{t('tracking.all_statuses')}</option>
                  <option value="online">{t('tracking.online')}</option>
                  <option value="offline">{t('tracking.offline')}</option>
                  <option value="trip">{t('tracking.with_active_trip')}</option>
                </ManagementSelectField>
              </ManagementField>
            </div>

            {activeFilterCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                <ToneBadge
                  label={`${t('tracking.active_filters')}: ${activeFilterCount}`}
                  toneClassName="border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 min-h-0 max-h-[360px] overflow-y-auto border-t border-[rgba(15,23,42,0.08)] sm:max-h-[420px] lg:max-h-[calc(100dvh-18rem)] 2xl:max-h-[720px]">
            {isLoading ? (
              <div className="px-4 py-4 md:px-5">
                <ManagementRowsSkeleton
                  count={4}
                  itemClassName="p-4"
                />
              </div>
            ) : null}

            {!isLoading && displayedDrivers.length === 0 ? (
              <div className="px-4 py-4 md:px-5">
                <ManagementInlineState
                  title={
                    mode === 'live'
                      ? t('tracking.no_active_drivers')
                      : t('tracking.no_tracked_drivers')
                  }
                  description={t('ui_state.empty_description')}
                />
              </div>
            ) : null}

            {displayedDrivers.map((driver) => {
              const isSelected = driver.driverId === selectedDriver;
              const statusLabel = getDriverActivityLabel(t, driver);

              return (
                <button
                  key={driver.driverId}
                  type="button"
                  onClick={() => setSelectedDriver(driver.driverId)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex w-full flex-col gap-3 border-b border-[rgba(15,23,42,0.08)] px-4 py-3.5 text-start transition hover:bg-white/70 motion-reduce:transition-none md:px-5 md:py-4',
                    isSelected &&
                      'bg-[rgba(12,107,88,0.08)] hover:bg-[rgba(12,107,88,0.12)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                        {statusLabel}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'mt-1 h-2.5 w-2.5 rounded-full',
                        markerClassName(driver),
                      )}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ToneBadge
                      label={statusLabel}
                      toneClassName={driverTone(driver)}
                    />
                    <span className="text-xs text-[var(--color-muted)]">
                      {driver.lastSeenAt
                        ? new Date(driver.lastSeenAt).toLocaleTimeString()
                        : '—'}
                    </span>
                  </div>

                  <div className="text-xs text-[var(--color-muted)]">
                    {t('speed')}: {driver.speedKmh ?? '—'} km/h
                  </div>
                </button>
              );
            })}
          </div>
        </ManagementPanel>

        <div className="space-y-5 md:space-y-6">
          <ManagementPanel
            title={t('tracking.map_title')}
            bodyClassName="p-0"
            headerSlot={
              <ToneBadge
                label={selected ? `${selected.firstName} ${selected.lastName}` : t('tracking.select_driver')}
                toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
              />
            }
          >
            <div className="relative h-[360px] overflow-hidden sm:h-[420px] lg:h-[500px] xl:h-[560px]">
              <LiveTrackingMap
                drivers={displayedDrivers}
                selectedDriverId={selectedDriver}
                onSelectDriver={setSelectedDriver}
              />

              <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-start justify-between gap-3 sm:left-4 sm:right-4 sm:top-4">
                <div className="pointer-events-auto max-w-[15rem] rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur sm:max-w-md">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">
                    {t('tracking.location_stream')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">
                    {selected
                      ? `${selected.firstName} ${selected.lastName} · ${getDriverActivityLabel(
                          t,
                          selected,
                        )}`
                      : t('tracking.select_driver')}
                  </p>
                </div>
              </div>
            </div>
          </ManagementPanel>

          <ManagementPanel
            eyebrow={t('tracking.current_position')}
            title={t('tracking.current_position')}
            headerSlot={
              selected ? (
                <ToneBadge
                  label={selected.isOnline ? t('tracking.online') : t('tracking.offline')}
                  toneClassName={driverTone(selected)}
                />
              ) : undefined
            }
            bodyClassName="space-y-4"
          >
            {!selected ? (
              <ManagementInlineState
                title={t('tracking.select_driver')}
                description={t('ui_state.selection_description')}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ManagementIconBadge icon={UserRound} size={18} />
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-ink)]">
                      {selected.firstName} {selected.lastName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {getDriverActivityLabel(t, selected)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ManagementDetailTile
                    label={t('tracking.coordinates')}
                    value={`${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`}
                  />
                  <ManagementDetailTile
                    label={t('speed')}
                    value={`${selected.speedKmh ?? '—'} km/h`}
                  />
                  <ManagementDetailTile
                    label={t('last_seen')}
                    value={formatDateTime(selected.lastSeenAt)}
                  />
                  <ManagementDetailTile
                    label={t('status')}
                    value={getDriverActivityLabel(t, selected)}
                  />
                </div>
              </div>
            )}
          </ManagementPanel>
        </div>
      </div>

      <ManagementPanel
        eyebrow={t('tracking.history')}
        title={t('tracking.history')}
        description={t('tracking.history_description')}
        bodyClassName="p-0"
        headerSlot={
          <div className="flex w-full flex-col gap-2 sm:items-end">
            <ManagementSegmentedControl
              value={historyRange}
              onChange={(value) => setHistoryRange(value as HistoryRange)}
              options={[
                { value: '6h', label: t('tracking.last_6_hours') },
                { value: '24h', label: t('tracking.last_24_hours') },
                { value: '7d', label: t('tracking.last_7_days') },
              ]}
              className="w-full min-w-[220px] max-w-[320px]"
            />
          </div>
        }
      >
        {!selected ? (
          <div className="p-5 md:p-6">
            <ManagementInlineState
              title={t('tracking.select_driver')}
              description={t('ui_state.selection_description')}
            />
          </div>
        ) : null}

        {selected && historyIsLoading ? (
          <div className="p-5 md:p-6">
            <ManagementRowsSkeleton count={5} detailColumns={4} />
          </div>
        ) : null}

        {selected && !historyIsLoading && recentHistory.length === 0 ? (
          <div className="p-5 md:p-6">
            <ManagementInlineState
              title={t('tracking.no_history')}
              description={t('ui_state.empty_description')}
            />
          </div>
        ) : null}

        {selected && !historyIsLoading && recentHistory.length > 0 ? (
          <>
            <div className="grid gap-3 border-y border-[rgba(15,23,42,0.08)] bg-[rgba(12,107,88,0.03)] px-4 py-4 sm:grid-cols-2 xl:grid-cols-4 md:px-5">
              <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/88 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  {t('tracking.history')}
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                  {historySummary?.total ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/88 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  {t('last_seen')}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                  {formatDateTime(historySummary?.latestAt ?? null)}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/88 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  {t('speed')}
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                  {historySummary?.latestSpeed ?? '—'} km/h
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/88 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  {t('tracking.heading')}
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                  {historySummary?.latestHeading ?? '—'}
                </p>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              <div className="hidden sticky top-0 z-10 border-b border-[rgba(15,23,42,0.08)] bg-[var(--color-panel-strong)]/95 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)] backdrop-blur sm:grid sm:grid-cols-[1.1fr_1.6fr_0.8fr_0.8fr] sm:gap-4">
                <span>{t('last_seen')}</span>
                <span>{t('tracking.coordinates')}</span>
                <span>{t('speed')}</span>
                <span>{t('tracking.heading')}</span>
              </div>

              <div className="divide-y divide-[rgba(15,23,42,0.08)]">
                {recentHistory.map((point, index) => (
                  <div
                    key={point.id}
                    className="grid gap-3 px-4 py-4 transition-colors hover:bg-[rgba(12,107,88,0.04)] sm:grid-cols-[1.1fr_1.6fr_0.8fr_0.8fr] sm:gap-4 md:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-2xl border border-[rgba(12,107,88,0.12)] bg-[rgba(12,107,88,0.08)] px-2 text-xs font-semibold text-[var(--color-brand)]">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                            {formatTimeOnly(point.recordedAt)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {formatDayOnly(point.recordedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/82 px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {point.tripId ? t('tracking.in_trip') : t('tracking.standalone')}
                      </p>
                    </div>

                    <div className="flex min-h-[3.25rem] items-center justify-between rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.03)] px-3 py-2.5 sm:block sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)] sm:hidden">
                        {t('speed')}
                      </span>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {point.speedKmh ?? '—'} km/h
                      </p>
                    </div>

                    <div className="flex min-h-[3.25rem] items-center justify-between rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.03)] px-3 py-2.5 sm:block sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)] sm:hidden">
                        {t('tracking.heading')}
                      </span>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {point.heading ?? '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </ManagementPanel>
    </div>
  );
}
