'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import type { Driver, ApiResponse } from '../../../types/shared';

const INPUT_CLASSNAME =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

const initialDriverForm = {
  firstName: '',
  lastName: '',
  phone: '',
  licenseNumber: '',
  licenseExpiry: '',
  initialPassword: '',
  isActive: true,
};

export default function DriversPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { user, hasHydrated, companyId } = useCompanyScope();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [form, setForm] = useState(initialDriverForm);

  const canManageDrivers =
    user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';
  const isEditing = editingDriverId !== null;

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', companyId, page, search],
    queryFn: () => apiClient.get<ApiResponse<Driver[]>>(ENDPOINTS.DRIVERS, {
      companyId,
      page,
      limit: 20,
      ...(search && { search }),
    }),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof initialDriverForm) =>
      apiClient.post<{ data: { driver: Driver; temporaryPassword?: string } }>(
        ENDPOINTS.DRIVERS,
        {
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          phone: payload.phone.trim(),
          licenseNumber: payload.licenseNumber.trim(),
          licenseExpiry: payload.licenseExpiry,
          initialPassword: payload.initialPassword.trim() || undefined,
        },
      ),
    onSuccess: (response) => {
      setCreatedPassword(response.data.temporaryPassword ?? null);
      setForm(initialDriverForm);
      setShowCreate(false);
      setEditingDriverId(null);
      setPage(1);
      void qc.invalidateQueries({ queryKey: ['drivers', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: typeof initialDriverForm) =>
      apiClient.patch<{ data: Driver }>(ENDPOINTS.DRIVER(editingDriverId!), {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        licenseNumber: payload.licenseNumber.trim(),
        licenseExpiry: payload.licenseExpiry,
        isActive: payload.isActive,
      }),
    onSuccess: () => {
      setForm(initialDriverForm);
      setShowCreate(false);
      setEditingDriverId(null);
      void qc.invalidateQueries({ queryKey: ['drivers', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(ENDPOINTS.DRIVER(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['drivers', companyId] });
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
    setEditingDriverId(null);
    setForm(initialDriverForm);
    createMutation.reset();
    updateMutation.reset();
  };

  const startCreate = () => {
    setCreatedPassword(null);
    setEditingDriverId(null);
    setForm(initialDriverForm);
    setShowCreate(true);
    createMutation.reset();
    updateMutation.reset();
  };

  const startEdit = (driver: Driver) => {
    setCreatedPassword(null);
    setEditingDriverId(driver.id);
    setForm({
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry.slice(0, 10),
      initialPassword: '',
      isActive: driver.isActive,
    });
    setShowCreate(true);
    createMutation.reset();
    updateMutation.reset();
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    activeMutation.mutate(form);
  };

  const showActions = canManageDrivers;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.drivers')}</h1>
        {canManageDrivers && (
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
            {showCreate && !isEditing ? t('cancel') : t('create_driver')}
          </button>
        )}
      </div>
      {createdPassword && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div>
            <p className="font-semibold">{t('temporary_password')}</p>
            <p className="mt-1 font-mono text-base">{createdPassword}</p>
            <p className="mt-2 text-xs opacity-80">{t('temporary_password_help')}</p>
          </div>
          <button
            onClick={() => setCreatedPassword(null)}
            className="text-xs font-medium underline underline-offset-4"
          >
            {t('close_notice')}
          </button>
        </div>
      )}
      {canManageDrivers && showCreate && (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 lg:grid-cols-2"
        >
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('first_name')}</span>
            <input
              required
              value={form.firstName}
              onChange={(event) =>
                setForm((current) => ({ ...current, firstName: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('last_name')}</span>
            <input
              required
              value={form.lastName}
              onChange={(event) =>
                setForm((current) => ({ ...current, lastName: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('phone')}</span>
            <input
              required
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('license_number')}</span>
            <input
              required
              value={form.licenseNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  licenseNumber: event.target.value,
                }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{t('license_expiry')}</span>
            <input
              required
              type="date"
              value={form.licenseExpiry}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  licenseExpiry: event.target.value,
                }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <label className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>
              {t('initial_password')} <span className="text-xs opacity-70">({t('optional')})</span>
            </span>
            <input
              value={form.initialPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  initialPassword: event.target.value,
                }))
              }
              className={INPUT_CLASSNAME}
            />
          </label>
          <div className="lg:col-span-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('temporary_password_help')}
            </p>
          </div>
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
                  ? t('update_driver')
                  : t('create_driver')}
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
              {[t('name'), t('phone'), t('license_number'), t('license_expiry'), t('status'), t('go_online'), ...(showActions ? [t('actions')] : [])].map(h => (
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
            {data?.data?.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.firstName} {d.lastName}</td>
                <td className="px-4 py-3 text-gray-500">{d.phone}</td>
                <td className="px-4 py-3 text-gray-500">{d.licenseNumber}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(d.licenseExpiry).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {d.isActive ? t('active') : t('inactive')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isOnline ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {d.isOnline ? t('tracking.online') : t('tracking.offline')}
                  </span>
                </td>
                {showActions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(d)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t('confirm_delete'))) {
                            deleteMutation.mutate(d.id);
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
