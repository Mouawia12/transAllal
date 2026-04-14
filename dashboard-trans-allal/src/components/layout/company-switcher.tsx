'use client';

import { useEffect, useState } from 'react';
import { useIsFetching, useQuery } from '@tanstack/react-query';
import { Building2, ChevronDown, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiClient } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useCompanyScopeStore } from '../../lib/company/company-scope-store';
import { cn } from '../../lib/utils/cn';
import type { ApiResponse, Company } from '../../types/shared';

export function CompanySwitcher({ className }: { className?: string }) {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ?? null;
  const hydrated = useCompanyScopeStore((state) => state.hydrated);
  const selectedCompanyId = useCompanyScopeStore((state) =>
    currentUserId ? state.selectedCompanyIds[currentUserId] ?? null : null,
  );
  const setSelectedCompanyId = useCompanyScopeStore((state) => state.setSelectedCompanyId);
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const [didStartScopeRefresh, setDidStartScopeRefresh] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const scopedFetches = useIsFetching({
    predicate: (query) =>
      Boolean(
        pendingCompanyId &&
          query.queryKey.some((part) => part === pendingCompanyId),
      ),
  });

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
  const selectedCompany = companies.find(
    (company) => company.id === selectedCompanyId,
  );

  useEffect(() => {
    if (!hydrated || !isSuperAdmin || companies.length === 0) return;

    const selectionStillExists = selectedCompanyId
      ? companies.some((company) => company.id === selectedCompanyId)
      : false;

    if (!selectionStillExists && currentUserId) {
      setSelectedCompanyId(currentUserId, companies[0].id);
    }
  }, [
    companies,
    currentUserId,
    hydrated,
    isSuperAdmin,
    selectedCompanyId,
    setSelectedCompanyId,
  ]);

  useEffect(() => {
    if (!pendingCompanyId) return;

    if (scopedFetches > 0 && !didStartScopeRefresh) {
      setDidStartScopeRefresh(true);
      return;
    }

    if (didStartScopeRefresh && scopedFetches === 0) {
      setPendingCompanyId(null);
      setDidStartScopeRefresh(false);
      return;
    }

    if (
      !didStartScopeRefresh &&
      selectedCompanyId === pendingCompanyId &&
      scopedFetches === 0
    ) {
      const timeoutId = window.setTimeout(() => {
        setPendingCompanyId(null);
      }, 450);

      return () => window.clearTimeout(timeoutId);
    }
  }, [
    didStartScopeRefresh,
    pendingCompanyId,
    scopedFetches,
    selectedCompanyId,
  ]);

  if (!isSuperAdmin) {
    return null;
  }

  const isSwitchingScope = pendingCompanyId !== null;
  const isBusy = isLoading || isSwitchingScope;
  const companyLabel =
    companies.length === 0
      ? isBusy
        ? t('company_scope.loading')
        : t('company_scope.no_companies')
      : selectedCompany?.name ?? t('company_scope.placeholder');

  const handleCompanyChange = (value: string) => {
    const nextCompanyId = value || null;
    if (!nextCompanyId || nextCompanyId === selectedCompanyId) {
      return;
    }

    setPendingCompanyId(nextCompanyId);
    setDidStartScopeRefresh(false);
    if (!currentUserId) {
      return;
    }

    setSelectedCompanyId(currentUserId, nextCompanyId);
  };

  return (
    <div
      aria-busy={isBusy || undefined}
      className={cn(
        'flex w-full min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm transition motion-reduce:transition-none focus-within:border-[rgba(12,107,88,0.24)] focus-within:bg-white/84 focus-within:shadow-[0_0_0_4px_rgba(12,107,88,0.08)] sm:w-auto sm:min-w-[240px] xl:min-w-[260px]',
        isSwitchingScope
          ? 'border-[rgba(12,107,88,0.2)] bg-white/84 shadow-[0_0_0_4px_rgba(12,107,88,0.08)]'
          : 'border-[var(--color-border)] bg-white/72',
        className,
      )}
    >
      <div className="rounded-2xl bg-[rgba(12,107,88,0.08)] p-2 text-[var(--color-brand)]">
        {isBusy ? (
          <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
        ) : (
          <Building2 size={17} />
        )}
      </div>
      <div className="relative min-w-0 flex-1">
        <label
          htmlFor="company-scope"
          className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)] sm:text-[11px]"
        >
          {t('company_scope.label')}
        </label>
        {isSwitchingScope ? (
          <p
            aria-live="polite"
            className="mt-1 text-[11px] font-medium text-[var(--color-brand)]"
          >
            {t('company_scope.switching')}
          </p>
        ) : null}
        <div className={cn('relative', isSwitchingScope ? 'mt-2' : 'mt-1')}>
          <div
            aria-hidden="true"
            className="flex min-h-11 items-center gap-3 rounded-xl border border-transparent bg-[rgba(15,23,42,0.03)] px-3 py-2.5"
          >
            <p
              className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--color-ink)] sm:text-sm"
              title={selectedCompany?.name ?? companyLabel}
            >
              {companyLabel}
            </p>
            {isBusy ? (
              <LoaderCircle
                size={16}
                className="shrink-0 animate-spin text-[var(--color-brand)]"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                size={16}
                className="shrink-0 text-[var(--color-muted)]"
                aria-hidden="true"
              />
            )}
          </div>
          <select
            id="company-scope"
            value={selectedCompanyId ?? ''}
            onChange={(event) => handleCompanyChange(event.target.value)}
            disabled={isBusy || companies.length === 0}
            title={selectedCompany?.name ?? undefined}
            aria-label={selectedCompany?.name ?? t('company_scope.label')}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          >
            {companies.length === 0 ? (
              <option value="">{companyLabel}</option>
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
        </div>
      </div>
    </div>
  );
}
