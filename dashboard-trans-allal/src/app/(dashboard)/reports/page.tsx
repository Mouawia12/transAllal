'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useAuthStore } from '../../../lib/auth/auth-store';

export default function ReportsPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const companyId = user?.companyId ?? '';

  const { data: summary } = useQuery({
    queryKey: ['reports', 'summary', companyId],
    queryFn: () => apiClient.get<{ data: Record<string, number> }>(`${ENDPOINTS.REPORTS_SUMMARY}?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const s = summary?.data ?? {};
  const cards = [
    { label: t('overview.total_trips'), value: s['total_trips'] ?? 0 },
    { label: t('overview.completed_trips'), value: s['completed_trips'] ?? 0 },
    { label: t('overview.active_drivers'), value: s['active_drivers'] ?? 0 },
    { label: t('overview.active_trucks'), value: s['active_trucks'] ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.reports')}</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            <p className="text-sm text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
