'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  MapPinned,
  OctagonX,
  Plus,
  Route as RouteIcon,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import {
  ManagementActionButton,
  ManagementCallout,
  ManagementDetailTile,
  ManagementDesktopTable,
  ManagementField,
  ManagementFormActions,
  ManagementHero,
  ManagementIconBadge,
  ManagementInputField,
  MANAGEMENT_TABLE_CELL_CLASSNAME,
  MANAGEMENT_TABLE_HEAD_CLASSNAME,
  ManagementInlineState,
  ManagementMobileCard,
  ManagementMobileList,
  ManagementPanel,
  ManagementPageState,
  ManagementRowsSkeleton,
  ManagementSelectField,
  ManagementStatCard,
  ManagementSurfaceCard,
  ManagementTableSkeleton,
  ManagementTableState,
  ManagementTextareaField,
  PaginationBar,
  SearchField,
  ToneBadge,
} from '../../../components/shared/management-ui';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import { cn } from '../../../lib/utils/cn';
import type { ApiResponse, Driver, Trip, Truck } from '../../../types/shared';

const STATUS_OPTIONS = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

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

function statusTone(status: Trip['status']) {
  switch (status) {
    case 'COMPLETED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'IN_PROGRESS':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'CANCELLED':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
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
  const resetUpdateNotesMutationRef = useRef(updateNotesMutation.reset);
  resetUpdateNotesMutationRef.current = updateNotesMutation.reset;

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
  }, [selectedTrip?.id, selectedTrip?.notes]);

  useEffect(() => {
    resetUpdateNotesMutationRef.current();
  }, [selectedTrip?.id]);

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
  const reversedTrack = selectedTrack.slice().reverse();
  const noteChanged = noteDraft !== (selectedTrip?.notes ?? '');
  const totalPages = data?.meta?.totalPages ?? 1;
  const activeFilterCount = [
    statusFilter,
    driverFilter,
    fromDate,
    toDate,
    search.trim(),
  ].filter(Boolean).length;

  return (
    <div className="space-y-5 md:space-y-6">
      <ManagementHero
        eyebrow={t('trips_page.eyebrow')}
        title={t('nav.trips')}
        description={t('trips_page.description')}
        className="bg-[linear-gradient(135deg,#0f1721_0%,#15334c_48%,#0d6b58_100%)]"
        actions={
          canCreateTrips ? (
            <ManagementActionButton
              onClick={() => {
                setShowCreate((current) => !current);
                createMutation.reset();
                if (showCreate) {
                  setForm(initialTripForm);
                }
              }}
              tone="hero"
              size="md"
              className="py-3"
            >
              {showCreate ? <X size={16} /> : <Plus size={16} />}
              {showCreate ? t('cancel') : t('create_trip')}
            </ManagementActionButton>
          ) : null
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ManagementStatCard
            icon={RouteIcon}
            label={t('trips_page.summary_total')}
            value={tripSummary.total}
            note={t('trips_page.visible_note')}
          />
          <ManagementStatCard
            icon={Activity}
            label={t('trips_page.summary_active')}
            value={tripSummary.active}
            note={t('trips_page.active_note')}
            toneClassName="bg-sky-400/18 text-sky-50"
          />
          <ManagementStatCard
            icon={CheckCircle2}
            label={t('trips_page.summary_completed')}
            value={tripSummary.completed}
            note={t('trips_page.completed_note')}
            toneClassName="bg-emerald-400/18 text-emerald-50"
          />
          <ManagementStatCard
            icon={OctagonX}
            label={t('trips_page.summary_cancelled')}
            value={tripSummary.cancelled}
            note={t('trips_page.cancelled_note')}
            toneClassName="bg-rose-400/18 text-rose-50"
          />
        </div>
      </ManagementHero>

      <div className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1.05fr)_340px] 2xl:grid-cols-[minmax(0,1.18fr)_380px]">
        <section className="space-y-5 md:space-y-6">
          <ManagementPanel
            title={t('trips_page.filters_title')}
            description={t('trips_page.filters_description')}
            bodyClassName="space-y-4"
            headerSlot={
              <ToneBadge
                label={`${t('trips_page.filtered_results')}: ${tripSummary.total}`}
                toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
              />
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder={t('trips_page.search_placeholder')}
                className="xl:col-span-2"
              />

              <ManagementField label={t('status')}>
                <ManagementSelectField
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as TripStatusFilter)
                  }
                >
                  <option value="">{t('trips_page.all_statuses')}</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`status_values.${status}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </ManagementSelectField>
              </ManagementField>

              <ManagementField label={t('driver')}>
                <ManagementSelectField
                  value={driverFilter}
                  onChange={(event) => setDriverFilter(event.target.value)}
                >
                  <option value="">{t('trips_page.all_drivers')}</option>
                  {(drivers?.data ?? []).map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName}
                    </option>
                  ))}
                </ManagementSelectField>
              </ManagementField>

              <ManagementField label={t('reports.from')}>
                <ManagementInputField
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </ManagementField>

              <ManagementField label={t('reports.to')}>
                <ManagementInputField
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </ManagementField>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <ToneBadge
                  label={`${t('reports.total')}: ${data?.meta?.total ?? trips.length}`}
                  toneClassName="border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.05)] text-[var(--color-ink)]"
                />
                {activeFilterCount > 0 ? (
                  <ToneBadge
                    label={`${t('trips_page.active_filters')}: ${activeFilterCount}`}
                    toneClassName="border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
                  />
                ) : null}
              </div>

              <ManagementActionButton tone="neutral" size="md" onClick={resetFilters}>
                {t('trips_page.reset_filters')}
              </ManagementActionButton>
            </div>

            {hasInvalidRange ? (
              <ManagementCallout
                tone="danger"
                description={t('reports.invalid_range')}
              />
            ) : null}
          </ManagementPanel>

          {canCreateTrips && showCreate ? (
            <ManagementPanel
              eyebrow={t('create')}
              title={t('trips_page.form_create_title')}
              description={t('trips_page.form_create_description')}
              headerSlot={
                <ToneBadge
                  label={t('create_trip')}
                  toneClassName="border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
                />
              }
            >
              <form onSubmit={handleCreate} aria-busy={createMutation.isPending}>
                <fieldset
                  disabled={createMutation.isPending}
                  className="grid gap-4 lg:grid-cols-2"
                >
                <ManagementField label={t('origin')}>
                  <ManagementInputField
                    required
                    value={form.origin}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, origin: event.target.value }))
                    }
                  />
                </ManagementField>
                <ManagementField label={t('destination')}>
                  <ManagementInputField
                    required
                    value={form.destination}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        destination: event.target.value,
                      }))
                    }
                  />
                </ManagementField>
                <ManagementField label={t('scheduled_for')}>
                  <ManagementInputField
                    required
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scheduledAt: event.target.value,
                      }))
                    }
                  />
                </ManagementField>
                <ManagementField
                  label={t('assigned_driver')}
                  optionalLabel={t('optional')}
                >
                  <ManagementSelectField
                    value={form.driverId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        driverId: event.target.value,
                      }))
                    }
                  >
                    <option value="">{t('none')}</option>
                    {activeDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.firstName} {driver.lastName}
                      </option>
                    ))}
                  </ManagementSelectField>
                </ManagementField>
                <ManagementField
                  label={t('assigned_truck')}
                  optionalLabel={t('optional')}
                >
                  <ManagementSelectField
                    value={form.truckId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        truckId: event.target.value,
                      }))
                    }
                  >
                    <option value="">{t('none')}</option>
                    {(trucks?.data ?? []).map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.plateNumber}
                      </option>
                    ))}
                  </ManagementSelectField>
                </ManagementField>
                <ManagementField
                  label={t('notes')}
                  optionalLabel={t('optional')}
                  className="lg:col-span-2"
                >
                  <ManagementTextareaField
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </ManagementField>

                {createMutation.error instanceof Error ? (
                  <ManagementCallout
                    className="lg:col-span-2"
                    tone="danger"
                    description={createMutation.error.message}
                  />
                ) : null}

                <ManagementFormActions className="lg:col-span-2">
                  <ManagementActionButton
                    onClick={() => {
                      setShowCreate(false);
                      setForm(initialTripForm);
                      createMutation.reset();
                    }}
                    tone="neutral"
                    size="md"
                  >
                    {t('cancel')}
                  </ManagementActionButton>
                  <ManagementActionButton
                    type="submit"
                    loading={createMutation.isPending}
                    tone="solid"
                    size="md"
                  >
                    {t('create_trip')}
                  </ManagementActionButton>
                </ManagementFormActions>
                </fieldset>
              </form>
            </ManagementPanel>
          ) : null}

          <ManagementPanel
            eyebrow={t('nav.trips')}
            title={t('trips_page.table_title')}
            description={t('trips_page.table_description')}
            bodyClassName="p-0"
            headerSlot={
              <ToneBadge
                label={`${t('trips_page.summary_total')}: ${tripSummary.total}`}
                toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
              />
            }
          >
            <ManagementMobileList>
              {hasInvalidRange ? (
                <ManagementInlineState
                  title={t('reports.invalid_range')}
                  description={t('ui_state.empty_description')}
                />
              ) : null}

              {isLoading && !hasInvalidRange ? (
                <ManagementRowsSkeleton count={3} detailColumns={2} />
              ) : null}

              {!isLoading && !hasInvalidRange && visibleTrips.length === 0 ? (
                <ManagementInlineState
                  title={t('ui_state.empty_title')}
                  description={t('ui_state.empty_description')}
                />
              ) : null}

              {!isLoading &&
                !hasInvalidRange &&
                visibleTrips.map((trip) => (
                  <ManagementMobileCard
                    key={trip.id}
                    title={`${trip.origin} → ${trip.destination}`}
                    subtitle={formatDateTime(trip.scheduledAt)}
                    selected={selectedTripId === trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    headerSlot={
                      <ToneBadge
                        label={t(
                          `status_values.${trip.status}` as Parameters<typeof t>[0],
                        )}
                        toneClassName={statusTone(trip.status)}
                      />
                    }
                    footer={
                      canCancelTrips && trip.status !== 'CANCELLED' ? (
                        <ManagementActionButton
                          onClick={(event) => {
                            event.stopPropagation();
                            if (confirm(t('confirm_delete'))) {
                              cancelMutation.mutate(trip.id);
                            }
                          }}
                          tone="danger"
                        >
                          {t('cancel_trip')}
                        </ManagementActionButton>
                      ) : undefined
                    }
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          {t('driver')}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {trip.driver
                            ? `${trip.driver.firstName} ${trip.driver.lastName}`
                            : '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          {t('truck')}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {trip.truck ? trip.truck.plateNumber : '—'}
                        </p>
                      </div>
                    </div>
                  </ManagementMobileCard>
                ))}
            </ManagementMobileList>

            <ManagementDesktopTable>
              <table
                className="min-w-full text-sm"
                aria-busy={isLoading && !hasInvalidRange}
              >
                <caption className="sr-only">
                  {t('trips_page.table_title')}. {t('trips_page.table_description')}
                </caption>
                <thead className="bg-[rgba(15,23,42,0.04)]">
                  <tr>
                    {[
                      `${t('origin')} → ${t('destination')}`,
                      t('driver'),
                      t('truck'),
                      t('status'),
                      t('scheduled_at'),
                      t('actions'),
                    ].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className={MANAGEMENT_TABLE_HEAD_CLASSNAME}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(15,23,42,0.08)]">
                  {hasInvalidRange ? (
                    <ManagementTableState
                      colSpan={6}
                      title={t('reports.invalid_range')}
                      description={t('ui_state.empty_description')}
                    />
                  ) : null}

                  {isLoading && !hasInvalidRange ? (
                    <ManagementTableSkeleton
                      colSpan={6}
                      rows={4}
                    />
                  ) : null}

                  {!isLoading && !hasInvalidRange && visibleTrips.length === 0 ? (
                    <ManagementTableState
                      colSpan={6}
                      title={t('ui_state.empty_title')}
                      description={t('ui_state.empty_description')}
                    />
                  ) : null}

                  {!isLoading &&
                    !hasInvalidRange &&
                    visibleTrips.map((trip) => (
                      <tr
                        key={trip.id}
                        className={cn(
                          'cursor-pointer transition hover:bg-white/70 motion-reduce:transition-none',
                          selectedTripId === trip.id &&
                            'bg-[rgba(12,107,88,0.08)] hover:bg-[rgba(12,107,88,0.12)]',
                        )}
                        onClick={() => setSelectedTripId(trip.id)}
                      >
                        <th
                          scope="row"
                          className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} font-semibold text-[var(--color-ink)]`}
                        >
                          {trip.origin} → {trip.destination}
                        </th>
                        <td
                          className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                        >
                          {trip.driver
                            ? `${trip.driver.firstName} ${trip.driver.lastName}`
                            : '—'}
                        </td>
                        <td
                          className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                        >
                          {trip.truck ? trip.truck.plateNumber : '—'}
                        </td>
                        <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                          <ToneBadge
                            label={t(
                              `status_values.${trip.status}` as Parameters<typeof t>[0],
                            )}
                            toneClassName={statusTone(trip.status)}
                          />
                        </td>
                        <td
                          className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                        >
                          {formatDateTime(trip.scheduledAt)}
                        </td>
                        <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                          <div className="flex flex-wrap gap-2">
                            <ManagementActionButton
                              tone={selectedTripId === trip.id ? 'solid' : 'neutral'}
                              aria-pressed={selectedTripId === trip.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedTripId(trip.id);
                              }}
                            >
                              {t('trips_page.details')}
                            </ManagementActionButton>
                            {canCancelTrips && trip.status !== 'CANCELLED' ? (
                              <ManagementActionButton
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (confirm(t('confirm_delete'))) {
                                    cancelMutation.mutate(trip.id);
                                  }
                                }}
                                tone="danger"
                              >
                                {t('cancel_trip')}
                              </ManagementActionButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </ManagementDesktopTable>

            <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
          </ManagementPanel>
        </section>

        <aside className="space-y-5 md:space-y-6 lg:sticky lg:top-0 lg:self-start">
          <ManagementPanel
            eyebrow={t('trips_page.details')}
            title={
              selectedTrip
                ? `${selectedTrip.origin} → ${selectedTrip.destination}`
                : t('trips_page.details')
            }
            description={t('trips_page.details_description')}
            headerSlot={
              selectedTrip ? (
                <ToneBadge
                  label={t(
                    `status_values.${selectedTrip.status}` as Parameters<typeof t>[0],
                  )}
                  toneClassName={statusTone(selectedTrip.status)}
                />
              ) : undefined
            }
            bodyClassName="space-y-4"
          >
            {!selectedTrip ? (
              <ManagementInlineState
                title={t('trips_page.select_trip')}
                description={t('ui_state.selection_description')}
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand)]">
                    {t('trips_page.route_label')}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ManagementDetailTile
                    label={t('driver')}
                    value={
                      selectedTrip.driver
                        ? `${selectedTrip.driver.firstName} ${selectedTrip.driver.lastName}`
                        : t('none')
                    }
                  />
                  <ManagementDetailTile
                    label={t('truck')}
                    value={selectedTrip.truck?.plateNumber ?? t('none')}
                  />
                  <ManagementDetailTile
                    label={t('scheduled_at')}
                    value={formatDateTime(selectedTrip.scheduledAt)}
                  />
                  <ManagementDetailTile
                    label={t('trips_page.started_at')}
                    value={formatDateTime(selectedTrip.startedAt)}
                  />
                  <div className="sm:col-span-2">
                    <ManagementDetailTile
                      label={t('trips_page.completed_at')}
                      value={formatDateTime(selectedTrip.completedAt)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {t('notes')}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                        {t('trips_page.notes_description')}
                      </p>
                    </div>

                    {canEditTrips ? (
                      <ManagementActionButton
                        disabled={!noteChanged}
                        loading={updateNotesMutation.isPending}
                        onClick={handleSaveNotes}
                        tone="solid"
                      >
                        {t('trips_page.save_notes')}
                      </ManagementActionButton>
                    ) : null}
                  </div>

                  <ManagementTextareaField
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    disabled={!canEditTrips}
                    rows={4}
                  />

                  {updateNotesMutation.error instanceof Error ? (
                    <ManagementCallout
                      tone="danger"
                      description={updateNotesMutation.error.message}
                    />
                  ) : null}
                </div>
              </>
            )}
          </ManagementPanel>

          <ManagementPanel
            eyebrow={t('trips_page.track_history')}
            title={t('trips_page.track_history')}
            description={t('trips_page.track_history_description')}
            headerSlot={
              selectedTrip ? (
                <ToneBadge
                  label={`${t('trips_page.points_recorded')}: ${selectedTrack.length}`}
                  toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
                />
              ) : undefined
            }
            bodyClassName="space-y-4"
          >
            {!selectedTrip ? (
              <ManagementInlineState
                title={t('trips_page.select_trip')}
                description={t('ui_state.selection_description')}
              />
            ) : null}

            {selectedTrip && !selectedTrip.driverId ? (
              <ManagementCallout
                tone="info"
                description={t('trips_page.track_unavailable')}
              />
            ) : null}

            {selectedTrip && selectedTrip.driverId && latestTrackPoint ? (
              <ManagementSurfaceCard className="border-sky-200 bg-[linear-gradient(180deg,#eff8ff_0%,#f8fbff_100%)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                      {t('trips_page.latest_record')}
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {latestTrackPoint.lat.toFixed(5)}, {latestTrackPoint.lng.toFixed(5)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(latestTrackPoint.recordedAt)}
                    </p>
                  </div>
                  <ManagementIconBadge
                    icon={MapPinned}
                    size={18}
                    className="bg-sky-100 text-sky-700"
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ManagementDetailTile
                    label={t('speed')}
                    value={`${latestTrackPoint.speedKmh ?? '—'} km/h`}
                  />
                  <ManagementDetailTile
                    label={t('trips_page.accuracy')}
                    value={`${latestTrackPoint.accuracyM ?? '—'} m`}
                  />
                </div>
              </ManagementSurfaceCard>
            ) : null}

            {trackHistoryLoading ? (
              <ManagementRowsSkeleton count={3} detailColumns={2} />
            ) : null}

            {selectedTrip &&
            selectedTrip.driverId &&
            !trackHistoryLoading &&
            reversedTrack.length === 0 ? (
              <ManagementInlineState
                title={t('trips_page.track_history_empty')}
                description={t('ui_state.empty_description')}
              />
            ) : null}

            <div className="space-y-3">
              {reversedTrack.map((point) => (
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
                      label={`${t('trips_page.heading')}: ${point.heading ?? '—'}`}
                      toneClassName="border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.05)] text-[var(--color-ink)]"
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ManagementDetailTile
                      label={t('speed')}
                      value={`${point.speedKmh ?? '—'} km/h`}
                    />
                    <ManagementDetailTile
                      label={t('trips_page.accuracy')}
                      value={`${point.accuracyM ?? '—'} m`}
                    />
                  </div>
                </ManagementSurfaceCard>
              ))}
            </div>
          </ManagementPanel>
        </aside>
      </div>
    </div>
  );
}
