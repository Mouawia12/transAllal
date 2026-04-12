import type { FeatureDescriptor } from "@/types/dashboard";

export const tripsFeature: FeatureDescriptor = {
  title: "Trips",
  summary:
    "Prepared for trip lifecycle tracking, dispatch timelines, progress visibility, and exception handling.",
  readiness: [
    "Folder and route boundaries are ready for trip timeline components.",
    "API client is already structured to handle list/detail patterns.",
    "Realtime hooks can later merge with trip progress updates.",
  ],
  apiPaths: ["/trips", "/trips/:tripId", "/trips/:tripId/tracking"],
};
