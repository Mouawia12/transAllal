import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useRequiredSetupStatus } from '@/hooks/use-required-setup-status';
import { useAuthStore } from '@/store/auth.store';
import { appColors } from '@/theme/colors';

export default function IndexRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { status, isLoading } = useRequiredSetupStatus(Boolean(accessToken));

  if (!isHydrated || (accessToken && (isLoading || !status))) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appColors.light.background }}>
        <ActivityIndicator color={appColors.light.primary} />
      </View>
    );
  }

  if (accessToken) {
    const nextRoute = status?.isComplete
      ? '/(driver)/(tabs)'
      : '/(driver)/setup';

    return (
      <Redirect href={nextRoute} />
    );
  }

  return <Redirect href="/(auth)/sign-in" />;
}
