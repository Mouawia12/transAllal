import type { FeatureDescriptor } from "@/types/dashboard";

export const driversFeature: FeatureDescriptor = {
  title: "Drivers",
  summary:
    "Prepared for driver profiles, assignment status, compliance data, and authentication support flows.",
  readiness: [
    "Space is ready for driver list, detail, and assignment widgets.",
    "Auth token flow can be reused here for protected requests.",
    "Naming aligns with backend domain modules for predictable contracts.",
  ],
  apiPaths: ["/drivers", "/drivers/:driverId", "/drivers/:driverId/trips"],
};
