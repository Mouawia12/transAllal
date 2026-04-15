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
import { realtimeClient } from '../lib/api/realtime-client';

const AUTH_SYNC_THROTTLE_MS = 30_000;
const AUTH_STORAGE_SYNC_DEBOUNCE_MS = 80;
// Delay before re-validating auth after network restore — lets connection stabilise
const ONLINE_SYNC_DELAY_MS = 2_000;

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore(s => s.hydrate);
  const user = useAuthStore(s => s.user);
  const hydrateCompanyScope = useCompanyScopeStore((state) => state.hydrate);
  const lastAuthSyncAtRef = useRef(0);
  const authStorageSyncTimeoutRef = useRef<number | null>(null);
  const onlineSyncTimeoutRef = useRef<number | null>(null);

  const syncAuthState = (force = false) => {
    const now = Date.now();

    if (!force && now - lastAuthSyncAtRef.current < AUTH_SYNC_THROTTLE_MS) {
      return;
    }

    lastAuthSyncAtRef.current = now;
    hydrate();
  };

  // Connect / disconnect WS based on auth state
  useEffect(() => {
    const token = tokenStore.getAccessToken();
    if (token && user) {
      realtimeClient.connect(token);
    } else if (!user) {
      realtimeClient.disconnect();
    }
  }, [user]);

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
      // Delay to let the network connection fully stabilise before re-validating
      if (onlineSyncTimeoutRef.current !== null) {
        window.clearTimeout(onlineSyncTimeoutRef.current);
      }
      onlineSyncTimeoutRef.current = window.setTimeout(() => {
        syncAuthState(true);
        onlineSyncTimeoutRef.current = null;
      }, ONLINE_SYNC_DELAY_MS);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (authStorageSyncTimeoutRef.current !== null) {
        window.clearTimeout(authStorageSyncTimeoutRef.current);
      }
      if (onlineSyncTimeoutRef.current !== null) {
        window.clearTimeout(onlineSyncTimeoutRef.current);
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
