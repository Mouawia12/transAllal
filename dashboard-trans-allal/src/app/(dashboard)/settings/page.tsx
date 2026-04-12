import { FeatureWorkspace } from "@/components/shared/feature-workspace";
import { settingsFeature } from "@/features/settings/settings.config";

export default function SettingsPage() {
  return <FeatureWorkspace feature={settingsFeature} />;
}
