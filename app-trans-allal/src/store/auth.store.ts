import { create } from 'zustand';
import { tokenStorage } from '@/services/storage/token-storage';
import { apiClient } from '@/services/api/client';
import type { CurrentUser } from '@/types/api';

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isHydrated: false,

  hydrate: async () => {
    const token = await tokenStorage.getAccess();
    if (!token) {
      set({ isHydrated: true });
      return;
    }
    try {
      const user = await apiClient<CurrentUser>('/auth/me', {}, { token });
      set({ user, accessToken: token, isHydrated: true });
    } catch {
      await tokenStorage.clearAll();
      set({ user: null, accessToken: null, isHydrated: true });
    }
  },

  login: async (phone: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await apiClient<{
        accessToken: string;
        refreshToken: string;
        user: CurrentUser;
      }>('/auth/driver/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      }, { skipRefresh: true });

      await tokenStorage.setAccess(data.accessToken);
      await tokenStorage.setRefresh(data.refreshToken);
      set({ user: data.user, accessToken: data.accessToken });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const token = get().accessToken;
    try {
      if (token) {
        await apiClient('/auth/logout', { method: 'POST' }, { token });
      }
    } catch {}
    await tokenStorage.clearAll();
    set({ user: null, accessToken: null });
  },
}));
