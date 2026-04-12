import { FeatureWorkspace } from "@/components/shared/feature-workspace";
import { reportsFeature } from "@/features/reports/reports.config";

export default function ReportsPage() {
  return <FeatureWorkspace feature={reportsFeature} />;
}
