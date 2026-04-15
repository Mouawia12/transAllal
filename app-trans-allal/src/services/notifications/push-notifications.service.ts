import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '@/services/api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerPushToken(): Promise<void> {
  try {
    const granted = await requestPermission();
    if (!granted) return;

    // Use native FCM device token (works without Expo account)
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token) return;

    await apiClient('/drivers/me/push-token', {
      method: 'PATCH',
      body: JSON.stringify({ token }),
    });
  } catch {
    // Non-critical — fail silently
  }
}

export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, data: data ?? {} },
      trigger: null, // immediate
    });
  } catch {
    // Non-critical
  }
}
