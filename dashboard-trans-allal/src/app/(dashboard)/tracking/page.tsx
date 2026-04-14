'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Radar,
  Route as RouteIcon,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
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
import {
  dashboardRuntimeConfig,
  hasUsableMapboxToken,
} from '../../../lib/api/config';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { realtimeClient } from '../../../lib/api/realtime-client';
import { tokenStore } from '../../../lib/auth/token-store';
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

const DEFAULT_VIEW = {
  longitude: -1.22,
  latitude: 28.03,
  zoom: 4.2,
};

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
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [viewState, setViewState] = useState(DEFAULT_VIEW);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const hasMapToken = hasUsableMapboxToken(dashboardRuntimeConfig.mapboxToken);
  const showLiveMap =
    dashboardRuntimeConfig.mapProvider === 'mapbox' &&
    hasMapToken &&
    !mapUnavailable;

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
    setViewState(DEFAULT_VIEW);
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
    const token = tokenStore.getAccessToken();
    if (!token || !companyId) {
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

    realtimeClient.connect(token);
    realtimeClient.subscribeToCompany(companyId);
    realtimeClient.onDriverLocation(handleLocation);
    realtimeClient.onOnlineChanged(handleOnlineChanged);

    return () => {
      realtimeClient.offDriverLocation(handleLocation);
      realtimeClient.offOnlineChanged(handleOnlineChanged);
      realtimeClient.disconnect();
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

  useEffect(() => {
    if (!selected) {
      return;
    }

    setViewState((current) => ({
      ...current,
      latitude: selected.lat,
      longitude: selected.lng,
      zoom: Math.max(current.zoom, 9.5),
    }));
  }, [selected]);

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

      <div className="grid gap-5 md:gap-6 lg:grid-cols-[290px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <ManagementPanel
          title={t('tracking.driver_list_title')}
          description={t('tracking.driver_list_description')}
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

        <ManagementPanel
          title={t('tracking.map_title')}
          description={t('tracking.map_description')}
          bodyClassName="p-0"
          headerSlot={
            <ToneBadge
              label={selected ? `${selected.firstName} ${selected.lastName}` : t('tracking.select_driver')}
              toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
            />
          }
        >
          <div className="relative min-h-[360px] overflow-hidden sm:min-h-[420px] lg:min-h-[500px] 2xl:min-h-[620px]">
            {showLiveMap ? (
              <Map
                reuseMaps
                mapboxAccessToken={dashboardRuntimeConfig.mapboxToken}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                longitude={viewState.longitude}
                latitude={viewState.latitude}
                zoom={viewState.zoom}
                onMove={(event) => setViewState(event.viewState)}
                onError={() => setMapUnavailable(true)}
              >
                <NavigationControl position="top-right" />

                {displayedDrivers.map((driver) => (
                  <Marker
                    key={driver.driverId}
                    longitude={driver.lng}
                    latitude={driver.lat}
                    anchor="bottom"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDriver(driver.driverId)}
                      aria-pressed={selectedDriver === driver.driverId}
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg transition motion-reduce:transition-none',
                        selectedDriver === driver.driverId
                          ? 'scale-125'
                          : 'hover:scale-110',
                        markerClassName(driver),
                      )}
                      aria-label={`${driver.firstName} ${driver.lastName}`}
                    >
                      <span className="sr-only">
                        {driver.firstName} {driver.lastName}
                      </span>
                    </button>
                  </Marker>
                ))}
              </Map>
            ) : (
              <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,#f2f7f6_0%,#ffffff_50%,#edf5ff_100%)] p-4 sm:p-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">
                    {t('tracking.map_disabled_title')}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                    {t('tracking.map_disabled_description')}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {displayedDrivers.slice(0, 6).map((driver) => (
                    <ManagementSurfaceCard
                      key={driver.driverId}
                      className="rounded-2xl border-white/70 bg-white/78 p-4 shadow-[var(--shadow-panel)] backdrop-blur"
                    >
                      <p className="font-medium text-[var(--color-ink)]">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {driver.lat.toFixed(5)}, {driver.lng.toFixed(5)}
                      </p>
                    </ManagementSurfaceCard>
                  ))}
                </div>
              </div>
            )}

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

        <div className="space-y-5 md:space-y-6 lg:col-span-2 2xl:col-span-1">
          <ManagementPanel
            eyebrow={t('tracking.current_position')}
            title={t('tracking.current_position')}
            description={t('tracking.current_position_description')}
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

          <ManagementPanel
            eyebrow={t('tracking.history')}
            title={t('tracking.history')}
            description={t('tracking.history_description')}
            headerSlot={
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
            }
            bodyClassName="space-y-4"
          >
            {!selected ? (
              <ManagementInlineState
                title={t('tracking.select_driver')}
                description={t('ui_state.selection_description')}
              />
            ) : null}

            {selected && historyIsLoading ? (
              <ManagementRowsSkeleton count={3} detailColumns={2} />
            ) : null}

            {selected && !historyIsLoading && recentHistory.length === 0 ? (
              <ManagementInlineState
                title={t('tracking.no_history')}
                description={t('ui_state.empty_description')}
              />
            ) : null}

            <div className="space-y-3">
              {recentHistory.map((point) => (
                <ManagementSurfaceCard
                  key={point.id}
                  className="p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {formatDateTime(point.recordedAt)}
                      </p>
                    </div>
                    <ToneBadge
                      label={`${t('tracking.heading')}: ${point.heading ?? '—'}`}
                      toneClassName="border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.05)] text-[var(--color-ink)]"
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ManagementDetailTile
                      label={t('speed')}
                      value={`${point.speedKmh ?? '—'} km/h`}
                    />
                    <ManagementDetailTile
                      label={t('tracking.coordinates')}
                      value={`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                    />
                  </div>
                </ManagementSurfaceCard>
              ))}
            </div>
          </ManagementPanel>
        </div>
      </div>
    </div>
  );
}
