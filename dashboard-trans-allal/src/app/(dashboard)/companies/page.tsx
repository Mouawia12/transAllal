'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import type { Company, ApiResponse } from '../../../types/shared';

export default function CompaniesPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, search],
    queryFn: () => apiClient.get<ApiResponse<Company[]>>(ENDPOINTS.COMPANIES, { page, limit: 20, ...(search && { search }) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(ENDPOINTS.COMPANY(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.companies')}</h1>
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
              {[t('name'), t('email'), t('phone'), t('status'), t('actions')].map(h => (
                <th key={h} className="text-start px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>
            )}
            {!isLoading && (data?.data?.length ?? 0) === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('no_data')}</td></tr>
            )}
            {data?.data?.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.isActive ? t('active') : t('inactive')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { if (confirm(t('confirm_delete'))) deleteMutation.mutate(c.id); }}
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
