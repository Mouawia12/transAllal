'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Route as RouteIcon,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import {
  ManagementCallout,
  ManagementField,
  ManagementHero,
  ManagementInputField,
  ManagementInlineState,
  ManagementPanel,
  ManagementPageState,
  ManagementRowsSkeleton,
  ManagementSegmentedControl,
  ManagementSkeletonBlock,
  ManagementStatCard,
  ManagementSurfaceCard,
  ManagementTrendSkeleton,
  ToneBadge,
} from '../../../components/shared/management-ui';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useCompanyScope } from '../../../lib/company/use-company-scope';

type SummaryReport = {
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  pendingTrips: number;
  activeDrivers: number;
  activeTrucks: number;
};

type TripsReportRow = {
  period: string;
  total: number;
  completed: number;
  cancelled: number;
};

type DriversReportRow = {
  id: string;
  firstName: string;
  lastName: string;
  totalTrips: number;
  completedTrips: number;
};

type AlertsReportRow = {
  type: string;
  severity: string;
  total: number;
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildReportDateRange(from: string, to: string) {
  return {
    from: new Date(`${from}T00:00:00.000Z`).toISOString(),
    to: new Date(`${to}T23:59:59.999Z`).toISOString(),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function severityTone(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'HIGH':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'MEDIUM':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700';
  }
}

export default function ReportsPage() {
  const t = useTranslations();
  const { user, hasHydrated, companyId } = useCompanyScope();
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 29);
    return toDateInputValue(date);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [groupBy, setGroupBy] = useState<'day' | 'week'>('day');

  const isValidRange = from <= to;
  const reportRange = buildReportDateRange(from, to);

  const { data: summary } = useQuery({
    queryKey: ['reports', 'summary', companyId],
    queryFn: () =>
      apiClient.get<{ data: SummaryReport }>(ENDPOINTS.REPORTS_SUMMARY, {
        companyId,
      }),
    enabled: !!companyId,
  });

  const { data: tripsReport, isLoading: tripsLoading } = useQuery({
    queryKey: ['reports', 'trips', companyId, reportRange.from, reportRange.to, groupBy],
    queryFn: () =>
      apiClient.get<{ data: TripsReportRow[] }>(ENDPOINTS.REPORTS_TRIPS, {
        companyId,
        from: reportRange.from,
        to: reportRange.to,
        groupBy,
      }),
    enabled: !!companyId && isValidRange,
  });

  const { data: driversReport, isLoading: driversLoading } = useQuery({
    queryKey: ['reports', 'drivers', companyId, reportRange.from, reportRange.to],
    queryFn: () =>
      apiClient.get<{ data: DriversReportRow[] }>(ENDPOINTS.REPORTS_DRIVERS, {
        companyId,
        from: reportRange.from,
        to: reportRange.to,
      }),
    enabled: !!companyId && isValidRange,
  });

  const { data: alertsReport, isLoading: alertsLoading } = useQuery({
    queryKey: ['reports', 'alerts', companyId, reportRange.from, reportRange.to],
    queryFn: () =>
      apiClient.get<{ data: AlertsReportRow[] }>(ENDPOINTS.REPORTS_ALERTS, {
        companyId,
        from: reportRange.from,
        to: reportRange.to,
      }),
    enabled: !!companyId && isValidRange,
  });

  const s: Partial<SummaryReport> = summary?.data ?? {};

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

  const cards = [
    {
      icon: RouteIcon,
      label: t('overview.total_trips'),
      value: s.totalTrips ?? 0,
      note: t('reports.total_trips_note'),
    },
    {
      icon: CheckCircle2,
      label: t('overview.completed_trips'),
      value: s.completedTrips ?? 0,
      note: t('reports.completed_trips_note'),
      toneClassName: 'bg-emerald-400/18 text-emerald-50',
    },
    {
      icon: Activity,
      label: t('reports.active_trips'),
      value: s.activeTrips ?? 0,
      note: t('reports.active_trips_note'),
      toneClassName: 'bg-sky-400/18 text-sky-50',
    },
    {
      icon: Clock3,
      label: t('reports.pending_trips'),
      value: s.pendingTrips ?? 0,
      note: t('reports.pending_trips_note'),
      toneClassName: 'bg-amber-400/18 text-amber-50',
    },
    {
      icon: Users,
      label: t('overview.active_drivers'),
      value: s.activeDrivers ?? 0,
      note: t('reports.active_drivers_note'),
      toneClassName: 'bg-violet-400/18 text-violet-50',
    },
    {
      icon: AlertTriangle,
      label: t('overview.active_trucks'),
      value: s.activeTrucks ?? 0,
      note: t('reports.active_trucks_note'),
      toneClassName: 'bg-cyan-400/18 text-cyan-50',
    },
  ];

  const tripRows = tripsReport?.data ?? [];
  const driverRows = driversReport?.data ?? [];
  const alertRows = alertsReport?.data ?? [];
  const tripMax = Math.max(...tripRows.map((row) => row.total), 1);
  const alertTotal = alertRows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="space-y-5 md:space-y-6">
      <ManagementHero
        eyebrow={t('reports.eyebrow')}
        title={t('nav.reports')}
        description={t('reports.description')}
        className="bg-[linear-gradient(135deg,#101827_0%,#203b58_46%,#7d4f22_100%)]"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <ManagementStatCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              note={card.note}
              toneClassName={card.toneClassName}
            />
          ))}
        </div>
      </ManagementHero>

      <ManagementPanel
        title={t('reports.filters_title')}
        description={t('reports.filters_description')}
        bodyClassName="space-y-4"
        headerSlot={
          <ToneBadge
            label={`${t('reports.selected_range')}: ${from} → ${to}`}
            toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ManagementField label={t('reports.from')}>
            <ManagementInputField
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </ManagementField>

          <ManagementField label={t('reports.to')}>
            <ManagementInputField
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </ManagementField>

          <ManagementField label={t('reports.group_by')} className="xl:col-span-2">
            <ManagementSegmentedControl
              value={groupBy}
              onChange={(value) => setGroupBy(value as 'day' | 'week')}
              options={[
                { value: 'day', label: t('reports.day') },
                { value: 'week', label: t('reports.week') },
              ]}
            />
          </ManagementField>
        </div>

        {!isValidRange ? (
          <ManagementCallout tone="danger" description={t('reports.invalid_range')} />
        ) : null}
      </ManagementPanel>

      <div className="grid gap-5 md:gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <ManagementPanel
          eyebrow={t('reports.trips_trend')}
          title={t('reports.trips_trend')}
          description={t('reports.trips_trend_description')}
          headerSlot={
            <ToneBadge
              label={groupBy === 'day' ? t('reports.day') : t('reports.week')}
              toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
            />
          }
        >
          <div className="space-y-4">
            {tripsLoading ? (
              <ManagementTrendSkeleton />
            ) : null}

            {!tripsLoading && tripRows.length === 0 ? (
              <ManagementInlineState
                title={t('reports.no_report_data')}
                description={t('ui_state.empty_description')}
              />
            ) : null}

            {tripRows.map((row) => {
              const width = `${Math.max((row.total / tripMax) * 100, 6)}%`;

              return (
                <div key={row.period} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[var(--color-ink)]">
                      {formatDate(row.period)}
                    </span>
                    <span className="text-[var(--color-muted)]">
                      {row.completed}/{row.total} {t('reports.completed')}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[rgba(15,23,42,0.08)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#0c6b58_0%,#2f9e87_100%)]"
                      style={{ width }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
                    <span>{t('reports.total')}: {row.total}</span>
                    <span>{t('reports.completed')}: {row.completed}</span>
                    <span>{t('reports.cancelled')}: {row.cancelled}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ManagementPanel>

        <ManagementPanel
          eyebrow={t('reports.driver_performance')}
          title={t('reports.driver_performance')}
          description={t('reports.driver_performance_description')}
        >
          <div className="space-y-3">
            {driversLoading ? (
              <ManagementRowsSkeleton count={4} />
            ) : null}

            {!driversLoading && driverRows.length === 0 ? (
              <ManagementInlineState
                title={t('reports.no_report_data')}
                description={t('ui_state.empty_description')}
              />
            ) : null}

            {driverRows.slice(0, 8).map((driver, index) => (
              <ManagementSurfaceCard
                key={driver.id}
                className="flex items-center justify-between gap-4 px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {index + 1}. {driver.firstName} {driver.lastName}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {t('reports.total')}: {driver.totalTrips}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-xl font-semibold text-[var(--color-ink)]">
                    {driver.completedTrips}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {t('reports.completed')}
                  </p>
                </div>
              </ManagementSurfaceCard>
            ))}
          </div>
        </ManagementPanel>
      </div>

      <ManagementPanel
        eyebrow={t('reports.alert_breakdown')}
        title={t('reports.alert_breakdown')}
        description={t('reports.alert_breakdown_description')}
        headerSlot={
          <ToneBadge
            label={`${t('reports.alerts_total')}: ${alertTotal}`}
            toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {alertsLoading ? (
            Array.from({ length: 4 }, (_, index) => (
              <ManagementSurfaceCard key={index} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <ManagementSkeletonBlock className="h-4 w-24" />
                  <ManagementSkeletonBlock className="h-6 w-16 rounded-full" />
                </div>
                <ManagementSkeletonBlock className="mt-5 h-10 w-14" />
                <ManagementSkeletonBlock className="mt-2 h-3 w-20" />
              </ManagementSurfaceCard>
            ))
          ) : null}

          {!alertsLoading && alertRows.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-4">
              <ManagementInlineState
                title={t('reports.no_report_data')}
                description={t('ui_state.empty_description')}
              />
            </div>
          ) : null}

          {alertRows.map((alert) => (
            <ManagementSurfaceCard
              key={`${alert.type}-${alert.severity}`}
              className="p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  {t(`alert_types.${alert.type}` as Parameters<typeof t>[0])}
                </span>
                <ToneBadge
                  label={t(`severity.${alert.severity}` as Parameters<typeof t>[0])}
                  toneClassName={severityTone(alert.severity)}
                />
              </div>
              <p className="mt-5 text-3xl font-semibold text-[var(--color-ink)]">
                {alert.total}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t('reports.alerts_total')}
              </p>
            </ManagementSurfaceCard>
          ))}
        </div>
      </ManagementPanel>
    </div>
  );
}
