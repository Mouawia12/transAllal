import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '@/services/api/client';

let lastRegisteredPushToken: string | null = null;

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
  if (Platform.OS === 'web') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  const status =
    existingPermission.status === 'granted'
      ? existingPermission.status
      : (await Notifications.requestPermissionsAsync()).status;
  return status === 'granted';
}

export async function registerPushToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      return;
    }

    const granted = await requestPermission();
    if (!granted) return;

    // Use native FCM device token (works without Expo account)
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token) return;
    if (token === lastRegisteredPushToken) return;

    await apiClient('/drivers/me/push-token', {
      method: 'PATCH',
      body: JSON.stringify({ token }),
    });
    lastRegisteredPushToken = token;
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
