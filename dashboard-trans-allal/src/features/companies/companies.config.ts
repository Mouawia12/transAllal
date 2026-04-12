import type { FeatureDescriptor } from "@/types/dashboard";

export const companiesFeature: FeatureDescriptor = {
  title: "Companies",
  summary:
    "Prepared for company onboarding, account management, contract overview, and operational segmentation.",
  readiness: [
    "Feature folder is isolated for future pages, forms, and server actions.",
    "Dashboard route already exists and sits behind the dashboard shell.",
    "API integration can start from centralized endpoints without restructuring.",
  ],
  apiPaths: ["/companies", "/companies/:companyId", "/companies/:companyId/drivers"],
};
