import { InfoCard } from '@/components/shared/info-card';
import { ScreenShell } from '@/components/ui/screen-shell';
import { mobileRuntimeConfig } from '@/constants/env';
import { driverFeature } from '@/features/driver/driver.constants';

export function HomeScreen() {
  return (
    <ScreenShell
      title="Driver workspace"
      subtitle="Prepared as the landing screen for assigned trips, current status, sync state, and driver-specific actions."
    >
      <InfoCard
        title="Communication readiness"
        description={`API: ${mobileRuntimeConfig.apiBaseUrl}`}
      />

      <InfoCard
        title="Realtime readiness"
        description={`WebSocket: ${mobileRuntimeConfig.wsUrl}`}
      />

      <InfoCard title={driverFeature.title} description={driverFeature.summary}>
        {driverFeature.readiness.join(' ')}
      </InfoCard>
    </ScreenShell>
  );
}
