import type { FeatureDescriptor } from "@/types/dashboard";

export const reportsFeature: FeatureDescriptor = {
  title: "Reports",
  summary:
    "Prepared for analytics, KPI aggregation, downloadable summaries, and operational trend reporting.",
  readiness: [
    "Feature structure supports charts, saved filters, and export tooling.",
    "Route is separated from live operations to keep reporting concerns clear.",
    "Shared components are ready for chart and table expansion.",
  ],
  apiPaths: ["/reports/overview", "/reports/trips", "/reports/alerts"],
};
