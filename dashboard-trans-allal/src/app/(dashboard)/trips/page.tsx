'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useAuthStore } from '../../../lib/auth/auth-store';
import type { Trip, ApiResponse } from '../../../types/shared';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function TripsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const companyId = user?.companyId ?? '';
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['trips', companyId, page],
    queryFn: () => apiClient.get<ApiResponse<Trip[]>>(ENDPOINTS.TRIPS, { companyId, page, limit: 20 }),
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(ENDPOINTS.TRIP(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['trips'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.trips')}</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {[`${t('origin')} → ${t('destination')}`, t('driver'), t('truck'), t('status'), t('scheduled_at'), t('actions')].map(h => (
                <th key={h} className="text-start px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>
            )}
            {!isLoading && (data?.data?.length ?? 0) === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('no_data')}</td></tr>
            )}
            {data?.data?.map(trip => (
              <tr key={trip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {trip.origin} → {trip.destination}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {trip.driver ? `${trip.driver.firstName} ${trip.driver.lastName}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {trip.truck ? trip.truck.plateNumber : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[trip.status] ?? ''}`}>
                    {t(`status_values.${trip.status}` as Parameters<typeof t>[0])}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(trip.scheduledAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { if (confirm(t('confirm_delete'))) deleteMutation.mutate(trip.id); }}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    {t('delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data?.meta?.totalPages ?? 1) > 1 && (
          <div className="flex justify-center gap-2 p-4">
            {Array.from({ length: data!.meta!.totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-blue-600 text-white' : 'border text-gray-600 hover:bg-gray-50'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
