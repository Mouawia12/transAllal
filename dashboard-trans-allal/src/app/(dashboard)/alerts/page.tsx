'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import {
  ManagementActionButton,
  ManagementDesktopTable,
  ManagementField,
  ManagementHero,
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
  ManagementTableSkeleton,
  ManagementTableState,
  PaginationBar,
  ToneBadge,
} from '../../../components/shared/management-ui';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { realtimeClient } from '../../../lib/api/realtime-client';
import { tokenStore } from '../../../lib/auth/token-store';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import { cn } from '../../../lib/utils/cn';
import type { Alert, ApiResponse } from '../../../types/shared';

const ALERT_TYPES = [
  'SPEEDING',
  'GEOFENCE_EXIT',
  'IDLE',
  'SOS',
  'ROUTE_DEVIATION',
] as const;

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

type AlertTypeFilter = (typeof ALERT_TYPES)[number] | '';
type SeverityFilter = (typeof SEVERITIES)[number] | '';
type ReadFilter = 'all' | 'read' | 'unread';

function matchesReadFilter(isRead: boolean, filter: ReadFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'read') return isRead;
  return !isRead;
}

function severityTone(severity: Alert['severity']) {
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AlertsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { user, hasHydrated, companyId } = useCompanyScope();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', companyId, page, typeFilter, severityFilter, readFilter],
    queryFn: () =>
      apiClient.get<ApiResponse<Alert[]>>(ENDPOINTS.ALERTS, {
        companyId,
        page,
        limit: 20,
        ...(typeFilter && { type: typeFilter }),
        ...(severityFilter && { severity: severityFilter }),
        ...(readFilter !== 'all' && { isRead: readFilter === 'read' }),
      }),
    enabled: !!companyId,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(ENDPOINTS.ALERT_READ(id)),
    onSuccess: (_, id) => {
      setLiveAlerts((current) =>
        current.map((alert) =>
          alert.id === id ? { ...alert, isRead: true } : alert,
        ),
      );
      void qc.invalidateQueries({ queryKey: ['alerts', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'alerts', companyId] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => apiClient.patch(ENDPOINTS.ALERTS_READ_ALL, { companyId }),
    onSuccess: () => {
      setLiveAlerts((current) =>
        current.map((alert) => ({ ...alert, isRead: true })),
      );
      void qc.invalidateQueries({ queryKey: ['alerts', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'alerts', companyId] });
    },
  });

  useEffect(() => {
    setPage(1);
  }, [typeFilter, severityFilter, readFilter]);

  useEffect(() => {
    setLiveAlerts([]);
  }, [companyId]);

  useEffect(() => {
    const token = tokenStore.getAccessToken();
    if (!token || !companyId) return;

    const handleAlert = (payload: {
      alertId: string;
      type: string;
      severity: string;
      message: string | null;
      driverId: string | null;
      tripId: string | null;
    }) => {
      const nextAlert: Alert = {
        id: payload.alertId,
        companyId,
        driverId: payload.driverId,
        tripId: payload.tripId,
        type: payload.type as Alert['type'],
        severity: payload.severity as Alert['severity'],
        message: payload.message,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      if (typeFilter && nextAlert.type !== typeFilter) return;
      if (severityFilter && nextAlert.severity !== severityFilter) return;
      if (!matchesReadFilter(nextAlert.isRead, readFilter)) return;

      setLiveAlerts((current) => {
        const withoutDuplicate = current.filter(
          (alert) => alert.id !== nextAlert.id,
        );
        return [nextAlert, ...withoutDuplicate].slice(0, 20);
      });
      void qc.invalidateQueries({ queryKey: ['alerts', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'alerts', companyId] });
    };

    realtimeClient.connect(token);
    realtimeClient.subscribeToCompany(companyId);
    realtimeClient.onAlert(handleAlert);

    // Remove only this page's listener — do NOT call disconnect() here because
    // the realtime socket is shared across pages. Disconnecting on unmount would
    // drop subscriptions owned by other pages that are still mounted.
    return () => {
      realtimeClient.offAlert(handleAlert);
    };
  }, [companyId, qc, readFilter, severityFilter, typeFilter]);

  const serverAlerts = data?.data ?? [];
  const mergedAlerts = useMemo(() => {
    const byId = new Map<string, Alert>();

    for (const alert of liveAlerts) {
      byId.set(alert.id, alert);
    }

    for (const alert of serverAlerts) {
      byId.set(alert.id, alert);
    }

    return Array.from(byId.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [liveAlerts, serverAlerts]);

  const unreadCount = mergedAlerts.filter((alert) => !alert.isRead).length;
  const criticalCount = mergedAlerts.filter(
    (alert) => alert.severity === 'CRITICAL',
  ).length;
  const totalPages = data?.meta?.totalPages ?? 1;
  const activeFilterCount = [typeFilter, severityFilter, readFilter !== 'all']
    .filter(Boolean)
    .length;

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
        eyebrow={t('alerts.eyebrow')}
        title={t('nav.alerts')}
        description={t('alerts.description')}
        className="bg-[linear-gradient(135deg,#170f24_0%,#4a1d39_46%,#8f3c2f_100%)]"
        actions={
          <ManagementActionButton
            onClick={() => markAll.mutate()}
            disabled={unreadCount === 0}
            loading={markAll.isPending}
            tone="hero"
            size="md"
            className="py-3"
          >
            {t('mark_all_read')}
          </ManagementActionButton>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ManagementStatCard
            icon={AlertTriangle}
            label={t('alerts.total_in_view')}
            value={mergedAlerts.length}
            note={t('alerts.total_note')}
          />
          <ManagementStatCard
            icon={Activity}
            label={t('alerts.live_feed')}
            value={liveAlerts.length}
            note={t('alerts.live_note')}
            toneClassName="bg-sky-400/18 text-sky-50"
          />
          <ManagementStatCard
            icon={ShieldAlert}
            label={t('alerts.unread_in_view')}
            value={unreadCount}
            note={t('alerts.unread_note')}
            toneClassName="bg-amber-400/18 text-amber-50"
          />
          <ManagementStatCard
            icon={CheckCircle2}
            label={t('alerts.critical_in_view')}
            value={criticalCount}
            note={t('alerts.critical_note')}
            toneClassName="bg-rose-400/18 text-rose-50"
          />
        </div>
      </ManagementHero>

      <ManagementPanel
        title={t('alerts.filters_title')}
        description={t('alerts.filters_description')}
        bodyClassName="space-y-4"
        headerSlot={
          <ToneBadge
            label={`${t('alerts.filtered_results')}: ${mergedAlerts.length}`}
            toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ManagementField label={t('type')}>
            <ManagementSelectField
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as AlertTypeFilter)}
            >
              <option value="">{t('alerts.all_types')}</option>
              {ALERT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`alert_types.${type}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </ManagementSelectField>
          </ManagementField>

          <ManagementField label={t('severity_label')}>
            <ManagementSelectField
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value as SeverityFilter)
              }
            >
              <option value="">{t('alerts.all_severities')}</option>
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {t(`severity.${severity}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </ManagementSelectField>
          </ManagementField>

          <ManagementField label={t('status')}>
            <ManagementSelectField
              value={readFilter}
              onChange={(event) => setReadFilter(event.target.value as ReadFilter)}
            >
              <option value="all">{t('alerts.all_statuses')}</option>
              <option value="unread">{t('unread')}</option>
              <option value="read">{t('read')}</option>
            </ManagementSelectField>
          </ManagementField>

          <div className="flex items-end justify-end">
            <div className="flex flex-wrap gap-2">
              {activeFilterCount > 0 ? (
                <ToneBadge
                  label={`${t('alerts.active_filters')}: ${activeFilterCount}`}
                  toneClassName="border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
                />
              ) : null}
              <ToneBadge
                label={`${t('reports.total')}: ${data?.meta?.total ?? mergedAlerts.length}`}
                toneClassName="border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.05)] text-[var(--color-ink)]"
              />
            </div>
          </div>
        </div>
      </ManagementPanel>

      <ManagementPanel
        eyebrow={t('nav.alerts')}
        title={t('alerts.table_title')}
        description={t('alerts.table_description')}
        bodyClassName="p-0"
      >
        <ManagementMobileList>
          {isLoading && mergedAlerts.length === 0 ? (
            <ManagementRowsSkeleton count={3} />
          ) : null}

          {!isLoading && mergedAlerts.length === 0 ? (
            <ManagementInlineState
              title={t('ui_state.empty_title')}
              description={t('ui_state.empty_description')}
            />
          ) : null}

          {!isLoading &&
            mergedAlerts.map((alert) => (
              <ManagementMobileCard
                key={alert.id}
                title={t(`alert_types.${alert.type}` as Parameters<typeof t>[0])}
                subtitle={formatDateTime(alert.createdAt)}
                className={!alert.isRead ? 'ring-1 ring-[rgba(12,107,88,0.1)]' : undefined}
                headerSlot={
                  <ToneBadge
                    label={t(`severity.${alert.severity}` as Parameters<typeof t>[0])}
                    toneClassName={severityTone(alert.severity)}
                  />
                }
                footer={
                  !alert.isRead ? (
                    <ManagementActionButton onClick={() => markRead.mutate(alert.id)}>
                      {t('mark_read')}
                    </ManagementActionButton>
                  ) : undefined
                }
              >
                <div className="flex flex-wrap gap-2">
                  <ToneBadge
                    label={alert.isRead ? t('read') : t('unread')}
                    toneClassName={
                      alert.isRead
                        ? 'border-slate-200 bg-slate-100 text-slate-600'
                        : 'border-sky-200 bg-sky-50 text-sky-700'
                    }
                  />
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    {t('message')}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--color-ink)]">
                    {alert.message ?? '—'}
                  </p>
                </div>
              </ManagementMobileCard>
            ))}
        </ManagementMobileList>

        <ManagementDesktopTable>
          <table className="min-w-full text-sm" aria-busy={isLoading}>
            <caption className="sr-only">
              {t('alerts.table_title')}. {t('alerts.table_description')}
            </caption>
            <thead className="bg-[rgba(15,23,42,0.04)]">
              <tr>
                {[t('type'), t('severity_label'), t('message'), t('status'), t('created_at'), t('actions')].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className={MANAGEMENT_TABLE_HEAD_CLASSNAME}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,23,42,0.08)]">
              {isLoading && mergedAlerts.length === 0 ? (
                <ManagementTableSkeleton colSpan={6} rows={4} />
              ) : null}

              {!isLoading && mergedAlerts.length === 0 ? (
                <ManagementTableState
                  colSpan={6}
                  title={t('ui_state.empty_title')}
                  description={t('ui_state.empty_description')}
                />
              ) : null}

              {mergedAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className={cn(
                    'transition hover:bg-white/70 motion-reduce:transition-none',
                    !alert.isRead && 'bg-[rgba(249,250,251,0.75)]',
                    alert.isRead && 'opacity-70',
                  )}
                >
                  <th
                    scope="row"
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} font-semibold text-[var(--color-ink)]`}
                  >
                    {t(`alert_types.${alert.type}` as Parameters<typeof t>[0])}
                  </th>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    <ToneBadge
                      label={t(`severity.${alert.severity}` as Parameters<typeof t>[0])}
                      toneClassName={severityTone(alert.severity)}
                    />
                  </td>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} max-w-[340px] text-[var(--color-muted)]`}
                  >
                    <div className="line-clamp-2">
                      {alert.message ?? '—'}
                    </div>
                  </td>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    <ToneBadge
                      label={alert.isRead ? t('read') : t('unread')}
                      toneClassName={
                        alert.isRead
                          ? 'border-slate-200 bg-slate-100 text-slate-600'
                          : 'border-sky-200 bg-sky-50 text-sky-700'
                      }
                    />
                  </td>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} whitespace-nowrap text-[var(--color-muted)]`}
                  >
                    {formatDateTime(alert.createdAt)}
                  </td>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    {!alert.isRead ? (
                      <ManagementActionButton onClick={() => markRead.mutate(alert.id)}>
                        {t('mark_read')}
                      </ManagementActionButton>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ManagementDesktopTable>

        <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
      </ManagementPanel>
    </div>
  );
}
