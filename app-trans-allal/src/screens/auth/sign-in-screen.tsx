import { Link } from 'expo-router';
import { Text } from 'react-native';
import { FormSection } from '@/components/forms/form-section';
import { InfoCard } from '@/components/shared/info-card';
import { ScreenShell } from '@/components/ui/screen-shell';
import { authFeature } from '@/features/auth/auth.constants';

export function SignInScreen() {
  return (
    <ScreenShell
      title="Driver authentication shell"
      subtitle="The app is organized and ready for API-backed sign-in, token handling, and future secure storage."
    >
      <FormSection
        title={authFeature.title}
        description="This section is intentionally presentational in this phase."
      >
        {authFeature.readiness.map((item) => (
          <Text key={item}>{item}</Text>
        ))}
      </FormSection>

      <InfoCard
        title="Next implementation step"
        description="Claude Code can now wire this screen to backend auth endpoints without restructuring the app."
      >
        <Link href="/(driver)/(tabs)" style={{ color: '#0c6b58', fontWeight: '600' }}>
          Open driver workspace placeholder
        </Link>
      </InfoCard>
    </ScreenShell>
  );
}
