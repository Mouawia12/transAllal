import { InfoCard } from '@/components/shared/info-card';
import { ScreenShell } from '@/components/ui/screen-shell';
import { tripFeature } from '@/features/trip/trip.constants';
import { apiEndpoints } from '@/services/api/endpoints';

export function TripScreen() {
  return (
    <ScreenShell
      title="Trip workspace"
      subtitle="Prepared for trip lifecycle, assigned cargo details, checkpoints, and action flows."
    >
      <InfoCard
        title={tripFeature.title}
        description={tripFeature.summary}
      >
        {tripFeature.readiness.join(' ')}
      </InfoCard>

      <InfoCard
        title="Planned backend touchpoints"
        description={`${apiEndpoints.trips} and ${apiEndpoints.tracking}`}
      />
    </ScreenShell>
  );
}
