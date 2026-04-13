'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import type { Truck, ApiResponse } from '../../../types/shared';

const INPUT_CLASSNAME =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

const initialTruckForm = {
  plateNumber: '',
  brand: '',
  model: '',
  year: '',
  capacityTons: '',
  isActive: true,
};

export default function TrucksPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { user, hasHydrated, companyId } = useCompanyScope();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [form, setForm] = useState(initialTruckForm);

  const canManageTrucks =
    user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';
  const isEditing = editingTruckId !== null;

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

  const createMutation = useMutation({
    mutationFn: (payload: typeof initialTruckForm) =>
      apiClient.post<{ data: Truck }>(ENDPOINTS.TRUCKS, {
        plateNumber: payload.plateNumber.trim(),
        brand: payload.brand.trim() || undefined,
        model: payload.model.trim() || undefined,
        year: payload.year ? Number(payload.year) : undefined,
        capacityTons: payload.capacityTons
          ? Number(payload.capacityTons)
          : undefined,
      }),
    onSuccess: () => {
      setForm(initialTruckForm);
      setShowCreate(false);
      setPage(1);
      void qc.invalidateQueries({ queryKey: ['trucks', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: typeof initialTruckForm) =>
      apiClient.patch<{ data: Truck }>(ENDPOINTS.TRUCK(editingTruckId!), {
        plateNumber: payload.plateNumber.trim(),
        brand: payload.brand.trim() || undefined,
        model: payload.model.trim() || undefined,
        year: payload.year ? Number(payload.year) : undefined,
        capacityTons: payload.capacityTons
          ? Number(payload.capacityTons)
          : undefined,
        isActive: payload.isActive,
      }),
    onSuccess: () => {
      setForm(initialTruckForm);
      setShowCreate(false);
      setEditingTruckId(null);
      void qc.invalidateQueries({ queryKey: ['trucks', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(ENDPOINTS.TRUCK(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trucks', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
  });

  if (!hasHydrated) {
    return <p className="text-sm text-gray-400">{t('loading')}</p>;
  }

  if (!user || !companyId) {
    return <CompanyScopeEmpty />;
  }

  const activeMutation = isEditing ? updateMutation : createMutation;

  const resetForm = () => {
    setShowCreate(false);
    setEditingTruckId(null);
    setForm(initialTruckForm);
    createMutation.reset();
    updateMutation.reset();
  };

  const startCreate = () => {
    setEditingTruckId(null);
    setForm(initialTruckForm);
    setShowCreate(true);
    createMutation.reset();
    updateMutation.reset();
  };

  const startEdit = (truck: Truck) => {
    setEditingTruckId(truck.id);
    setForm({
      plateNumber: truck.plateNumber,
      brand: truck.brand ?? '',
      model: truck.model ?? '',
      year: truck.year != null ? String(truck.year) : '',
      capacityTons:
        truck.capacityTons != null ? String(truck.capacityTons) : '',
      isActive: truck.isActive,
    });
    setShowCreate(true);
    createMutation.reset();
    updateMutation.reset();
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    activeMutation.mutate(form);
  };

  const showActions = canManageTrucks;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.trucks')}</h1>
        {canManageTrucks && (
          <button
            onClick={() => {
              if (showCreate && !isEditing) {
                resetForm();
                return;
              }
              startCreate();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            {showCreate && !isEditing ? t('cancel') : t('create_truck')}
          </button>
        )}
      </div>
      {canManageTrucks && showCreate && (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 lg:grid-cols-2"
        >
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('plate')}</span>
            <input
              required
              value={form.plateNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  plateNumber: event.target.value,
                }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('brand')} <span className="text-xs opacity-70">({t('optional')})</span></span>
            <input
              value={form.brand}
              onChange={(event) =>
                setForm((current) => ({ ...current, brand: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('model')} <span className="text-xs opacity-70">({t('optional')})</span></span>
            <input
              value={form.model}
              onChange={(event) =>
                setForm((current) => ({ ...current, model: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('year')} <span className="text-xs opacity-70">({t('optional')})</span></span>
            <input
              type="number"
              min="1900"
              max="2100"
              value={form.year}
              onChange={(event) =>
                setForm((current) => ({ ...current, year: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300 lg:col-span-2">
            <span>{t('capacity')} <span className="text-xs opacity-70">({t('optional')})</span></span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.capacityTons}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  capacityTons: event.target.value,
                }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          {createMutation.error instanceof Error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 lg:col-span-2">
              {createMutation.error.message}
            </div>
          )}
          {updateMutation.error instanceof Error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 lg:col-span-2">
              {updateMutation.error.message}
            </div>
          )}
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
          <div className="flex items-center justify-end gap-3 lg:col-span-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
              }}
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
                  ? t('update_truck')
                  : t('create_truck')}
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
              {[t('plate'), t('brand'), t('model'), t('year'), t('capacity'), t('status'), ...(showActions ? [t('actions')] : [])].map(h => (
                <th key={h} className="text-start px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && (
              <tr><td colSpan={showActions ? 7 : 6} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>
            )}
            {!isLoading && (data?.data?.length ?? 0) === 0 && (
              <tr><td colSpan={showActions ? 7 : 6} className="text-center py-8 text-gray-400">{t('no_data')}</td></tr>
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
                {showActions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(truck)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t('confirm_delete'))) {
                            deleteMutation.mutate(truck.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                )}
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
