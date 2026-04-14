import { tokenStore } from '../auth/token-store';
import {
  buildSignInHref,
  getCurrentAppPath,
  persistAuthRedirectReason,
} from '../auth/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const AUTH_REFRESH_TIMEOUT_MS = 8_000;
let refreshRequest: Promise<boolean> | null = null;

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

function createNetworkApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError(0, 'REQUEST_ABORTED', 'Request was aborted');
  }

  return new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server');
}

function redirectToSignIn(): void {
  if (typeof window !== 'undefined') {
    persistAuthRedirectReason('session-expired');
    window.location.href = buildSignInHref(
      getCurrentAppPath(),
      'session-expired',
    );
  }
}

function finalizeUnauthorizedState(
  expectedAccessToken: string | null,
  skipUnauthorizedRedirect: boolean,
): never {
  if (tokenStore.getAccessToken() === expectedAccessToken) {
    tokenStore.clear();
    if (!skipUnauthorizedRedirect) {
      redirectToSignIn();
    }
  }

  throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
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

async function parseResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    return undefined as T;
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(rawBody) as T;
  }

  return rawBody as T;
}

function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutReason: string,
): Promise<Response> {
  const controller = new AbortController();
  let settled = false;
  const timeoutId = setTimeout(() => {
    settled = true;
    controller.abort(timeoutReason);
  }, timeoutMs);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    if (!settled) {
      clearTimeout(timeoutId);
    }
  });
}

async function performFetch(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw createNetworkApiError(error);
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

  const res = await performFetch(url.toString(), { ...rest, headers: mergedHeaders });

  if (res.status === 401 && !skipAuthRefresh) {
    const latestToken = tokenStore.getAccessToken();
    if (latestToken && latestToken !== token) {
      mergedHeaders['Authorization'] = `Bearer ${latestToken}`;
      const retryWithLatestToken = await performFetch(url.toString(), {
        ...rest,
        headers: mergedHeaders,
      });

      if (retryWithLatestToken.ok) {
        return parseResponseBody<T>(retryWithLatestToken);
      }

      if (retryWithLatestToken.status !== 401) {
        throw await parseApiError(retryWithLatestToken);
      }
    }

    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = tokenStore.getAccessToken();
      if (!newToken) {
        finalizeUnauthorizedState(newToken, skipUnauthorizedRedirect);
      }
      mergedHeaders['Authorization'] = `Bearer ${newToken}`;
      const retry = await performFetch(url.toString(), { ...rest, headers: mergedHeaders });
      if (!retry.ok) {
        if (retry.status === 401) {
          finalizeUnauthorizedState(newToken, skipUnauthorizedRedirect);
        }

        throw await parseApiError(retry);
      }
      return parseResponseBody<T>(retry);
    }
    finalizeUnauthorizedState(token, skipUnauthorizedRedirect);
  }

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return parseResponseBody<T>(res);
}

async function tryRefresh(): Promise<boolean> {
  if (refreshRequest) {
    return refreshRequest;
  }

  const refresh = tokenStore.getRefreshToken();
  if (!refresh) return false;

  refreshRequest = (async () => {
    try {
      const res = await fetchWithTimeout(
        `${BASE_URL}/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        },
        AUTH_REFRESH_TIMEOUT_MS,
        'AUTH_REFRESH_TIMEOUT',
      );
      if (!res.ok) {
        return tokenStore.getRefreshToken() !== refresh
          ? Boolean(tokenStore.getAccessToken())
          : false;
      }
      const data = await res.json() as { data: { accessToken: string; refreshToken: string } };

      if (tokenStore.getRefreshToken() !== refresh) {
        return Boolean(tokenStore.getAccessToken());
      }

      tokenStore.setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      return tokenStore.getRefreshToken() !== refresh
        ? Boolean(tokenStore.getAccessToken())
        : false;
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
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
