import { dashboardRuntimeConfig } from "@/lib/api/config";

export function useRealtimeUrl() {
  return dashboardRuntimeConfig.wsUrl;
}
