'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Gauge, Plus, Truck, X } from 'lucide-react';
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
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import { useCompanyScope } from '../../../lib/company/use-company-scope';
import type { ApiResponse, Truck as TruckEntity } from '../../../types/shared';

const initialTruckForm = {
  plateNumber: '',
  brand: '',
  model: '',
  year: '',
  capacityTons: '',
  isActive: true,
};

function truckStatusTone(isActive: boolean) {
  return isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-100 text-slate-600';
}

function formatCapacity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

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
    queryFn: () =>
      apiClient.get<ApiResponse<TruckEntity[]>>(ENDPOINTS.TRUCKS, {
        companyId,
        page,
        limit: 20,
        ...(search && { search }),
      }),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof initialTruckForm) =>
      apiClient.post<{ data: TruckEntity }>(ENDPOINTS.TRUCKS, {
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
      apiClient.patch<{ data: TruckEntity }>(ENDPOINTS.TRUCK(editingTruckId!), {
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

  const trucks = data?.data ?? [];
  const totalTrucks = data?.meta?.total ?? trucks.length;
  const totalPages = data?.meta?.totalPages ?? 1;
  const activeTrucks = trucks.filter((truck) => truck.isActive).length;
  const capacityInView = trucks.reduce(
    (sum, truck) => sum + (truck.capacityTons ?? 0),
    0,
  );
  const activeMutation = isEditing ? updateMutation : createMutation;
  const showActions = canManageTrucks;

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

  const startEdit = (truck: TruckEntity) => {
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

  return (
    <div className="space-y-5 md:space-y-6">
      <ManagementHero
        eyebrow={t('trucks_page.eyebrow')}
        title={t('nav.trucks')}
        description={t('trucks_page.description')}
        className="bg-[linear-gradient(135deg,#111827_0%,#23435f_46%,#2d6782_100%)]"
        actions={
          canManageTrucks ? (
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
              {showCreate && !isEditing ? t('cancel') : t('create_truck')}
            </ManagementActionButton>
          ) : null
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ManagementStatCard
            icon={Truck}
            label={t('trucks_page.visible')}
            value={trucks.length}
            note={t('trucks_page.visible_note')}
          />
          <ManagementStatCard
            icon={BadgeCheck}
            label={t('trucks_page.active_in_view')}
            value={activeTrucks}
            note={t('trucks_page.active_note')}
            toneClassName="bg-emerald-400/18 text-emerald-50"
          />
          <ManagementStatCard
            icon={Gauge}
            label={t('trucks_page.capacity_in_view')}
            value={`${formatCapacity(capacityInView)} t`}
            note={t('trucks_page.capacity_note')}
            toneClassName="bg-cyan-400/18 text-cyan-50"
          />
        </div>
      </ManagementHero>

      {canManageTrucks && showCreate ? (
        <ManagementPanel
          eyebrow={isEditing ? t('edit') : t('create')}
          title={
            isEditing
              ? t('trucks_page.form_edit_title')
              : t('trucks_page.form_create_title')
          }
          description={
            isEditing
              ? t('trucks_page.form_edit_description')
              : t('trucks_page.form_create_description')
          }
          headerSlot={
            <ToneBadge
              label={isEditing ? t('update_truck') : t('create_truck')}
              toneClassName="border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
            />
          }
        >
          <form onSubmit={handleCreate} aria-busy={activeMutation.isPending}>
            <fieldset
              disabled={activeMutation.isPending}
              className="grid gap-4 lg:grid-cols-2"
            >
            <ManagementField label={t('plate')}>
              <ManagementInputField
                required
                value={form.plateNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    plateNumber: event.target.value,
                  }))
                }
              />
            </ManagementField>
            <ManagementField label={t('brand')} optionalLabel={t('optional')}>
              <ManagementInputField
                value={form.brand}
                onChange={(event) =>
                  setForm((current) => ({ ...current, brand: event.target.value }))
                }
              />
            </ManagementField>
            <ManagementField label={t('model')} optionalLabel={t('optional')}>
              <ManagementInputField
                value={form.model}
                onChange={(event) =>
                  setForm((current) => ({ ...current, model: event.target.value }))
                }
              />
            </ManagementField>
            <ManagementField label={t('year')} optionalLabel={t('optional')}>
              <ManagementInputField
                type="number"
                min="1900"
                max="2100"
                value={form.year}
                onChange={(event) =>
                  setForm((current) => ({ ...current, year: event.target.value }))
                }
              />
            </ManagementField>
            <ManagementField
              label={t('capacity')}
              optionalLabel={t('optional')}
              className="lg:col-span-2"
            >
              <ManagementInputField
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
              />
            </ManagementField>

            {createMutation.error instanceof Error ? (
              <ManagementCallout
                className="lg:col-span-2"
                tone="danger"
                description={createMutation.error.message}
              />
            ) : null}

            {updateMutation.error instanceof Error ? (
              <ManagementCallout
                className="lg:col-span-2"
                tone="danger"
                description={updateMutation.error.message}
              />
            ) : null}

            {isEditing ? (
              <ManagementCheckboxField
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
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
                {isEditing ? t('update_truck') : t('create_truck')}
              </ManagementActionButton>
            </ManagementFormActions>
            </fieldset>
          </form>
        </ManagementPanel>
      ) : null}

      <ManagementPanel
        title={t('trucks_page.filters_title')}
        description={t('trucks_page.filters_description')}
        bodyClassName="space-y-4"
        headerSlot={
          <ToneBadge
            label={`${t('reports.total')}: ${totalTrucks}`}
            toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
          />
        }
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t('trucks_page.search_placeholder')}
          hint={t('trucks_page.search_hint')}
        />
      </ManagementPanel>

      <ManagementPanel
        eyebrow={t('nav.trucks')}
        title={t('trucks_page.table_title')}
        description={t('trucks_page.table_description')}
        bodyClassName="p-0"
      >
        <ManagementMobileList>
          {isLoading ? (
            <ManagementRowsSkeleton count={3} detailColumns={2} />
          ) : null}

          {!isLoading && trucks.length === 0 ? (
            <ManagementInlineState
              title={t('ui_state.empty_title')}
              description={t('ui_state.empty_description')}
            />
          ) : null}

          {!isLoading &&
            trucks.map((truck) => (
              <ManagementMobileCard
                key={truck.id}
                title={truck.plateNumber}
                subtitle={[truck.brand, truck.model].filter(Boolean).join(' · ') || '—'}
                headerSlot={
                  <ToneBadge
                    label={truck.isActive ? t('active') : t('inactive')}
                    toneClassName={truckStatusTone(truck.isActive)}
                  />
                }
                footer={
                  showActions ? (
                    <>
                      <ManagementActionButton onClick={() => startEdit(truck)}>
                        {t('edit')}
                      </ManagementActionButton>
                      <ManagementActionButton
                        onClick={() => {
                          if (confirm(t('confirm_delete'))) {
                            deleteMutation.mutate(truck.id);
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
                      {t('year')}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {truck.year ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {t('capacity')}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {truck.capacityTons != null ? `${truck.capacityTons} t` : '—'}
                    </p>
                  </div>
                </div>
              </ManagementMobileCard>
            ))}
        </ManagementMobileList>

        <ManagementDesktopTable>
          <table className="min-w-full text-sm" aria-busy={isLoading}>
            <caption className="sr-only">
              {t('trucks_page.table_title')}. {t('trucks_page.table_description')}
            </caption>
            <thead className="bg-[rgba(15,23,42,0.04)]">
              <tr>
                {[
                  t('plate'),
                  t('brand'),
                  t('model'),
                  t('year'),
                  t('capacity'),
                  t('status'),
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
                  colSpan={showActions ? 7 : 6}
                  rows={4}
                />
              ) : null}

              {!isLoading && trucks.length === 0 ? (
                <ManagementTableState
                  colSpan={showActions ? 7 : 6}
                  title={t('ui_state.empty_title')}
                  description={t('ui_state.empty_description')}
                />
              ) : null}

              {trucks.map((truck) => (
                <tr
                  key={truck.id}
                  className="transition hover:bg-white/70 motion-reduce:transition-none"
                >
                  <th
                    scope="row"
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} font-semibold text-[var(--color-ink)]`}
                  >
                    {truck.plateNumber}
                  </th>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {truck.brand ?? '—'}
                  </td>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {truck.model ?? '—'}
                  </td>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {truck.year ?? '—'}
                  </td>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {truck.capacityTons != null ? `${truck.capacityTons} t` : '—'}
                  </td>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    <ToneBadge
                      label={truck.isActive ? t('active') : t('inactive')}
                      toneClassName={truckStatusTone(truck.isActive)}
                    />
                  </td>
                  {showActions ? (
                    <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                      <div className="flex flex-wrap items-center gap-2">
                        <ManagementActionButton onClick={() => startEdit(truck)}>
                          {t('edit')}
                        </ManagementActionButton>
                        <ManagementActionButton
                          onClick={() => {
                            if (confirm(t('confirm_delete'))) {
                              deleteMutation.mutate(truck.id);
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
