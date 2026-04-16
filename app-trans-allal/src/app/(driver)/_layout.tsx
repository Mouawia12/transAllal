import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { useRequiredSetupStatus } from '@/hooks/use-required-setup-status';
import { useAuthStore } from '@/store/auth.store';
import { appColors } from '@/theme/colors';

export default function DriverStackLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const segments = useSegments();
  const { status, isLoading } = useRequiredSetupStatus(Boolean(accessToken));
  const currentLeafSegment = segments[segments.length - 1];
  const isSetupRoute = currentLeafSegment === 'setup';

  if (!accessToken) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (isLoading || !status) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: appColors.light.background,
        }}
      >
        <ActivityIndicator color={appColors.light.primary} />
      </View>
    );
  }

  if (!status.isComplete && !isSetupRoute) {
    return <Redirect href="/(driver)/setup" />;
  }

  if (status.isComplete && isSetupRoute) {
    return <Redirect href="/(driver)/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
