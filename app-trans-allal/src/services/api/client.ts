import type { ApiRequestOptions } from '@/types/api';
import { tokenStorage } from '@/services/storage/token-storage';
import { apiConfig } from './config';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefresh();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${apiConfig.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await tokenStorage.clearAll();
      return null;
    }
    const body = (await res.json()) as { data: { accessToken: string; refreshToken: string } };
    await tokenStorage.setAccess(body.data.accessToken);
    await tokenStorage.setRefresh(body.data.refreshToken);
    return body.data.accessToken;
  } catch {
    await tokenStorage.clearAll();
    return null;
  }
}

async function getValidToken(forceRefresh = false): Promise<string | null> {
  if (forceRefresh) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = doRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }
  return tokenStorage.getAccess();
}

export async function apiClient<TResponse>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const token = options.token ?? (await getValidToken());
  const headers = new Headers(init.headers);

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiConfig.baseUrl}${path}`, { ...init, headers });

  // Auto-refresh on 401
  if (response.status === 401 && !options.skipRefresh) {
    const newToken = await getValidToken(true);
    if (!newToken) throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');

    const retryHeaders = new Headers(init.headers);
    retryHeaders.set('Content-Type', 'application/json');
    retryHeaders.set('Authorization', `Bearer ${newToken}`);
    const retryResponse = await fetch(`${apiConfig.baseUrl}${path}`, {
      ...init,
      headers: retryHeaders,
    });
    return handleResponse<TResponse>(retryResponse);
  }

  return handleResponse<TResponse>(response);
}

async function handleResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    let errorCode = 'UNKNOWN';
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { code: string; message: string } };
      if (body.error) {
        errorCode = body.error.code;
        errorMessage = body.error.message;
      }
    } catch {}
    throw new ApiError(response.status, errorCode, errorMessage);
  }
  if (response.status === 204) return undefined as TResponse;
  const body = (await response.json()) as { data: TResponse };
  return body.data;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
