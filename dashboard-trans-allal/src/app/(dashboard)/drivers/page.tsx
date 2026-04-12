import { FeatureWorkspace } from "@/components/shared/feature-workspace";
import { driversFeature } from "@/features/drivers/drivers.config";

export default function DriversPage() {
  return <FeatureWorkspace feature={driversFeature} />;
}
