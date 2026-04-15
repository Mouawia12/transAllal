'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Radio,
  UserRound,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CompanyScopeEmpty } from '../../../components/shared/company-scope-empty';
import {
  ManagementActionButton,
  ManagementCallout,
  ManagementCheckboxField,
  ManagementDesktopTable,
  ManagementField,
  ManagementFormActions,
  ManagementHero,
  ManagementInputField,
  MANAGEMENT_FIELD_CLASSNAME,
  MANAGEMENT_TABLE_CELL_CLASSNAME,
  MANAGEMENT_TABLE_HEAD_CLASSNAME,
  ManagementInlineState,
  ManagementMobileCard,
  ManagementMobileList,
  ManagementPanel,
  ManagementPageState,
  ManagementRowsSkeleton,
  ManagementStatCard,
  ManagementTableSkeleton,
  ManagementTableState,
  PaginationBar,
  SearchField,
  ToneBadge,
} from '../../../components/shared/management-ui';
import { ApiError, apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import type { ApiResponse, Driver } from '../../../types/shared';

const initialDriverForm = {
  firstName: '',
  lastName: '',
  phone: '',
  licenseNumber: '',
  licenseExpiry: '',
  initialPassword: '',
  isActive: true,
};

type DriverFormState = typeof initialDriverForm;
type DriverFormField = keyof DriverFormState;
type DriverFormErrors = Partial<Record<DriverFormField, string>>;

interface DriverFeedback {
  tone: 'success' | 'danger';
  title: string;
  description: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function formatSessionDuration(sessionStartedAt: string | null): string {
  if (!sessionStartedAt) return '—';
  const totalSeconds = Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000);
  if (totalSeconds < 0) return '—';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '< 1m';
}

function batteryTone(level: number | null) {
  if (level === null) return 'border-slate-200 bg-slate-100 text-slate-500';
  if (level > 50) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (level > 20) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
}

function batteryLabel(level: number | null): string {
  if (level === null) return '—';
  return `${Math.round(level)}%`;
}

function driverStatusTone(isActive: boolean) {
  return isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-100 text-slate-600';
}

function connectionTone(isOnline: boolean) {
  return isOnline
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : 'border-slate-200 bg-slate-100 text-slate-600';
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function isPastDateInput(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
}

function validateDriverForm(
  form: DriverFormState,
  isEditing: boolean,
  t: ReturnType<typeof useTranslations>,
): DriverFormErrors {
  const errors: DriverFormErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = t('drivers_page.first_name_required');
  }

  if (!form.lastName.trim()) {
    errors.lastName = t('drivers_page.last_name_required');
  }

  const normalizedPhone = form.phone.trim();
  if (!normalizedPhone) {
    errors.phone = t('drivers_page.phone_required');
  } else if (!/^[0-9+\-\s]{8,20}$/.test(normalizedPhone)) {
    errors.phone = t('drivers_page.phone_invalid');
  }

  if (!form.licenseNumber.trim()) {
    errors.licenseNumber = t('drivers_page.license_number_required');
  }

  if (!form.licenseExpiry) {
    errors.licenseExpiry = t('drivers_page.license_expiry_required');
  } else if (!isValidDateInput(form.licenseExpiry)) {
    errors.licenseExpiry = t('drivers_page.license_expiry_invalid');
  } else if (isPastDateInput(form.licenseExpiry)) {
    errors.licenseExpiry = t('drivers_page.license_expiry_past');
  }

  if (form.initialPassword.trim() && form.initialPassword.trim().length < 6) {
    errors.initialPassword = t('drivers_page.password_short');
  }

  return errors;
}

function resolveDriverMutationError(
  error: unknown,
  t: ReturnType<typeof useTranslations>,
) {
  if (error instanceof ApiError) {
    if (error.code === 'DRIVER_PHONE_EXISTS') {
      return t('drivers_page.phone_exists');
    }

    if (error.code === 'DRIVER_LICENSE_EXISTS') {
      return t('drivers_page.license_exists');
    }

    if (error.code === 'RESOURCE_CONFLICT') {
      return t('drivers_page.conflict_exists');
    }

    if (
      error.code === 'VALIDATION_ERROR' &&
      Array.isArray(error.details) &&
      typeof error.details[0] === 'string'
    ) {
      return error.details[0];
    }

    if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_ABORTED') {
      return t('drivers_page.network_error');
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t('drivers_page.unexpected_error');
}

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
  const [formErrors, setFormErrors] = useState<DriverFormErrors>({});
  const [feedback, setFeedback] = useState<DriverFeedback | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Tick every minute so session durations re-render without a full refetch
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const canManageDrivers =
    user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';
  const isEditing = editingDriverId !== null;

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', companyId, page, search],
    queryFn: () =>
      apiClient.get<ApiResponse<Driver[]>>(ENDPOINTS.DRIVERS, {
        companyId,
        page,
        limit: 20,
        ...(search && { search }),
      }),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: DriverFormState) =>
      apiClient.post<{ data: { driver: Driver; temporaryPassword?: string } }>(
        ENDPOINTS.DRIVERS,
        {
          companyId,
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
      setFeedback({
        tone: 'success',
        title: t('drivers_page.create_success_title'),
        description: t('drivers_page.create_success_description'),
      });
      setFormErrors({});
      setForm(initialDriverForm);
      setShowCreate(false);
      setEditingDriverId(null);
      setPage(1);
      void qc.invalidateQueries({ queryKey: ['drivers', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
    onError: (error) => {
      setFeedback({
        tone: 'danger',
        title: t('drivers_page.save_failed_title'),
        description: resolveDriverMutationError(error, t),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: DriverFormState) =>
      apiClient.patch<{ data: Driver }>(ENDPOINTS.DRIVER(editingDriverId!), {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        licenseNumber: payload.licenseNumber.trim(),
        licenseExpiry: payload.licenseExpiry,
        isActive: payload.isActive,
        initialPassword: payload.initialPassword.trim() || undefined,
      }),
    onSuccess: () => {
      setFeedback({
        tone: 'success',
        title: t('drivers_page.update_success_title'),
        description: t('drivers_page.update_success_description'),
      });
      setFormErrors({});
      setForm(initialDriverForm);
      setShowCreate(false);
      setEditingDriverId(null);
      void qc.invalidateQueries({ queryKey: ['drivers', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
    onError: (error) => {
      setFeedback({
        tone: 'danger',
        title: t('drivers_page.save_failed_title'),
        description: resolveDriverMutationError(error, t),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(ENDPOINTS.DRIVER(id)),
    onSuccess: (_, id) => {
      if (editingDriverId === id) {
        setForm(initialDriverForm);
        setShowCreate(false);
        setEditingDriverId(null);
        setFormErrors({});
      }

      setFeedback({
        tone: 'success',
        title: t('drivers_page.delete_success_title'),
        description: t('drivers_page.delete_success_description'),
      });
      void qc.invalidateQueries({ queryKey: ['drivers', companyId] });
      void qc.invalidateQueries({ queryKey: ['reports', 'summary', companyId] });
    },
    onError: (error) => {
      setFeedback({
        tone: 'danger',
        title: t('drivers_page.delete_failed_title'),
        description: resolveDriverMutationError(error, t),
      });
    },
  });

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!hasHydrated) {
    return (
      <ManagementPageState
        title={t('ui_state.loading_title')}
        description={t('ui_state.loading_description')}
      />
    );
  }

  if (!user || !companyId) {
    return <CompanyScopeEmpty />;
  }

  const drivers = data?.data ?? [];
  const totalDrivers = data?.meta?.total ?? drivers.length;
  const totalPages = data?.meta?.totalPages ?? 1;
  const activeDrivers = drivers.filter((driver) => driver.isActive).length;
  const inactiveDrivers = drivers.length - activeDrivers;
  const onlineDrivers = drivers.filter((driver) => driver.isOnline).length;
  const activeMutation = isEditing ? updateMutation : createMutation;
  const showActions = canManageDrivers;

  const resetForm = () => {
    setShowCreate(false);
    setEditingDriverId(null);
    setForm(initialDriverForm);
    setFormErrors({});
    setFeedback(null);
    setShowPassword(false);
    createMutation.reset();
    updateMutation.reset();
  };

  const startCreate = () => {
    setCreatedPassword(null);
    setFeedback(null);
    setEditingDriverId(null);
    setForm(initialDriverForm);
    setFormErrors({});
    setShowPassword(false);
    setShowCreate(true);
    createMutation.reset();
    updateMutation.reset();
  };

  const startEdit = (driver: Driver) => {
    setCreatedPassword(null);
    setFeedback(null);
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
    setFormErrors({});
    setShowPassword(false);
    setShowCreate(true);
    createMutation.reset();
    updateMutation.reset();
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateDriverForm(form, isEditing, t);
    setFeedback(null);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setFeedback({
        tone: 'danger',
        title: t('drivers_page.validation_title'),
        description: t('drivers_page.validation_description'),
      });
      return;
    }

    setFormErrors({});
    activeMutation.mutate(form);
  };

  const updateFormValue = <K extends DriverFormField>(
    field: K,
    value: DriverFormState[K],
  ) => {
    setFeedback(null);
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <ManagementHero
        eyebrow={t('drivers_page.eyebrow')}
        title={t('nav.drivers')}
        description={t('drivers_page.description')}
        className="bg-[linear-gradient(135deg,#0c1820_0%,#163149_48%,#22566e_100%)]"
        actions={
          canManageDrivers ? (
            <ManagementActionButton
              onClick={() => {
                if (showCreate && !isEditing) {
                  resetForm();
                  return;
                }

                startCreate();
              }}
              tone="hero"
              size="md"
              className="py-3"
            >
              {showCreate && !isEditing ? <X size={16} /> : <Plus size={16} />}
              {showCreate && !isEditing ? t('cancel') : t('create_driver')}
            </ManagementActionButton>
          ) : null
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ManagementStatCard
            icon={UserRound}
            label={t('drivers_page.visible')}
            value={drivers.length}
            note={t('drivers_page.visible_note')}
          />
          <ManagementStatCard
            icon={Radio}
            label={t('drivers_page.online_in_view')}
            value={onlineDrivers}
            note={t('drivers_page.online_note')}
            toneClassName="bg-sky-400/18 text-sky-50"
          />
          <ManagementStatCard
            icon={BadgeCheck}
            label={t('drivers_page.active_in_view')}
            value={activeDrivers}
            note={t('drivers_page.active_note')}
            toneClassName="bg-emerald-400/18 text-emerald-50"
          />
        </div>
      </ManagementHero>

      {feedback ? (
        <ManagementCallout
          tone={feedback.tone}
          title={feedback.title}
          description={feedback.description}
        />
      ) : null}

      {createdPassword ? (
        <div className="flex flex-col gap-3 rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,#fff7e8_0%,#fff3d6_100%)] p-5 text-amber-950 shadow-[var(--shadow-panel)] md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-200/70 p-3 text-amber-900">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="font-semibold">{t('temporary_password')}</p>
              <p className="mt-1 font-mono text-lg">{createdPassword}</p>
              <p className="mt-2 text-sm leading-6 text-amber-900/80">
                {t('temporary_password_help')}
              </p>
            </div>
          </div>
          <ManagementActionButton
            onClick={() => setCreatedPassword(null)}
            tone="neutral"
            className="border-amber-300 bg-white/70 text-amber-900 hover:bg-white"
          >
            {t('close_notice')}
          </ManagementActionButton>
        </div>
      ) : null}

      {canManageDrivers && showCreate ? (
        <ManagementPanel
          eyebrow={isEditing ? t('edit') : t('create')}
          title={
            isEditing
              ? t('drivers_page.form_edit_title')
              : t('drivers_page.form_create_title')
          }
          description={
            isEditing
              ? t('drivers_page.form_edit_description')
              : t('drivers_page.form_create_description')
          }
          headerSlot={
            <ToneBadge
              label={isEditing ? t('update_driver') : t('create_driver')}
              toneClassName="border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
            />
          }
        >
          <form onSubmit={handleCreate} aria-busy={activeMutation.isPending}>
            <fieldset
              disabled={activeMutation.isPending}
              className="grid gap-4 lg:grid-cols-2"
            >
            <ManagementField label={t('first_name')}>
              <ManagementInputField
                required
                value={form.firstName}
                aria-invalid={Boolean(formErrors.firstName)}
                onChange={(event) => updateFormValue('firstName', event.target.value)}
              />
              {formErrors.firstName ? (
                <p className="text-xs leading-5 text-red-600">{formErrors.firstName}</p>
              ) : null}
            </ManagementField>
            <ManagementField label={t('last_name')}>
              <ManagementInputField
                required
                value={form.lastName}
                aria-invalid={Boolean(formErrors.lastName)}
                onChange={(event) => updateFormValue('lastName', event.target.value)}
              />
              {formErrors.lastName ? (
                <p className="text-xs leading-5 text-red-600">{formErrors.lastName}</p>
              ) : null}
            </ManagementField>
            <ManagementField label={t('phone')}>
              <ManagementInputField
                required
                value={form.phone}
                aria-invalid={Boolean(formErrors.phone)}
                onChange={(event) => updateFormValue('phone', event.target.value)}
              />
              {formErrors.phone ? (
                <p className="text-xs leading-5 text-red-600">{formErrors.phone}</p>
              ) : null}
            </ManagementField>
            <ManagementField label={t('license_number')}>
              <ManagementInputField
                required
                value={form.licenseNumber}
                aria-invalid={Boolean(formErrors.licenseNumber)}
                onChange={(event) =>
                  updateFormValue('licenseNumber', event.target.value)
                }
              />
              {formErrors.licenseNumber ? (
                <p className="text-xs leading-5 text-red-600">{formErrors.licenseNumber}</p>
              ) : null}
            </ManagementField>
            <ManagementField label={t('license_expiry')}>
              <ManagementInputField
                required
                type="date"
                value={form.licenseExpiry}
                aria-invalid={Boolean(formErrors.licenseExpiry)}
                onChange={(event) =>
                  updateFormValue('licenseExpiry', event.target.value)
                }
              />
              {formErrors.licenseExpiry ? (
                <p className="text-xs leading-5 text-red-600">{formErrors.licenseExpiry}</p>
              ) : null}
            </ManagementField>
            <ManagementField
              label={isEditing ? t('password') : t('initial_password')}
              optionalLabel={t('optional')}
            >
              <div className="relative">
                <input
                  id="driver-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.initialPassword}
                  aria-invalid={Boolean(formErrors.initialPassword)}
                  className={`${MANAGEMENT_FIELD_CLASSNAME} w-full pe-11`}
                  onChange={(event) =>
                    updateFormValue('initialPassword', event.target.value)
                  }
                />
                <button
                  type="button"
                  aria-controls="driver-password"
                  aria-pressed={showPassword}
                  aria-label={
                    showPassword
                      ? t('auth.hidePassword')
                      : t('auth.showPassword')
                  }
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute end-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[rgba(15,23,42,0.06)] hover:text-[var(--color-ink)] motion-reduce:transition-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formErrors.initialPassword ? (
                <p className="text-xs leading-5 text-red-600">
                  {formErrors.initialPassword}
                </p>
              ) : null}
            </ManagementField>

            <ManagementCallout
              className="lg:col-span-2"
              tone="info"
              description={
                isEditing
                  ? t('drivers_page.password_update_help')
                  : t('temporary_password_help')
              }
            />

            {isEditing ? (
              <ManagementCheckboxField
                checked={form.isActive}
                onChange={(event) =>
                  updateFormValue('isActive', event.target.checked)
                }
                label={t('active')}
                className="lg:col-span-2"
              />
            ) : null}

            <ManagementFormActions className="lg:col-span-2">
              <ManagementActionButton tone="neutral" size="md" onClick={resetForm}>
                {t('cancel')}
              </ManagementActionButton>
              <ManagementActionButton
                type="submit"
                loading={activeMutation.isPending}
                tone="solid"
                size="md"
              >
                {isEditing ? t('update_driver') : t('create_driver')}
              </ManagementActionButton>
            </ManagementFormActions>
            </fieldset>
          </form>
        </ManagementPanel>
      ) : null}

      <ManagementPanel
        title={t('drivers_page.filters_title')}
        description={t('drivers_page.filters_description')}
        bodyClassName="space-y-4"
        headerSlot={
          <ToneBadge
            label={`${t('reports.total')}: ${totalDrivers}`}
            toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
          />
        }
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t('drivers_page.search_placeholder')}
          hint={t('drivers_page.search_hint')}
        />
      </ManagementPanel>

      <ManagementPanel
        eyebrow={t('nav.drivers')}
        title={t('drivers_page.table_title')}
        description={t('drivers_page.table_description')}
        bodyClassName="p-0"
      >
        <ManagementMobileList>
          {isLoading ? (
            <ManagementRowsSkeleton count={3} detailColumns={2} />
          ) : null}

          {!isLoading && drivers.length === 0 ? (
            <ManagementInlineState
              title={t('ui_state.empty_title')}
              description={t('ui_state.empty_description')}
            />
          ) : null}

          {!isLoading &&
            drivers.map((driver) => (
              <ManagementMobileCard
                key={driver.id}
                title={`${driver.firstName} ${driver.lastName}`}
                subtitle={driver.phone}
                headerSlot={
                  <div className="flex flex-col items-end gap-2">
                    <ToneBadge
                      label={driver.isActive ? t('active') : t('inactive')}
                      toneClassName={driverStatusTone(driver.isActive)}
                    />
                    <ToneBadge
                      label={
                        driver.isOnline ? t('tracking.online') : t('tracking.offline')
                      }
                      toneClassName={connectionTone(driver.isOnline)}
                    />
                  </div>
                }
                footer={
                  showActions ? (
                    <>
                      <ManagementActionButton onClick={() => startEdit(driver)}>
                        {t('edit')}
                      </ManagementActionButton>
                      <ManagementActionButton
                        onClick={() => {
                          if (confirm(t('confirm_delete'))) {
                            deleteMutation.mutate(driver.id);
                          }
                        }}
                        tone="danger"
                      >
                        {t('delete')}
                      </ManagementActionButton>
                    </>
                  ) : undefined
                }
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {t('license_number')}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {driver.licenseNumber}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {t('license_expiry')}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {formatDate(driver.licenseExpiry)}
                    </p>
                  </div>
                  {driver.isOnline ? (
                    <>
                      <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          {t('drivers_page.battery')}
                        </p>
                        <p className={`mt-1 text-sm font-semibold ${batteryTone(driver.batteryLevel).split(' ').find(c => c.startsWith('text-')) ?? 'text-[var(--color-ink)]'}`}>
                          {batteryLabel(driver.batteryLevel)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          {t('drivers_page.session_duration')}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {formatSessionDuration(driver.sessionStartedAt)}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </ManagementMobileCard>
            ))}
        </ManagementMobileList>

        <ManagementDesktopTable>
          <table className="min-w-full text-sm" aria-busy={isLoading}>
            <caption className="sr-only">
              {t('drivers_page.table_title')}. {t('drivers_page.table_description')}
            </caption>
            <thead className="bg-[rgba(15,23,42,0.04)]">
              <tr>
                {[
                  t('name'),
                  t('phone'),
                  t('license_number'),
                  t('license_expiry'),
                  t('status'),
                  t('go_online'),
                  t('drivers_page.battery'),
                  t('drivers_page.session_duration'),
                  ...(showActions ? [t('actions')] : []),
                ].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className={MANAGEMENT_TABLE_HEAD_CLASSNAME}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,23,42,0.08)]">
              {isLoading ? (
                <ManagementTableSkeleton
                  colSpan={showActions ? 9 : 8}
                  rows={4}
                />
              ) : null}

              {!isLoading && drivers.length === 0 ? (
                <ManagementTableState
                  colSpan={showActions ? 9 : 8}
                  title={t('ui_state.empty_title')}
                  description={t('ui_state.empty_description')}
                />
              ) : null}

              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="transition hover:bg-white/70 motion-reduce:transition-none"
                >
                  <th
                    scope="row"
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} font-semibold text-[var(--color-ink)]`}
                  >
                    {driver.firstName} {driver.lastName}
                  </th>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {driver.phone}
                  </td>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {driver.licenseNumber}
                  </td>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {formatDate(driver.licenseExpiry)}
                  </td>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    <ToneBadge
                      label={driver.isActive ? t('active') : t('inactive')}
                      toneClassName={driverStatusTone(driver.isActive)}
                    />
                  </td>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    <ToneBadge
                      label={
                        driver.isOnline ? t('tracking.online') : t('tracking.offline')
                      }
                      toneClassName={connectionTone(driver.isOnline)}
                    />
                  </td>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    <ToneBadge
                      label={batteryLabel(driver.batteryLevel)}
                      toneClassName={batteryTone(driver.batteryLevel)}
                    />
                  </td>
                  <td className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}>
                    {driver.isOnline ? formatSessionDuration(driver.sessionStartedAt) : '—'}
                  </td>
                  {showActions ? (
                    <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                      <div className="flex flex-wrap items-center gap-2">
                        <ManagementActionButton onClick={() => startEdit(driver)}>
                          {t('edit')}
                        </ManagementActionButton>
                        <ManagementActionButton
                          onClick={() => {
                            if (confirm(t('confirm_delete'))) {
                              deleteMutation.mutate(driver.id);
                            }
                          }}
                          tone="danger"
                        >
                          {t('delete')}
                        </ManagementActionButton>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </ManagementDesktopTable>

        <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
      </ManagementPanel>
    </div>
  );
}
