'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import { apiClient } from '../../../lib/api/client';
import { dashboardRuntimeConfig } from '../../../lib/api/config';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { realtimeClient } from '../../../lib/api/realtime-client';
import { tokenStore } from '../../../lib/auth/token-store';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
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

const SUMMARY_CARD_CLASSNAME =
  'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950';

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

export default function TrackingPage() {
  const t = useTranslations();
  const { user, hasHydrated, companyId } = useCompanyScope();
  const [mode, setMode] = useState<Mode>('live');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [historyRange, setHistoryRange] = useState<HistoryRange>('24h');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [liveMap, setLiveMap] = useState<Record<string, LiveDriver>>({});
  const [viewState, setViewState] = useState(DEFAULT_VIEW);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const hasMapToken = Boolean(dashboardRuntimeConfig.mapboxToken);

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

  if (!hasHydrated) {
    return <p className="text-sm text-gray-400">{t('loading')}</p>;
  }

  if (!user || !companyId) {
    return <CompanyScopeEmpty />;
  }

  return (
    <div className="grid h-[calc(100vh-5.5rem)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('nav.tracking')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('tracking.description')}
          </p>
        </div>

        <div className="space-y-4 border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
            {(['live', 'fleet'] as const).map((nextMode) => (
              <button
                key={nextMode}
                onClick={() => setMode(nextMode)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  mode === nextMode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {nextMode === 'live'
                  ? t('tracking.live_only')
                  : t('tracking.fleet_overview')}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
              <span>{t('search')}</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('tracking.search_placeholder')}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>

            <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
              <span>{t('status')}</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="all">{t('tracking.all_statuses')}</option>
                <option value="online">{t('tracking.online')}</option>
                <option value="offline">{t('tracking.offline')}</option>
                <option value="trip">{t('tracking.with_active_trip')}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="rounded-2xl bg-gray-100 px-3 py-3 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('tracking.summary_total')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {summary.tracked}
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-3 py-3 dark:bg-emerald-950/30">
            <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {t('tracking.summary_online')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {summary.online}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {t('tracking.summary_offline')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {summary.offline}
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 px-3 py-3 dark:bg-blue-950/30">
            <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">
              {t('tracking.summary_in_trip')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {summary.inTrip}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              {t('loading')}
            </p>
          )}

          {!isLoading && displayedDrivers.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              {mode === 'live'
                ? t('tracking.no_active_drivers')
                : t('tracking.no_tracked_drivers')}
            </p>
          )}

          {displayedDrivers.map((driver) => {
            const isSelected = driver.driverId === selectedDriver;
            const statusLabel = getDriverActivityLabel(t, driver);

            return (
              <button
                key={driver.driverId}
                onClick={() => setSelectedDriver(driver.driverId)}
                className={`flex w-full flex-col gap-2 border-b border-gray-100 px-4 py-4 text-start transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/70 ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {driver.firstName} {driver.lastName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {statusLabel}
                    </p>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      driver.isOnline
                        ? driver.tripId
                          ? 'bg-emerald-500'
                          : 'bg-yellow-400'
                        : 'bg-gray-400'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
                  <span>
                    {t('speed')}: {driver.speedKmh ?? '—'} km/h
                  </span>
                  <span>
                    {driver.lastSeenAt
                      ? new Date(driver.lastSeenAt).toLocaleTimeString()
                      : '—'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-h-0 gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className={SUMMARY_CARD_CLASSNAME}>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tracking.summary_total')}
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {summary.tracked}
              </p>
            </div>
            <div className={SUMMARY_CARD_CLASSNAME}>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tracking.summary_online')}
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {summary.online}
              </p>
            </div>
            <div className={SUMMARY_CARD_CLASSNAME}>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tracking.summary_offline')}
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {summary.offline}
              </p>
            </div>
            <div className={SUMMARY_CARD_CLASSNAME}>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tracking.summary_in_trip')}
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {summary.inTrip}
              </p>
            </div>
          </div>

          <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            {hasMapToken ? (
              <Map
                reuseMaps
                mapboxAccessToken={dashboardRuntimeConfig.mapboxToken}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                longitude={viewState.longitude}
                latitude={viewState.latitude}
                zoom={viewState.zoom}
                onMove={(event) => setViewState(event.viewState)}
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
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg transition ${
                        selectedDriver === driver.driverId
                          ? 'scale-125'
                          : 'hover:scale-110'
                      } ${
                        driver.isOnline
                          ? driver.tripId
                            ? 'bg-emerald-500'
                            : 'bg-yellow-400'
                          : 'bg-gray-400'
                      }`}
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
              <div className="flex h-full flex-col justify-between bg-gradient-to-br from-slate-100 via-white to-slate-200 p-6 dark:from-slate-950 dark:via-gray-950 dark:to-slate-900">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                    {t('nav.tracking')}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                    {t('tracking.map_disabled_title')}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    {t('tracking.map_disabled_description')}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {displayedDrivers.slice(0, 6).map((driver) => (
                    <div
                      key={driver.driverId}
                      className="rounded-2xl border border-white/60 bg-white/80 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {driver.lat.toFixed(5)}, {driver.lng.toFixed(5)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
              <div className="pointer-events-auto max-w-md rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-950/85">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                  {t('tracking.location_stream')}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
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
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                  {t('tracking.current_position')}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {selected
                    ? `${selected.firstName} ${selected.lastName}`
                    : t('tracking.select_driver')}
                </h2>
              </div>
              {selected && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selected.isOnline
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {selected.isOnline
                    ? t('tracking.online')
                    : t('tracking.offline')}
                </span>
              )}
            </div>

            {selected ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('tracking.coordinates')}
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('speed')}
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {selected.speedKmh ?? '—'} km/h
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('last_seen')}
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {selected.lastSeenAt
                        ? new Date(selected.lastSeenAt).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('status')}
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {getDriverActivityLabel(t, selected)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
                {t('tracking.select_driver')}
              </p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="border-b border-gray-200 p-5 dark:border-gray-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                    {t('tracking.history')}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('tracking.history_description')}
                  </p>
                </div>
                <select
                  value={historyRange}
                  onChange={(event) =>
                    setHistoryRange(event.target.value as HistoryRange)
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="6h">{t('tracking.last_6_hours')}</option>
                  <option value="24h">{t('tracking.last_24_hours')}</option>
                  <option value="7d">{t('tracking.last_7_days')}</option>
                </select>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!selected && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('tracking.select_driver')}
                </p>
              )}

              {selected && historyIsLoading && (
                <p className="text-sm text-gray-400">{t('loading')}</p>
              )}

              {selected && !historyIsLoading && historyPoints.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('tracking.no_history')}
                </p>
              )}

              <div className="space-y-3">
                {historyPoints
                  .slice()
                  .reverse()
                  .map((point) => (
                    <div
                      key={point.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(point.recordedAt).toLocaleString()}
                          </p>
                        </div>
                        {point.tripId && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {t('tracking.with_active_trip')}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {t('speed')}: {point.speedKmh ?? '—'} km/h
                        </span>
                        <span>
                          {t('tracking.heading')}: {point.heading ?? '—'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
