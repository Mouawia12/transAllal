import { create } from 'zustand';
import { apiClient, ApiError } from '../api/client';
import {
  clearAuthRedirectReason,
  type AuthRedirectReason,
  persistAuthRedirectReason,
} from './navigation';
import { queryClient } from '../query-client';
import { tokenStore } from './token-store';
import type { CurrentUser } from '../../types/shared';

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  hasHydrated: boolean;
  authRestoreFailed: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearLocalSession: (reason?: AuthRedirectReason) => void;
}

let hydrateRequest: Promise<void> | null = null;
const AUTH_LOGIN_TIMEOUT_MS = 12_000;
const AUTH_LOGOUT_TIMEOUT_MS = 4_000;
const AUTH_RESTORE_TIMEOUT_MS = 10_000;

function withAbortableTimeout<T>(
  requestFactory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutCode: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    const timeoutId = setTimeout(() => {
      settled = true;
      controller.abort(timeoutCode);
      reject(new Error(timeoutCode));
    }, timeoutMs);

    requestFactory(controller.signal).then(
      (value) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  hasHydrated: false,
  authRestoreFailed: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await withAbortableTimeout(
        (signal) => apiClient.post<{ data: { accessToken: string; refreshToken: string; user: CurrentUser } }>(
          '/auth/login',
          { email: email.trim().toLowerCase(), password },
          { skipAuthRefresh: true, skipUnauthorizedRedirect: true, signal },
        ),
        AUTH_LOGIN_TIMEOUT_MS,
        'AUTH_LOGIN_TIMEOUT',
      );
      tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
      clearAuthRedirectReason();
      queryClient.clear();
      set({
        user: res.data.user,
        isLoading: false,
        hasHydrated: true,
        authRestoreFailed: false,
      });
    } catch (e) {
      set({ isLoading: false, hasHydrated: true });
      throw e;
    }
  },

  logout: async () => {
    const refresh = tokenStore.getRefreshToken();
    persistAuthRedirectReason('signed-out');
    if (refresh) {
      try {
        await withAbortableTimeout(
          (signal) => apiClient.post(
            '/auth/logout',
            { refreshToken: refresh },
            {
              skipAuthRefresh: true,
              skipUnauthorizedRedirect: true,
              signal,
            },
          ),
          AUTH_LOGOUT_TIMEOUT_MS,
          'AUTH_LOGOUT_TIMEOUT',
        );
      } catch {
        /* ignore */
      }
    }
    tokenStore.clear();
    queryClient.clear();
    set({ user: null, hasHydrated: true, authRestoreFailed: false });
  },

  clearLocalSession: (reason = 'session-expired') => {
    persistAuthRedirectReason(reason);
    tokenStore.clear();
    queryClient.clear();
    set({
      user: null,
      isLoading: false,
      hasHydrated: true,
      authRestoreFailed: false,
    });
  },

  hydrate: async () => {
    const access = tokenStore.getAccessToken();
    if (!access) {
      queryClient.clear();
      set({ user: null, hasHydrated: true, authRestoreFailed: false });
      return;
    }

    if (hydrateRequest) {
      return hydrateRequest;
    }

    hydrateRequest = withAbortableTimeout(
      (signal) => apiClient.get<{ data: { user: CurrentUser } }>('/auth/me', undefined, {
        skipUnauthorizedRedirect: true,
        signal,
      }),
      AUTH_RESTORE_TIMEOUT_MS,
      'AUTH_RESTORE_TIMEOUT',
    )
      .then((res) => {
        if (tokenStore.getAccessToken() !== access) {
          return;
        }

        clearAuthRedirectReason();
        set({
          user: res.data.user,
          hasHydrated: true,
          authRestoreFailed: false,
        });
      })
      .catch((error) => {
        if (tokenStore.getAccessToken() !== access) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          persistAuthRedirectReason('session-expired');
          tokenStore.clear();
          queryClient.clear();
          set({ user: null, hasHydrated: true, authRestoreFailed: false });
          return;
        }

        set({ hasHydrated: true, authRestoreFailed: true });
      })
      .finally(() => {
        hydrateRequest = null;
      });

    return hydrateRequest;
  },
}));
