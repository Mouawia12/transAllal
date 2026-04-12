import { Link } from 'expo-router';
import { InfoCard } from '@/components/shared/info-card';
import { ScreenShell } from '@/components/ui/screen-shell';
import { initialAppSessionState } from '@/store/app-store';

export function ProfileScreen() {
  return (
    <ScreenShell
      title="Driver profile shell"
      subtitle="Prepared for driver identity, preference management, session state, and support actions."
    >
      <InfoCard
        title="Session placeholder"
        description={`Access token: ${initialAppSessionState.accessToken ?? 'not-set'}`}
      />

      <InfoCard
        title="Navigation boundary"
        description="Settings is already split into its own stack screen."
      >
        <Link href="/settings" style={{ color: '#0c6b58', fontWeight: '600' }}>
          Open settings screen
        </Link>
      </InfoCard>
    </ScreenShell>
  );
}
