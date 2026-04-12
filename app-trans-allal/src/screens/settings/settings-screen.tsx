import { InfoCard } from '@/components/shared/info-card';
import { ScreenShell } from '@/components/ui/screen-shell';
import { mobileRuntimeConfig } from '@/constants/env';
import { syncFeature } from '@/features/sync/sync.constants';

export function SettingsScreen() {
  return (
    <ScreenShell
      title="Settings and sync shell"
      subtitle="Prepared for app preferences, diagnostics, permissions, and offline sync controls."
    >
      <InfoCard
        title="Environment"
        description={`Mode: ${mobileRuntimeConfig.env} | Provider: ${mobileRuntimeConfig.mapProvider}`}
      />

      <InfoCard title={syncFeature.title} description={syncFeature.summary}>
        {syncFeature.readiness.join(' ')}
      </InfoCard>
    </ScreenShell>
  );
}
