import type { FeatureDescriptor } from "@/types/dashboard";

export const trackingFeature: FeatureDescriptor = {
  title: "Tracking",
  summary:
    "Prepared for live vehicle positioning, route playback, telemetry inspection, and realtime operational monitoring.",
  readiness: [
    "Dedicated map slot and websocket client placeholder already exist.",
    "Folder separation keeps realtime concerns away from business CRUD flows.",
    "This page is the correct future home for map provider integration.",
  ],
  apiPaths: ["/tracking/live", "/tracking/history", "/tracking/:tripId/stream"],
  realtime: true,
};
