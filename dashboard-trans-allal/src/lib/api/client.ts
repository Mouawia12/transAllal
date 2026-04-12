import type { ApiRequestOptions } from "@/types/api";
import { dashboardTokenStore } from "@/lib/auth/token-store";
import { dashboardRuntimeConfig } from "./config";

export async function apiClient<TResponse>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const token = options.token ?? dashboardTokenStore.get();
  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${dashboardRuntimeConfig.apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
