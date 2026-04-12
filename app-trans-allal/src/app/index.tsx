import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { appColors } from '@/theme/colors';

export default function IndexRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appColors.light.background }}>
        <ActivityIndicator color={appColors.light.primary} />
      </View>
    );
  }

  if (accessToken) {
    return <Redirect href="/(driver)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
