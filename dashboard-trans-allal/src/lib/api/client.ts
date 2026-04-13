import { tokenStore } from '../auth/token-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuthRefresh?: boolean;
  skipUnauthorizedRedirect?: boolean;
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function redirectToSignIn(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/sign-in';
  }
}

async function parseApiError(response: Response): Promise<ApiError> {
  const fallbackMessage = `HTTP ${response.status}`;

  try {
    const body = (await response.json()) as ApiErrorResponse;
    return new ApiError(
      response.status,
      body.error?.code ?? String(response.status),
      body.error?.message ?? fallbackMessage,
      body.error?.details,
    );
  } catch {
    return new ApiError(response.status, String(response.status), fallbackMessage);
  }
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const {
    params,
    headers = {},
    skipAuthRefresh = false,
    skipUnauthorizedRedirect = false,
    ...rest
  } = options;
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const token = tokenStore.getAccessToken();
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url.toString(), { ...rest, headers: mergedHeaders });

  if (res.status === 401 && !skipAuthRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = tokenStore.getAccessToken();
      mergedHeaders['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(url.toString(), { ...rest, headers: mergedHeaders });
      if (!retry.ok) {
        tokenStore.clear();
        if (!skipUnauthorizedRedirect) redirectToSignIn();
        throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
      }
      return retry.json() as Promise<T>;
    }
    tokenStore.clear();
    if (!skipUnauthorizedRedirect) redirectToSignIn();
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
  }

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json() as { data: { accessToken: string; refreshToken: string } };
    tokenStore.setTokens(data.data.accessToken, data.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const apiClient = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: Omit<FetchOptions, 'method' | 'params'>,
  ) =>
    request<T>(path, { method: 'GET', params, ...options }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<FetchOptions, 'method' | 'body'>,
  ) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<FetchOptions, 'method' | 'body'>,
  ) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: <T>(path: string, options?: Omit<FetchOptions, 'method'>) =>
    request<T>(path, { method: 'DELETE', ...options }),
};
