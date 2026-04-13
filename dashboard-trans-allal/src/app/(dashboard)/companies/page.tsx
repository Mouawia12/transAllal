'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import type { Company, ApiResponse } from '../../../types/shared';

const INPUT_CLASSNAME =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

const emptyCompanyForm = {
  name: '',
  taxId: '',
  phone: '',
  email: '',
  address: '',
  isActive: true,
};

export default function CompaniesPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCompanyForm);

  const isEditing = editingCompanyId !== null;

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, search],
    queryFn: () => apiClient.get<ApiResponse<Company[]>>(ENDPOINTS.COMPANIES, { page, limit: 20, ...(search && { search }) }),
  });

  const invalidateCompanyQueries = () => {
    void qc.invalidateQueries({ queryKey: ['companies'] });
    void qc.invalidateQueries({ queryKey: ['companies', 'scope-selector'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: typeof emptyCompanyForm) =>
      apiClient.post<{ data: Company }>(ENDPOINTS.COMPANIES, {
        name: payload.name.trim(),
        taxId: payload.taxId.trim() || undefined,
        phone: payload.phone.trim() || undefined,
        email: payload.email.trim() || undefined,
        address: payload.address.trim() || undefined,
      }),
    onSuccess: () => {
      setForm(emptyCompanyForm);
      setShowForm(false);
      setPage(1);
      invalidateCompanyQueries();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: typeof emptyCompanyForm) =>
      apiClient.patch<{ data: Company }>(ENDPOINTS.COMPANY(editingCompanyId!), {
        name: payload.name.trim(),
        taxId: payload.taxId.trim() || undefined,
        phone: payload.phone.trim() || undefined,
        email: payload.email.trim() || undefined,
        address: payload.address.trim() || undefined,
        isActive: payload.isActive,
      }),
    onSuccess: () => {
      setForm(emptyCompanyForm);
      setShowForm(false);
      setEditingCompanyId(null);
      invalidateCompanyQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(ENDPOINTS.COMPANY(id)),
    onSuccess: () => invalidateCompanyQueries(),
  });

  const activeMutation = isEditing ? updateMutation : createMutation;

  const resetForm = () => {
    setShowForm(false);
    setEditingCompanyId(null);
    setForm(emptyCompanyForm);
    createMutation.reset();
    updateMutation.reset();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    activeMutation.mutate(form);
  };

  const startCreate = () => {
    setEditingCompanyId(null);
    setForm(emptyCompanyForm);
    setShowForm(true);
    createMutation.reset();
    updateMutation.reset();
  };

  const startEdit = (company: Company) => {
    setEditingCompanyId(company.id);
    setForm({
      name: company.name,
      taxId: company.taxId ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      address: company.address ?? '',
      isActive: company.isActive,
    });
    setShowForm(true);
    createMutation.reset();
    updateMutation.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.companies')}</h1>
        <button
          onClick={() => {
            if (showForm && !isEditing) {
              resetForm();
              return;
            }
            startCreate();
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {showForm && !isEditing ? t('cancel') : t('create_company')}
        </button>
      </div>
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 lg:grid-cols-2"
        >
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('name')}</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('tax_id')} <span className="text-xs opacity-70">({t('optional')})</span></span>
            <input
              value={form.taxId}
              onChange={(event) =>
                setForm((current) => ({ ...current, taxId: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('email')} <span className="text-xs opacity-70">({t('optional')})</span></span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('phone')} <span className="text-xs opacity-70">({t('optional')})</span></span>
            <input
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300 lg:col-span-2">
            <span>{t('address')} <span className="text-xs opacity-70">({t('optional')})</span></span>
            <textarea
              rows={3}
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({ ...current, address: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          {isEditing && (
            <label className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 lg:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{t('active')}</span>
            </label>
          )}
          {activeMutation.error instanceof Error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 lg:col-span-2">
              {activeMutation.error.message}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 lg:col-span-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={activeMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeMutation.isPending
                ? t('loading')
                : isEditing
                  ? t('update_company')
                  : t('create_company')}
            </button>
          </div>
        </form>
      )}
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => { if (confirm(t('confirm_delete'))) deleteMutation.mutate(c.id); }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      {t('delete')}
                    </button>
                  </div>
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
