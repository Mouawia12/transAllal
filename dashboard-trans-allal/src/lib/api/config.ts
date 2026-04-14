import type { DashboardRuntimeConfig } from "@/types/env";

const MAPBOX_PUBLIC_TOKEN_PATTERN = /^(pk|tk)\.[A-Za-z0-9._-]{20,}$/i;

export function hasUsableMapboxToken(token: string) {
  const value = token.trim();
  if (!value) {
    return false;
  }

  const normalizedValue = value.toLowerCase();
  if (
    normalizedValue.includes("placeholder") ||
    normalizedValue.includes("mapbox_token_here") ||
    normalizedValue.includes("your_mapbox_token") ||
    normalizedValue.includes("your-mapbox-token") ||
    normalizedValue.includes("changeme") ||
    normalizedValue.includes("example")
  ) {
    return false;
  }

  return MAPBOX_PUBLIC_TOKEN_PATTERN.test(value);
}

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";

export const dashboardRuntimeConfig: DashboardRuntimeConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Trans Allal Dashboard",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3000",
  mapProvider: process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "mapbox",
  mapboxToken,
  authStorageKey:
    process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY ?? "trans-allal-dashboard-token",
};
