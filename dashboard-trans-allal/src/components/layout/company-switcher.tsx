'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiClient } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useCompanyScopeStore } from '../../lib/company/company-scope-store';
import type { ApiResponse, Company } from '../../types/shared';

export function CompanySwitcher() {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const hydrated = useCompanyScopeStore((state) => state.hydrated);
  const selectedCompanyId = useCompanyScopeStore(
    (state) => state.selectedCompanyId,
  );
  const setSelectedCompanyId = useCompanyScopeStore(
    (state) => state.setSelectedCompanyId,
  );

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['companies', 'scope-selector'],
    queryFn: () =>
      apiClient.get<ApiResponse<Company[]>>(ENDPOINTS.COMPANIES, {
        page: 1,
        limit: 100,
      }),
    enabled: hydrated && isSuperAdmin,
  });

  const companies = data?.data ?? [];

  useEffect(() => {
    if (!hydrated || !isSuperAdmin || companies.length === 0) return;

    const selectionStillExists = selectedCompanyId
      ? companies.some((company) => company.id === selectedCompanyId)
      : false;

    if (!selectionStillExists) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [
    companies,
    hydrated,
    isSuperAdmin,
    selectedCompanyId,
    setSelectedCompanyId,
  ]);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="flex min-w-[250px] items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/70 px-3.5 py-2.5 shadow-sm">
      <div className="rounded-2xl bg-[rgba(12,107,88,0.08)] p-2 text-[var(--color-brand)]">
        <Building2 size={18} />
      </div>
      <div className="relative min-w-0 flex-1">
        <label
          htmlFor="company-scope"
          className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]"
        >
          {t('company_scope.label')}
        </label>
        <select
          id="company-scope"
          value={selectedCompanyId ?? ''}
          onChange={(event) => setSelectedCompanyId(event.target.value || null)}
          disabled={isLoading || companies.length === 0}
          className="mt-1 w-full appearance-none bg-transparent pe-8 text-sm font-medium text-[var(--color-ink)] outline-none"
        >
          {companies.length === 0 ? (
            <option value="">
              {isLoading
                ? t('company_scope.loading')
                : t('company_scope.no_companies')}
            </option>
          ) : (
            <>
              {!selectedCompanyId && (
                <option value="">{t('company_scope.placeholder')}</option>
              )}
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </>
          )}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute end-0 top-[1.45rem] text-[var(--color-muted)]"
        />
      </div>
    </div>
  );
}
