const KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY ?? 'trans-allal-dashboard-token';

export const tokenStore = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`${KEY}:access`);
  },
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`${KEY}:refresh`);
  },
  setTokens(access: string, refresh: string): void {
    localStorage.setItem(`${KEY}:access`, access);
    localStorage.setItem(`${KEY}:refresh`, refresh);
  },
  clear(): void {
    localStorage.removeItem(`${KEY}:access`);
    localStorage.removeItem(`${KEY}:refresh`);
  },
};
