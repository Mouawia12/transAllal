'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useAuthStore } from '../../../lib/auth/auth-store';
import type { Truck, ApiResponse } from '../../../types/shared';

export default function TrucksPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const companyId = user?.companyId ?? '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['trucks', companyId, page, search],
    queryFn: () => apiClient.get<ApiResponse<Truck[]>>(ENDPOINTS.TRUCKS, {
      companyId,
      page,
      limit: 20,
      ...(search && { search }),
    }),
    enabled: !!companyId,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.trucks')}</h1>
      </div>
      <div className="flex gap-3">
        <input
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm w-64 bg-white dark:bg-gray-800 dark:border-gray-600"
        />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {[t('plate'), t('brand'), t('model'), t('year'), t('capacity'), t('status')].map(h => (
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
            {data?.data?.map(truck => (
              <tr key={truck.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{truck.plateNumber}</td>
                <td className="px-4 py-3 text-gray-500">{truck.brand ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{truck.model ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{truck.year ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{truck.capacityTons != null ? `${truck.capacityTons} t` : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${truck.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {truck.isActive ? t('active') : t('inactive')}
                  </span>
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
