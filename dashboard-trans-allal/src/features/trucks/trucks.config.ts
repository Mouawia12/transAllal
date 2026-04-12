import type { FeatureDescriptor } from "@/types/dashboard";

export const trucksFeature: FeatureDescriptor = {
  title: "Trucks",
  summary:
    "Prepared for vehicle inventory, maintenance readiness, availability, and trip assignment visibility.",
  readiness: [
    "Feature route and folder are isolated for inventory and detail views.",
    "Shared table placeholder can evolve into a real truck operations grid.",
    "Backend naming already matches the planned truck module.",
  ],
  apiPaths: ["/trucks", "/trucks/:truckId", "/trucks/:truckId/trips"],
};
