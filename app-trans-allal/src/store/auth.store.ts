import { create } from 'zustand';
import { tokenStorage } from '@/services/storage/token-storage';
import { apiClient, ApiError } from '@/services/api/client';
import { locationTracker } from '@/services/location/location-tracker.service';
import type { CurrentUser } from '@/types/api';

interface AuthUserPayload {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
}

interface AuthDriverPayload {
  id: string;
  phone: string;
}

interface AuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUserPayload;
  driver: AuthDriverPayload | null;
}

interface AuthMePayload {
  user: AuthUserPayload;
  driver: AuthDriverPayload | null;
}

function normalizeCurrentUser(payload: AuthMePayload | AuthSessionPayload): CurrentUser {
  const name = [payload.user.firstName, payload.user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: payload.user.id,
    email: payload.user.email,
    firstName: payload.user.firstName,
    lastName: payload.user.lastName,
    name,
    phone: payload.driver?.phone ?? '',
    role: payload.user.role,
    companyId: payload.user.companyId,
    driverId: payload.driver?.id ?? null,
  };
}

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
      const data = await apiClient<AuthMePayload>('/auth/me', {}, { token });
      set({ user: normalizeCurrentUser(data), accessToken: token, isHydrated: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token is definitively invalid — clear and force re-login
        await tokenStorage.clearAll();
        set({ user: null, accessToken: null, isHydrated: true });
      } else {
        // Network/timeout error — keep token so the user isn't logged out
        // The app will proceed and retry on the next API call
        set({ user: null, accessToken: token, isHydrated: true });
      }
    }
  },

  login: async (phone: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await apiClient<AuthSessionPayload>('/auth/driver/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      }, { skipRefresh: true });

      await tokenStorage.setAccess(data.accessToken);
      await tokenStorage.setRefresh(data.refreshToken);
      set({ user: normalizeCurrentUser(data), accessToken: data.accessToken });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const token = get().accessToken;
    const refreshToken = await tokenStorage.getRefresh();
    try {
      if (token && refreshToken) {
        await apiClient(
          '/auth/logout',
          {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          },
          { token },
        );
      }
    } catch {}
    try {
      await locationTracker.stop();
    } catch {}
    await tokenStorage.clearAll();
    set({ user: null, accessToken: null });
  },
}));
