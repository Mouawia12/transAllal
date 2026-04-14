import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import 'react-native-reanimated';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { createNavigationTheme } from '@/theme/navigation-theme';
import i18n, { initI18n } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth.store';
import { appColors } from '@/theme/colors';
import { locationTracker } from '@/services/location/location-tracker.service';
import { subscribeToConnectivity } from '@/services/connectivity/connectivity.service';

export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  const navigationTheme = createNavigationTheme(colorScheme);
  const [i18nReady, setI18nReady] = useState(false);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    async function bootstrap() {
      await initI18n();
      await hydrate();
      setI18nReady(true);
    }
    void bootstrap();
  }, [hydrate]);

  useEffect(() => {
    const unsubscribe = subscribeToConnectivity((online) => {
      if (online) {
        void locationTracker.flushPendingLocations();
      }
    });

    void locationTracker.flushPendingLocations();

    return unsubscribe;
  }, []);

  if (!i18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appColors.light.background }}>
        <ActivityIndicator color={appColors.light.primary} />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/sign-in" />
          <Stack.Screen name="(driver)" />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </I18nextProvider>
  );
}
