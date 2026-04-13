'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryClient } from '../lib/query-client';
import { useAuthStore } from '../lib/auth/auth-store';
import { useCompanyScopeStore } from '../lib/company/company-scope-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore(s => s.hydrate);
  const hydrateCompanyScope = useCompanyScopeStore((state) => state.hydrate);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { hydrateCompanyScope(); }, [hydrateCompanyScope]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
