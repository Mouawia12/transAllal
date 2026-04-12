import { FeatureWorkspace } from "@/components/shared/feature-workspace";
import { alertsFeature } from "@/features/alerts/alerts.config";

export default function AlertsPage() {
  return <FeatureWorkspace feature={alertsFeature} />;
}
