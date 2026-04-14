'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Building2,
  PauseCircle,
  Plus,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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
  ManagementRowsSkeleton,
  ManagementStatCard,
  ManagementTableSkeleton,
  ManagementTextareaField,
  PaginationBar,
  SearchField,
  ManagementTableState,
  ToneBadge,
} from '../../../components/shared/management-ui';
import { apiClient } from '../../../lib/api/client';
import { ENDPOINTS } from '../../../lib/api/endpoints';
import type { ApiResponse, Company } from '../../../types/shared';

const emptyCompanyForm = {
  name: '',
  taxId: '',
  phone: '',
  email: '',
  address: '',
  isActive: true,
};

function companyStatusTone(isActive: boolean) {
  return isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-100 text-slate-600';
}

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
    queryFn: () =>
      apiClient.get<ApiResponse<Company[]>>(ENDPOINTS.COMPANIES, {
        page,
        limit: 20,
        ...(search && { search }),
      }),
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

  useEffect(() => {
    setPage(1);
  }, [search]);

  const companies = data?.data ?? [];
  const totalCompanies = data?.meta?.total ?? companies.length;
  const totalPages = data?.meta?.totalPages ?? 1;
  const activeCompanies = companies.filter((company) => company.isActive).length;
  const inactiveCompanies = companies.length - activeCompanies;

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

  const formTitle = isEditing
    ? t('companies_page.form_edit_title')
    : t('companies_page.form_create_title');

  const formDescription = isEditing
    ? t('companies_page.form_edit_description')
    : t('companies_page.form_create_description');

  return (
    <div className="space-y-5 md:space-y-6">
      <ManagementHero
        eyebrow={t('companies_page.eyebrow')}
        title={t('nav.companies')}
        description={t('companies_page.description')}
        className="bg-[linear-gradient(135deg,#0f1721_0%,#12443e_56%,#187260_100%)]"
        actions={
          <ManagementActionButton
            onClick={() => {
              if (showForm && !isEditing) {
                resetForm();
                return;
              }

              startCreate();
            }}
            tone="hero"
            size="md"
            className="py-3"
          >
            {showForm && !isEditing ? <X size={16} /> : <Plus size={16} />}
            {showForm && !isEditing ? t('cancel') : t('create_company')}
          </ManagementActionButton>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <ManagementStatCard
            icon={Building2}
            label={t('companies_page.visible')}
            value={companies.length}
            note={t('companies_page.visible_note')}
          />
          <ManagementStatCard
            icon={BadgeCheck}
            label={t('companies_page.active_in_view')}
            value={activeCompanies}
            note={t('companies_page.active_note')}
            toneClassName="bg-emerald-400/18 text-emerald-50"
          />
          <ManagementStatCard
            icon={PauseCircle}
            label={t('companies_page.inactive_in_view')}
            value={inactiveCompanies}
            note={t('companies_page.inactive_note')}
            toneClassName="bg-orange-400/18 text-orange-50"
          />
        </div>
      </ManagementHero>

      {showForm ? (
        <ManagementPanel
          eyebrow={isEditing ? t('edit') : t('create')}
          title={formTitle}
          description={formDescription}
          headerSlot={
            <ToneBadge
              label={isEditing ? t('update_company') : t('create_company')}
              toneClassName="border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
            />
          }
        >
          <form onSubmit={handleSubmit} aria-busy={activeMutation.isPending}>
            <fieldset
              disabled={activeMutation.isPending}
              className="grid gap-4 lg:grid-cols-2"
            >
            <ManagementField label={t('name')}>
              <ManagementInputField
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </ManagementField>
            <ManagementField label={t('tax_id')} optionalLabel={t('optional')}>
              <ManagementInputField
                value={form.taxId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, taxId: event.target.value }))
                }
              />
            </ManagementField>
            <ManagementField label={t('email')} optionalLabel={t('optional')}>
              <ManagementInputField
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </ManagementField>
            <ManagementField label={t('phone')} optionalLabel={t('optional')}>
              <ManagementInputField
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </ManagementField>
            <ManagementField
              label={t('address')}
              optionalLabel={t('optional')}
              className="lg:col-span-2"
            >
              <ManagementTextareaField
                rows={3}
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
              />
            </ManagementField>

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

            {activeMutation.error instanceof Error ? (
              <ManagementCallout
                className="lg:col-span-2"
                tone="danger"
                description={activeMutation.error.message}
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
                {isEditing ? t('update_company') : t('create_company')}
              </ManagementActionButton>
            </ManagementFormActions>
            </fieldset>
          </form>
        </ManagementPanel>
      ) : null}

      <ManagementPanel
        title={t('companies_page.filters_title')}
        description={t('companies_page.filters_description')}
        bodyClassName="space-y-4"
        headerSlot={
          <ToneBadge
            label={`${t('reports.total')}: ${totalCompanies}`}
            toneClassName="border-[rgba(15,23,42,0.08)] bg-white/80 text-[var(--color-ink)]"
          />
        }
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t('companies_page.search_placeholder')}
          hint={t('companies_page.search_hint')}
        />
      </ManagementPanel>

      <ManagementPanel
        eyebrow={t('nav.companies')}
        title={t('companies_page.table_title')}
        description={t('companies_page.table_description')}
        bodyClassName="p-0"
      >
        <ManagementMobileList>
          {isLoading ? (
            <ManagementRowsSkeleton count={3} />
          ) : null}

          {!isLoading && companies.length === 0 ? (
            <ManagementInlineState
              title={t('ui_state.empty_title')}
              description={t('ui_state.empty_description')}
            />
          ) : null}

          {!isLoading &&
            companies.map((company) => (
              <ManagementMobileCard
                key={company.id}
                title={company.name}
                subtitle={company.email ?? company.phone ?? '—'}
                headerSlot={
                  <ToneBadge
                    label={company.isActive ? t('active') : t('inactive')}
                    toneClassName={companyStatusTone(company.isActive)}
                  />
                }
                footer={
                  <>
                    <ManagementActionButton onClick={() => startEdit(company)}>
                      {t('edit')}
                    </ManagementActionButton>
                    <ManagementActionButton
                      onClick={() => {
                        if (confirm(t('confirm_delete'))) {
                          deleteMutation.mutate(company.id);
                        }
                      }}
                      tone="danger"
                    >
                      {t('delete')}
                    </ManagementActionButton>
                  </>
                }
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {t('email')}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {company.email ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/84 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {t('phone')}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {company.phone ?? '—'}
                    </p>
                  </div>
                </div>
              </ManagementMobileCard>
            ))}
        </ManagementMobileList>

        <ManagementDesktopTable>
          <table className="min-w-full text-sm" aria-busy={isLoading}>
            <caption className="sr-only">
              {t('companies_page.table_title')}. {t('companies_page.table_description')}
            </caption>
            <thead className="bg-[rgba(15,23,42,0.04)]">
              <tr>
                {[t('name'), t('email'), t('phone'), t('status'), t('actions')].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className={MANAGEMENT_TABLE_HEAD_CLASSNAME}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,23,42,0.08)]">
              {isLoading ? (
                <ManagementTableSkeleton colSpan={5} rows={4} />
              ) : null}

              {!isLoading && companies.length === 0 ? (
                <ManagementTableState
                  colSpan={5}
                  title={t('ui_state.empty_title')}
                  description={t('ui_state.empty_description')}
                />
              ) : null}

              {companies.map((company) => (
                <tr
                  key={company.id}
                  className="transition hover:bg-white/70 motion-reduce:transition-none"
                >
                  <th
                    scope="row"
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} font-semibold text-[var(--color-ink)]`}
                  >
                    {company.name}
                  </th>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {company.email ?? '—'}
                  </td>
                  <td
                    className={`${MANAGEMENT_TABLE_CELL_CLASSNAME} text-[var(--color-muted)]`}
                  >
                    {company.phone ?? '—'}
                  </td>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    <ToneBadge
                      label={company.isActive ? t('active') : t('inactive')}
                      toneClassName={companyStatusTone(company.isActive)}
                    />
                  </td>
                  <td className={MANAGEMENT_TABLE_CELL_CLASSNAME}>
                    <div className="flex flex-wrap items-center gap-2">
                      <ManagementActionButton onClick={() => startEdit(company)}>
                        {t('edit')}
                      </ManagementActionButton>
                      <ManagementActionButton
                        onClick={() => {
                          if (confirm(t('confirm_delete'))) {
                            deleteMutation.mutate(company.id);
                          }
                        }}
                        tone="danger"
                      >
                        {t('delete')}
                      </ManagementActionButton>
                    </div>
                  </td>
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
