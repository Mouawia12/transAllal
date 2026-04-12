'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useAuthStore } from '../../../lib/auth/auth-store';
import type { Alert, ApiResponse } from '../../../types/shared';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function AlertsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const companyId = user?.companyId ?? '';
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', companyId, page],
    queryFn: () => apiClient.get<ApiResponse<Alert[]>>(ENDPOINTS.ALERTS, { companyId, page, limit: 20 }),
    enabled: !!companyId,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(ENDPOINTS.ALERT_READ(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const markAll = useMutation({
    mutationFn: () => apiClient.patch(ENDPOINTS.ALERTS_READ_ALL, { companyId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.alerts')}</h1>
        <button onClick={() => markAll.mutate()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {t('mark_all_read')}
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {[t('type'), t('severity_label'), t('message'), t('status'), t('actions')].map(h => (
                <th key={h} className="text-start px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>}
            {!isLoading && (data?.data?.length ?? 0) === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('no_data')}</td></tr>
            )}
            {data?.data?.map(a => (
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
      </div>
    </div>
  );
}
