import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { apiClient } from '@/services/api/client';
import { tokenStorage } from '@/services/storage/token-storage';
import { enqueueRequest, isOnline } from '@/services/connectivity/connectivity.service';

const BACKGROUND_LOCATION_TASK = 'trans-allal-background-location';
const PUBLISH_INTERVAL_MS = 5000; // 5 seconds

// Define background task (must be at module top level)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[LocationTracker] Background task error:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations[locations.length - 1];
  if (!location) return;

  const token = await tokenStorage.getAccess();
  if (!token) return;

  const payload = {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    speedKmh: location.coords.speed != null ? location.coords.speed * 3.6 : undefined,
    heading: location.coords.heading ?? undefined,
    accuracyM: location.coords.accuracy ?? undefined,
  };

  try {
    const online = await isOnline();
    if (online) {
      await apiClient('/tracking/location', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, { token });
    } else {
      await enqueueRequest({
        path: '/tracking/location',
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  } catch {
    // Silently enqueue on error
    await enqueueRequest({
      path: '/tracking/location',
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
});

export const locationTracker = {
  async requestPermissions(): Promise<boolean> {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') return false;

    if (Platform.OS !== 'web') {
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (bg !== 'granted') return false;
    }
    return true;
  },

  async start(): Promise<void> {
    if (Platform.OS === 'web') {
      console.warn('[LocationTracker] Background tracking not supported on web');
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) throw new Error('Location permission denied');

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: PUBLISH_INTERVAL_MS,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'Trans Allal',
          notificationBody: 'يتم بث موقعك الآن',
        },
        showsBackgroundLocationIndicator: true,
      });
    }
  },

  async stop(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (e) {
      console.warn('[LocationTracker] Stop error:', e);
    }
  },

  async getCurrentLocation(): Promise<Location.LocationObject> {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  },

  async isTracking(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    return TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  },
};
