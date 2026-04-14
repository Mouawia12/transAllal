const KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY ?? 'trans-allal-dashboard-token';
const ACCESS_KEY = `${KEY}:access`;
const REFRESH_KEY = `${KEY}:refresh`;

export const tokenStore = {
  accessStorageKey: ACCESS_KEY,
  refreshStorageKey: REFRESH_KEY,
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
