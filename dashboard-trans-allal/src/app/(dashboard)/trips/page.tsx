import { FeatureWorkspace } from "@/components/shared/feature-workspace";
import { tripsFeature } from "@/features/trips/trips.config";

export default function TripsPage() {
  return <FeatureWorkspace feature={tripsFeature} />;
}
