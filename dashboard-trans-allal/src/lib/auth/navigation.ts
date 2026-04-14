const FALLBACK_AUTH_REDIRECT = '/';
const AUTH_REDIRECT_REASONS = [
  'auth-required',
  'session-expired',
  'signed-out',
] as const;
const AUTH_REDIRECT_REASON_STORAGE_KEY = 'trans-allal:auth-redirect-reason';
const AUTH_REDIRECT_REASON_MAX_AGE_MS = 15_000;

export type AuthRedirectReason = (typeof AUTH_REDIRECT_REASONS)[number];

interface PersistedAuthRedirectReason {
  at: number;
  reason: AuthRedirectReason;
}

export function normalizeNextPath(nextPath?: string | null): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return FALLBACK_AUTH_REDIRECT;
  }

  try {
    const url = new URL(nextPath, 'http://trans-allal.local');
    const normalized = `${url.pathname}${url.search}${url.hash}`;

    if (!normalized.startsWith('/') || normalized === '/sign-in') {
      return FALLBACK_AUTH_REDIRECT;
    }

    return normalized;
  } catch {
    return FALLBACK_AUTH_REDIRECT;
  }
}

export function normalizeAuthRedirectReason(
  reason?: string | null,
): AuthRedirectReason | null {
  if (!reason) {
    return null;
  }

  return AUTH_REDIRECT_REASONS.includes(reason as AuthRedirectReason)
    ? (reason as AuthRedirectReason)
    : null;
}

export function persistAuthRedirectReason(reason: AuthRedirectReason): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: PersistedAuthRedirectReason = {
    reason,
    at: Date.now(),
  };

  window.localStorage.setItem(
    AUTH_REDIRECT_REASON_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function clearAuthRedirectReason(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_REDIRECT_REASON_STORAGE_KEY);
}

export function readRecentAuthRedirectReason(): AuthRedirectReason | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_REDIRECT_REASON_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<PersistedAuthRedirectReason>;
    const reason = normalizeAuthRedirectReason(
      typeof parsedValue.reason === 'string' ? parsedValue.reason : null,
    );
    const at = typeof parsedValue.at === 'number' ? parsedValue.at : 0;

    if (!reason || Date.now() - at > AUTH_REDIRECT_REASON_MAX_AGE_MS) {
      window.localStorage.removeItem(AUTH_REDIRECT_REASON_STORAGE_KEY);
      return null;
    }

    return reason;
  } catch {
    window.localStorage.removeItem(AUTH_REDIRECT_REASON_STORAGE_KEY);
    return null;
  }
}

export function buildSignInHref(
  nextPath?: string | null,
  reason?: AuthRedirectReason | null,
): string {
  const normalizedNextPath = normalizeNextPath(nextPath);
  const normalizedReason = normalizeAuthRedirectReason(reason);
  const params = new URLSearchParams();

  if (normalizedNextPath !== FALLBACK_AUTH_REDIRECT) {
    params.set('next', normalizedNextPath);
  }

  if (normalizedReason) {
    params.set('reason', normalizedReason);
  }

  const query = params.toString();
  return query ? `/sign-in?${query}` : '/sign-in';
}

export function getCurrentAppPath(): string {
  if (typeof window === 'undefined') {
    return FALLBACK_AUTH_REDIRECT;
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
