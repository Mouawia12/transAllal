'use client';

import { useAuthStore } from '../auth/auth-store';
import { useCompanyScopeStore } from './company-scope-store';

export function useCompanyScope() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const hydrated = useCompanyScopeStore((state) => state.hydrated);
  const selectedCompanyId = useCompanyScopeStore((state) =>
    user?.id ? state.selectedCompanyIds[user.id] ?? null : null,
  );

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const companyId = isSuperAdmin ? (selectedCompanyId ?? '') : (user?.companyId ?? '');

  return {
    user,
    hasHydrated,
    companyId,
    hydrated,
    isSuperAdmin,
    needsCompanySelection: Boolean(isSuperAdmin && !companyId),
  };
}
