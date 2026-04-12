import type { FeatureDescriptor } from "@/types/dashboard";

export const alertsFeature: FeatureDescriptor = {
  title: "Alerts",
  summary:
    "Prepared for incident queues, operational warnings, driver exceptions, and realtime attention workflows.",
  readiness: [
    "Alert handling is intentionally isolated from metrics and CRUD screens.",
    "Websocket events can later land here without reshaping the app.",
    "Prepared for filters by severity, asset, and trip context.",
  ],
  apiPaths: ["/alerts", "/alerts/:alertId", "/alerts/subscriptions"],
  realtime: true,
};
