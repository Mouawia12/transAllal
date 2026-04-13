import { create } from 'zustand';
import { apiClient } from '../api/client';
import { tokenStore } from './token-store';
import type { CurrentUser } from '../../types/shared';

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  hasHydrated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.post<{ data: { accessToken: string; refreshToken: string; user: CurrentUser } }>(
        '/auth/login',
        { email: email.trim().toLowerCase(), password },
        { skipAuthRefresh: true, skipUnauthorizedRedirect: true },
      );
      tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
      set({ user: res.data.user, isLoading: false, hasHydrated: true });
    } catch (e) {
      set({ isLoading: false, hasHydrated: true });
      throw e;
    }
  },

  logout: async () => {
    const refresh = tokenStore.getRefreshToken();
    if (refresh) {
      try { await apiClient.post('/auth/logout', { refreshToken: refresh }); } catch { /* ignore */ }
    }
    tokenStore.clear();
    set({ user: null, hasHydrated: true });
  },

  hydrate: () => {
    const access = tokenStore.getAccessToken();
    if (!access) {
      set({ user: null, hasHydrated: true });
      return;
    }

    apiClient.get<{ data: { user: CurrentUser } }>('/auth/me')
      .then(res => set({ user: res.data.user, hasHydrated: true }))
      .catch(() => {
        tokenStore.clear();
        set({ user: null, hasHydrated: true });
      });
  },
}));
