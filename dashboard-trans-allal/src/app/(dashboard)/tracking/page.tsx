import { FeatureWorkspace } from "@/components/shared/feature-workspace";
import { trackingFeature } from "@/features/tracking/tracking.config";

export default function TrackingPage() {
  return <FeatureWorkspace feature={trackingFeature} />;
}
