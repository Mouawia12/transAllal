import type { ApiRequestOptions } from '@/types/api';
import { tokenStorage } from '@/services/storage/token-storage';
import { apiConfig } from './config';

export async function apiClient<TResponse>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const token = options.token ?? (await tokenStorage.get());
  const headers = new Headers(init.headers);

  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Mobile API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
