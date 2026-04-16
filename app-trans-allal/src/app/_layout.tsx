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
import { realtimeClient } from '@/services/api/realtime-client';
import {
  registerPushToken,
  showLocalNotification,
} from '@/services/notifications/push-notifications.service';

export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  const navigationTheme = createNavigationTheme(colorScheme);
  const [i18nReady, setI18nReady] = useState(false);
  const hydrate = useAuthStore((s) => s.hydrate);
  const accessToken = useAuthStore((s) => s.accessToken);
  const driverId = useAuthStore((s) => s.user?.driverId ?? null);

  useEffect(() => {
    async function bootstrap() {
      await initI18n();
      await hydrate();
      setI18nReady(true);
    }
    void bootstrap();
  }, [hydrate]);

  // Manage WebSocket lifecycle: connect when authenticated, disconnect on logout
  useEffect(() => {
    if (!accessToken) {
      realtimeClient.disconnect();
      return;
    }
    realtimeClient.connect(accessToken);
    if (driverId) {
      realtimeClient.subscribeToDriver(driverId);
    }
    void registerPushToken();
  }, [accessToken, driverId]);

  // If the driver previously enabled tracking, restore the native/background
  // location task after auth hydration so it keeps broadcasting even when the
  // app was backgrounded or reopened later.
  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void locationTracker.restoreBackgroundTracking();
  }, [accessToken]);

  // Show local notification when a new trip is assigned via WebSocket (online path).
  // The offline/background path is covered by FCM push notifications sent from the
  // backend PushNotificationService — both paths use the same user-facing copy so
  // the experience is consistent regardless of connectivity state.
  useEffect(() => {
    if (!accessToken) return;
    const unsubscribe = realtimeClient.onTripStatusChanged(async (data) => {
      if (data.status === 'PENDING') {
        await showLocalNotification(
          'رحلة جديدة',
          'تم تعيين رحلة جديدة لك، افتح التطبيق للتفاصيل.',
          { type: 'trip_assigned', tripId: data.tripId },
        );
      }
    });
    return unsubscribe;
  }, [accessToken]);

  // Show local notification for CRITICAL/HIGH alerts received while the app is
  // in the foreground (online path). Lower-severity alerts are surfaced through
  // the in-app alerts tab only.
  useEffect(() => {
    if (!accessToken) return;
    const unsubscribe = realtimeClient.onAlert(async (data) => {
      const alert = data as { alertId?: string; type?: string; severity?: string; message?: string | null };
      if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        await showLocalNotification(
          'تنبيه',
          alert.message ?? `تنبيه من نوع ${alert.type ?? 'غير معروف'}`,
          { type: 'alert', alertId: alert.alertId },
        );
      }
    });
    return unsubscribe;
  }, [accessToken]);

  // Flush offline location queue when connectivity is restored
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
