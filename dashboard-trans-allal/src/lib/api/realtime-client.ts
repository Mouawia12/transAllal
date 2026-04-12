import { dashboardRuntimeConfig } from "./config";

export function createRealtimeClient(token?: string) {
  return {
    url: dashboardRuntimeConfig.wsUrl,
    token,
    connect() {
      throw new Error("Realtime client is scaffolded only. Implement websocket transport next.");
    },
  };
}
