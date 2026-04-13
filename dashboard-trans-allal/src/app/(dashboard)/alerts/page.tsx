'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { realtimeClient } from '../../../lib/api/realtime-client';
import { tokenStore } from '../../../lib/auth/token-store';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import type { Alert, ApiResponse } from '../../../types/shared';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

type AlertTypeFilter =
  | 'SPEEDING'
  | 'GEOFENCE_EXIT'
  | 'IDLE'
  | 'SOS'
  | 'ROUTE_DEVIATION'
  | '';

type SeverityFilter = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | '';
type ReadFilter = 'all' | 'read' | 'unread';

function matchesReadFilter(isRead: boolean, filter: ReadFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'read') return isRead;
  return !isRead;
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
      void qc.invalidateQueries({ queryKey: ['alerts'] });
      void qc.invalidateQueries({ queryKey: ['reports', 'alerts'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => apiClient.patch(ENDPOINTS.ALERTS_READ_ALL, { companyId }),
    onSuccess: () => {
      setLiveAlerts((current) =>
        current.map((alert) => ({ ...alert, isRead: true })),
      );
      void qc.invalidateQueries({ queryKey: ['alerts'] });
      void qc.invalidateQueries({ queryKey: ['reports', 'alerts'] });
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
      void qc.invalidateQueries({ queryKey: ['reports', 'alerts'] });
    };

    realtimeClient.connect(token);
    realtimeClient.subscribeToCompany(companyId);
    realtimeClient.onAlert(handleAlert);

    return () => {
      realtimeClient.offAlert();
      realtimeClient.disconnect();
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
  const totalPages = data?.meta?.totalPages ?? 1;

  if (!hasHydrated) {
    return <p className="text-sm text-gray-400">{t('loading')}</p>;
  }

  if (!user || !companyId) {
    return <CompanyScopeEmpty />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.alerts')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('alerts.description')}
          </p>
        </div>
        <button onClick={() => markAll.mutate()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={markAll.isPending}>
          {t('mark_all_read')}
        </button>
      </div>
      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 md:grid-cols-4">
        <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
          <span>{t('type')}</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as AlertTypeFilter)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">{t('alerts.all_types')}</option>
            {(['SPEEDING', 'GEOFENCE_EXIT', 'IDLE', 'SOS', 'ROUTE_DEVIATION'] as const).map((type) => (
              <option key={type} value={type}>
                {t(`alert_types.${type}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
          <span>{t('severity_label')}</span>
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">{t('alerts.all_severities')}</option>
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((severity) => (
              <option key={severity} value={severity}>
                {t(`severity.${severity}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
          <span>{t('status')}</span>
          <select
            value={readFilter}
            onChange={(event) => setReadFilter(event.target.value as ReadFilter)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="all">{t('alerts.all_statuses')}</option>
            <option value="unread">{t('unread')}</option>
            <option value="read">{t('read')}</option>
          </select>
        </label>
        <div className="rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300">
            {t('alerts.live_feed')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {unreadCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('alerts.unread_in_view')}
          </p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {[t('type'), t('severity_label'), t('message'), t('status'), t('created_at'), t('actions')].map(h => (
                <th key={h} className="text-start px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>}
            {!isLoading && mergedAlerts.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('no_data')}</td></tr>
            )}
            {mergedAlerts.map(a => (
              <tr key={a.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${a.isRead ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t(`alert_types.${a.type}` as Parameters<typeof t>[0])}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[a.severity] ?? ''}`}>
                    {t(`severity.${a.severity}` as Parameters<typeof t>[0])}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.message ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${a.isRead ? 'text-gray-400' : 'text-blue-600 font-medium'}`}>
                    {a.isRead ? t('read') : t('unread')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {!a.isRead && (
                    <button onClick={() => markRead.mutate(a.id)} className="text-blue-500 hover:text-blue-700 text-xs">
                      {t('mark_read')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() => setPage(index + 1)}
                className={`px-3 py-1 rounded ${page === index + 1 ? 'bg-blue-600 text-white' : 'border text-gray-600 hover:bg-gray-50'}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
