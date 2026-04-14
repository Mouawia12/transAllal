'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { queryClient } from '../lib/query-client';
import { useAuthStore } from '../lib/auth/auth-store';
import { tokenStore } from '../lib/auth/token-store';
import {
  companyScopeStorageKey,
  useCompanyScopeStore,
} from '../lib/company/company-scope-store';

const AUTH_SYNC_THROTTLE_MS = 30_000;
const AUTH_STORAGE_SYNC_DEBOUNCE_MS = 80;

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore(s => s.hydrate);
  const hydrateCompanyScope = useCompanyScopeStore((state) => state.hydrate);
  const lastAuthSyncAtRef = useRef(0);
  const authStorageSyncTimeoutRef = useRef<number | null>(null);

  const syncAuthState = (force = false) => {
    const now = Date.now();

    if (!force && now - lastAuthSyncAtRef.current < AUTH_SYNC_THROTTLE_MS) {
      return;
    }

    lastAuthSyncAtRef.current = now;
    hydrate();
  };

  useEffect(() => {
    syncAuthState(true);
  }, [hydrate]);
  useEffect(() => { hydrateCompanyScope(); }, [hydrateCompanyScope]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.storageArea !== window.localStorage ||
        (event.key !== tokenStore.accessStorageKey &&
          event.key !== tokenStore.refreshStorageKey &&
          event.key !== companyScopeStorageKey)
      ) {
        return;
      }

      if (
        event.key === tokenStore.accessStorageKey ||
        event.key === tokenStore.refreshStorageKey
      ) {
        if (authStorageSyncTimeoutRef.current !== null) {
          window.clearTimeout(authStorageSyncTimeoutRef.current);
        }

        authStorageSyncTimeoutRef.current = window.setTimeout(() => {
          queryClient.clear();
          syncAuthState(true);
          authStorageSyncTimeoutRef.current = null;
        }, AUTH_STORAGE_SYNC_DEBOUNCE_MS);
        return;
      }

      hydrateCompanyScope();
    };

    const handleWindowFocus = () => {
      syncAuthState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAuthState();
      }
    };

    const handleOnline = () => {
      syncAuthState(true);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (authStorageSyncTimeoutRef.current !== null) {
        window.clearTimeout(authStorageSyncTimeoutRef.current);
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hydrate, hydrateCompanyScope]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
