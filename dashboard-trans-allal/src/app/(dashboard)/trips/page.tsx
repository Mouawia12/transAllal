'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import type { ApiResponse, Driver, Trip, Truck } from '../../../types/shared';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const INPUT_CLASSNAME =
  'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

const CARD_CLASSNAME =
  'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950';

const initialTripForm = {
  origin: '',
  destination: '',
  scheduledAt: '',
  driverId: '',
  truckId: '',
  notes: '',
};

type TripStatusFilter = Trip['status'] | '';

interface TripTrackPoint {
  id: string;
  tripId: string | null;
  lat: number;
  lng: number;
  speedKmh: number | null;
  heading: number | null;
  accuracyM: number | null;
  recordedAt: string;
}

function normalizeNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
}

function normalizeTrackPoint(point: TripTrackPoint): TripTrackPoint {
  const nextPoint = point as TripTrackPoint & {
    lat: number | string;
    lng: number | string;
    speedKmh: number | string | null;
    heading: number | string | null;
    accuracyM: number | string | null;
  };

  return {
    ...point,
    lat: Number(nextPoint.lat),
    lng: Number(nextPoint.lng),
    speedKmh: normalizeNullableNumber(nextPoint.speedKmh),
    heading: normalizeNullableNumber(nextPoint.heading),
    accuracyM: normalizeNullableNumber(nextPoint.accuracyM),
  };
}

function toStartOfDayIso(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toEndOfDayIso(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function TripsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { user, hasHydrated, companyId } = useCompanyScope();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>('');
  const [driverFilter, setDriverFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialTripForm);
  const [noteDraft, setNoteDraft] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const canCreateTrips =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'COMPANY_ADMIN' ||
    user?.role === 'DISPATCHER';
  const canCancelTrips =
    user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';
  const canEditTrips = canCreateTrips;
  const hasInvalidRange = Boolean(fromDate && toDate && fromDate > toDate);

  const { data: drivers } = useQuery({
    queryKey: ['trip-support', 'drivers', companyId],
    queryFn: () =>
      apiClient.get<ApiResponse<Driver[]>>(ENDPOINTS.DRIVERS, {
        companyId,
        page: 1,
        limit: 100,
      }),
    enabled: !!companyId,
  });

  const { data: trucks } = useQuery({
    queryKey: ['trip-form', 'trucks', companyId],
    queryFn: () =>
      apiClient.get<ApiResponse<Truck[]>>(ENDPOINTS.TRUCKS, {
        companyId,
        page: 1,
        limit: 100,
        isActive: true,
      }),
    enabled: !!companyId && showCreate && canCreateTrips,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      'trips',
      companyId,
      page,
      statusFilter,
      driverFilter,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      apiClient.get<ApiResponse<Trip[]>>(ENDPOINTS.TRIPS, {
        companyId,
        page,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
        ...(driverFilter && { driverId: driverFilter }),
        ...(fromDate && { from: toStartOfDayIso(fromDate) }),
        ...(toDate && { to: toEndOfDayIso(toDate) }),
      }),
    enabled: !!companyId && !hasInvalidRange,
  });

  const trips = data?.data ?? [];
  const visibleTrips = useMemo(() => {
    if (!deferredSearch) {
      return trips;
    }

    return trips.filter((trip) => {
      const haystack = [
        trip.origin,
        trip.destination,
        trip.notes ?? '',
        trip.driver ? `${trip.driver.firstName} ${trip.driver.lastName}` : '',
        trip.truck?.plateNumber ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(deferredSearch);
    });
  }, [deferredSearch, trips]);

  const selectedTrip = useMemo(() => {
    if (!selectedTripId) {
      return null;
    }

    return visibleTrips.find((trip) => trip.id === selectedTripId) ?? null;
  }, [selectedTripId, visibleTrips]);

  const { data: trackHistory, isLoading: trackHistoryLoading } = useQuery({
    queryKey: ['trip-track', selectedTripId],
    queryFn: () =>
      apiClient.get<ApiResponse<TripTrackPoint[]>>(
        ENDPOINTS.TRIP_TRACK(selectedTripId!),
      ),
    enabled: !!selectedTripId && !!selectedTrip?.driverId,
    select: (response) => ({
      ...response,
      data: response.data.map(normalizeTrackPoint),
    }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof initialTripForm) =>
      apiClient.post<{ data: Trip }>(ENDPOINTS.TRIPS, {
        origin: payload.origin.trim(),
        destination: payload.destination.trim(),
        scheduledAt: new Date(payload.scheduledAt).toISOString(),
        driverId: payload.driverId || undefined,
        truckId: payload.truckId || undefined,
        notes: payload.notes.trim() || undefined,
      }),
    onSuccess: () => {
      setForm(initialTripForm);
      setShowCreate(false);
      setPage(1);
      void qc.invalidateQueries({ queryKey: ['trips', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: (payload: { id: string; notes: string }) =>
      apiClient.patch<{ data: Trip }>(ENDPOINTS.TRIP(payload.id), {
        notes: payload.notes.trim() || undefined,
      }),
    onSuccess: (response) => {
      setNoteDraft(response.data.notes ?? '');
      void qc.invalidateQueries({ queryKey: ['trips', companyId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(ENDPOINTS.TRIP(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trips', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
  });

  useEffect(() => {
    setPage(1);
  }, [driverFilter, fromDate, statusFilter, toDate]);

  useEffect(() => {
    if (visibleTrips.length === 0) {
      setSelectedTripId(null);
      return;
    }

    const selectedVisible = visibleTrips.some((trip) => trip.id === selectedTripId);
    if (!selectedTripId || !selectedVisible) {
      setSelectedTripId(visibleTrips[0].id);
    }
  }, [selectedTripId, visibleTrips]);

  useEffect(() => {
    setNoteDraft(selectedTrip?.notes ?? '');
    updateNotesMutation.reset();
  }, [selectedTrip?.id, selectedTrip?.notes, updateNotesMutation]);

  if (!hasHydrated) {
    return <p className="text-sm text-gray-400">{t('loading')}</p>;
  }

  if (!user || !companyId) {
    return <CompanyScopeEmpty />;
  }

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  const handleSaveNotes = () => {
    if (!selectedTrip) {
      return;
    }

    updateNotesMutation.mutate({
      id: selectedTrip.id,
      notes: noteDraft,
    });
  };

  const resetFilters = () => {
    setStatusFilter('');
    setDriverFilter('');
    setFromDate('');
    setToDate('');
    setSearch('');
  };

  const tripSummary = {
    total: visibleTrips.length,
    active: visibleTrips.filter(
      (trip) => trip.status === 'PENDING' || trip.status === 'IN_PROGRESS',
    ).length,
    completed: visibleTrips.filter((trip) => trip.status === 'COMPLETED').length,
    cancelled: visibleTrips.filter((trip) => trip.status === 'CANCELLED').length,
  };

  const activeDrivers = (drivers?.data ?? []).filter((driver) => driver.isActive);
  const selectedTrack = trackHistory?.data ?? [];
  const latestTrackPoint =
    selectedTrack.length > 0 ? selectedTrack[selectedTrack.length - 1] : null;
  const noteChanged = noteDraft !== (selectedTrip?.notes ?? '');

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('nav.trips')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('trips_page.description')}
            </p>
          </div>
          {canCreateTrips && (
            <button
              onClick={() => setShowCreate((value) => !value)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              {showCreate ? t('cancel') : t('create_trip')}
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className={CARD_CLASSNAME}>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('trips_page.summary_total')}
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {tripSummary.total}
            </p>
          </div>
          <div className={CARD_CLASSNAME}>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('trips_page.summary_active')}
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {tripSummary.active}
            </p>
          </div>
          <div className={CARD_CLASSNAME}>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('trips_page.summary_completed')}
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {tripSummary.completed}
            </p>
          </div>
          <div className={CARD_CLASSNAME}>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('trips_page.summary_cancelled')}
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {tripSummary.cancelled}
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('search')}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('trips_page.search_placeholder')}
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('status')}</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as TripStatusFilter)
              }
              className={INPUT_CLASSNAME}
            >
              <option value="">{t('trips_page.all_statuses')}</option>
              {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map(
                (status) => (
                  <option key={status} value={status}>
                    {t(`status_values.${status}` as Parameters<typeof t>[0])}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('driver')}</span>
            <select
              value={driverFilter}
              onChange={(event) => setDriverFilter(event.target.value)}
              className={INPUT_CLASSNAME}
            >
              <option value="">{t('trips_page.all_drivers')}</option>
              {(drivers?.data ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.firstName} {driver.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('reports.from')}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('reports.to')}</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className={INPUT_CLASSNAME}
            />
          </label>
          <div className="flex items-end justify-end md:col-span-2 xl:col-span-5">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              {t('trips_page.reset_filters')}
            </button>
          </div>
          {hasInvalidRange && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 md:col-span-2 xl:col-span-5">
              {t('reports.invalid_range')}
            </div>
          )}
        </div>

        {canCreateTrips && showCreate && (
          <form
            onSubmit={handleCreate}
            className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 lg:grid-cols-2"
          >
            <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>{t('origin')}</span>
              <input
                required
                value={form.origin}
                onChange={(event) =>
                  setForm((current) => ({ ...current, origin: event.target.value }))
                }
                className={INPUT_CLASSNAME}
              />
            </label>
            <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>{t('destination')}</span>
              <input
                required
                value={form.destination}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    destination: event.target.value,
                  }))
                }
                className={INPUT_CLASSNAME}
              />
            </label>
            <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>{t('scheduled_for')}</span>
              <input
                required
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduledAt: event.target.value,
                  }))
                }
                className={INPUT_CLASSNAME}
              />
            </label>
            <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>
                {t('assigned_driver')}{' '}
                <span className="text-xs opacity-70">({t('optional')})</span>
              </span>
              <select
                value={form.driverId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, driverId: event.target.value }))
                }
                className={INPUT_CLASSNAME}
              >
                <option value="">{t('none')}</option>
                {activeDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.firstName} {driver.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>
                {t('assigned_truck')}{' '}
                <span className="text-xs opacity-70">({t('optional')})</span>
              </span>
              <select
                value={form.truckId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, truckId: event.target.value }))
                }
                className={INPUT_CLASSNAME}
              >
                <option value="">{t('none')}</option>
                {(trucks?.data ?? []).map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.plateNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300 lg:col-span-2">
              <span>
                {t('notes')}{' '}
                <span className="text-xs opacity-70">({t('optional')})</span>
              </span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                className={INPUT_CLASSNAME}
              />
            </label>
            {createMutation.error instanceof Error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 lg:col-span-2">
                {createMutation.error.message}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 lg:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setForm(initialTripForm);
                  createMutation.reset();
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending ? t('loading') : t('create_trip')}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {[
                  `${t('origin')} → ${t('destination')}`,
                  t('driver'),
                  t('truck'),
                  t('status'),
                  t('scheduled_at'),
                  ...(canCancelTrips ? [t('actions')] : []),
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-300"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(isLoading || hasInvalidRange) && (
                <tr>
                  <td
                    colSpan={canCancelTrips ? 6 : 5}
                    className="py-8 text-center text-gray-400"
                  >
                    {hasInvalidRange ? t('reports.invalid_range') : t('loading')}
                  </td>
                </tr>
              )}
              {!isLoading && !hasInvalidRange && visibleTrips.length === 0 && (
                <tr>
                  <td
                    colSpan={canCancelTrips ? 6 : 5}
                    className="py-8 text-center text-gray-400"
                  >
                    {t('no_data')}
                  </td>
                </tr>
              )}
              {!isLoading &&
                !hasInvalidRange &&
                visibleTrips.map((trip) => (
                  <tr
                    key={trip.id}
                    className={`cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-900/60 ${
                      selectedTripId === trip.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}
                    onClick={() => setSelectedTripId(trip.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {trip.origin} → {trip.destination}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {trip.driver
                        ? `${trip.driver.firstName} ${trip.driver.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {trip.truck ? trip.truck.plateNumber : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[trip.status] ?? ''
                        }`}
                      >
                        {t(`status_values.${trip.status}` as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(trip.scheduledAt).toLocaleString()}
                    </td>
                    {canCancelTrips && (
                      <td className="px-4 py-3">
                        {trip.status !== 'CANCELLED' && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (confirm(t('confirm_delete'))) {
                                cancelMutation.mutate(trip.id);
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            {t('cancel_trip')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
          {(data?.meta?.totalPages ?? 1) > 1 && (
            <div className="flex justify-center gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
              {Array.from({ length: data!.meta!.totalPages }, (_, index) => (
                <button
                  key={index}
                  onClick={() => setPage(index + 1)}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    page === index + 1
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
            {t('trips_page.details')}
          </p>

          {!selectedTrip && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('trips_page.select_trip')}
            </p>
          )}

          {selectedTrip && (
            <div className="mt-4 space-y-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedTrip.origin} → {selectedTrip.destination}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_COLORS[selectedTrip.status] ?? ''
                    }`}
                  >
                    {t(
                      `status_values.${selectedTrip.status}` as Parameters<typeof t>[0],
                    )}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('trips_page.route_label')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('driver')}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTrip.driver
                      ? `${selectedTrip.driver.firstName} ${selectedTrip.driver.lastName}`
                      : t('none')}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('truck')}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTrip.truck?.plateNumber ?? t('none')}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('scheduled_at')}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedTrip.scheduledAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('trips_page.started_at')}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTrip.startedAt
                      ? new Date(selectedTrip.startedAt).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-900 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('trips_page.completed_at')}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTrip.completedAt
                      ? new Date(selectedTrip.completedAt).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('notes')}
                  </p>
                  {canEditTrips && (
                    <button
                      type="button"
                      disabled={!noteChanged || updateNotesMutation.isPending}
                      onClick={handleSaveNotes}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateNotesMutation.isPending
                        ? t('loading')
                        : t('trips_page.save_notes')}
                    </button>
                  )}
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  disabled={!canEditTrips}
                  rows={4}
                  className={INPUT_CLASSNAME}
                />
                {updateNotesMutation.error instanceof Error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {updateNotesMutation.error.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                  {t('trips_page.track_history')}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('trips_page.track_history_description')}
                </p>
              </div>
              {selectedTrip && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  {t('trips_page.points_recorded')}: {selectedTrack.length}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto p-4">
            {!selectedTrip && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('trips_page.select_trip')}
              </p>
            )}

            {selectedTrip && !selectedTrip.driverId && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('trips_page.no_track_history')}
              </p>
            )}

            {selectedTrip && selectedTrip.driverId && latestTrackPoint && (
              <div className="rounded-2xl bg-blue-50 px-4 py-4 dark:bg-blue-950/20">
                <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  {t('trips_page.latest_record')}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {latestTrackPoint.lat.toFixed(5)}, {latestTrackPoint.lng.toFixed(5)}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {t('speed')}: {latestTrackPoint.speedKmh ?? '—'} km/h
                  </span>
                  <span>
                    {t('trips_page.accuracy')}: {latestTrackPoint.accuracyM ?? '—'} m
                  </span>
                </div>
              </div>
            )}

            {trackHistoryLoading && (
              <p className="text-sm text-gray-400">{t('loading')}</p>
            )}

            {selectedTrip &&
              selectedTrip.driverId &&
              !trackHistoryLoading &&
              selectedTrack.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('trips_page.no_track_history')}
                </p>
              )}

            <div className="space-y-3">
              {selectedTrack
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
                      <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {t('trips_page.heading')}: {point.heading ?? '—'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {t('speed')}: {point.speedKmh ?? '—'} km/h
                      </span>
                      <span>
                        {t('trips_page.accuracy')}: {point.accuracyM ?? '—'} m
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
