import type { DashboardRuntimeConfig } from "@/types/env";

export const dashboardRuntimeConfig: DashboardRuntimeConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Trans Allal Dashboard",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002/tracking",
  mapProvider: process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "mapbox",
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
  authStorageKey:
    process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY ?? "trans-allal-dashboard-token",
};
