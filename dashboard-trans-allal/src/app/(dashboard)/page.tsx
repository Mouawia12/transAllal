'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { useAuthStore } from '../../lib/auth/auth-store';

export default function OverviewPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const companyId = user?.companyId ?? '';

  const { data: summary } = useQuery({
    queryKey: ['reports', 'summary', companyId],
    queryFn: () => apiClient.get<{ data: Record<string, number> }>(`${ENDPOINTS.REPORTS_SUMMARY}?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const { data: trips } = useQuery({
    queryKey: ['trips', companyId, 'recent'],
    queryFn: () => apiClient.get<{ data: unknown[] }>(ENDPOINTS.TRIPS, { companyId, limit: 5, page: 1 }),
    enabled: !!companyId,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', companyId, 'recent'],
    queryFn: () => apiClient.get<{ data: unknown[] }>(ENDPOINTS.ALERTS, { companyId, limit: 5, page: 1 }),
    enabled: !!companyId,
  });

  const s = summary?.data ?? {};

  const cards = [
    { label: t('overview.total_trips'), value: s['total_trips'] ?? 0, color: 'bg-blue-500' },
    { label: t('overview.completed_trips'), value: s['completed_trips'] ?? 0, color: 'bg-green-500' },
    { label: t('overview.active_drivers'), value: s['active_drivers'] ?? 0, color: 'bg-orange-500' },
    { label: t('overview.active_trucks'), value: s['active_trucks'] ?? 0, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.overview')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${card.color} mb-3`} />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('overview.recent_trips')}</h2>
          {(trips?.data?.length ?? 0) === 0
            ? <p className="text-gray-400 text-sm">{t('no_data')}</p>
            : (trips?.data as Array<{ id: string; origin: string; destination: string; status: string }>)?.map(trip => (
              <div key={trip.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">{trip.origin} → {trip.destination}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t(`status_values.${trip.status}` as Parameters<typeof t>[0])}</span>
              </div>
            ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('overview.recent_alerts')}</h2>
          {(alerts?.data?.length ?? 0) === 0
            ? <p className="text-gray-400 text-sm">{t('no_data')}</p>
            : (alerts?.data as Array<{ id: string; type: string; severity: string; message: string }>)?.map(alert => (
              <div key={alert.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t(`alert_types.${alert.type}` as Parameters<typeof t>[0])}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t(`severity.${alert.severity}` as Parameters<typeof t>[0])}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
