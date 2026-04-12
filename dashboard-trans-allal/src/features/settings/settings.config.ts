import type { FeatureDescriptor } from "@/types/dashboard";

export const settingsFeature: FeatureDescriptor = {
  title: "Settings",
  summary:
    "Prepared for tenant configuration, preferences, access rules, integrations, and environment-aware admin tooling.",
  readiness: [
    "This section is where dashboard configuration and operator preferences should live.",
    "Environment variables are already documented for deployment alignment.",
    "Folder structure leaves room for security and integration settings later.",
  ],
  apiPaths: ["/settings/profile", "/settings/integrations", "/settings/access"],
};
