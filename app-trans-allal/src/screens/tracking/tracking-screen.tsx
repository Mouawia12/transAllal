import { MapPlaceholder } from '@/components/maps/map-placeholder';
import { InfoCard } from '@/components/shared/info-card';
import { ScreenShell } from '@/components/ui/screen-shell';
import { trackingFeature } from '@/features/tracking/tracking.constants';

export function TrackingScreen() {
  return (
    <ScreenShell
      title="Tracking workspace"
      subtitle="Prepared for live position sharing, route preview, telemetry status, and future background location streaming."
    >
      <MapPlaceholder />
      <InfoCard title={trackingFeature.title} description={trackingFeature.summary}>
        {trackingFeature.readiness.join(' ')}
      </InfoCard>
    </ScreenShell>
  );
}
