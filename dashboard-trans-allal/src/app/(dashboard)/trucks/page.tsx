import { FeatureWorkspace } from "@/components/shared/feature-workspace";
import { trucksFeature } from "@/features/trucks/trucks.config";

export default function TrucksPage() {
  return <FeatureWorkspace feature={trucksFeature} />;
}
