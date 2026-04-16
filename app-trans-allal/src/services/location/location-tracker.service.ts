import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/services/api/client';
import { tokenStorage } from '@/services/storage/token-storage';
import {
  enqueueRequest,
  flushQueue,
  isOnline,
} from '@/services/connectivity/connectivity.service';

const BACKGROUND_LOCATION_TASK = 'trans-allal-background-location';
const TRACKING_ENABLED_KEY = 'trans-allal:tracking-enabled';

// Publishing cadence: 5 s on iOS/Android (platform task minimum), 3 m / 5 s on web.
// This gives near-real-time tracking (~5–10 s end-to-end latency including network).
// If sub-second SLA is required, switch to a WebSocket streaming approach instead of
// HTTP polling, and negotiate a lower timeInterval with the platform (iOS ignores
// values below ~5 s in background mode; foreground can go to ~1 s).
const PUBLISH_INTERVAL_MS = 5000;
const WEB_DISTANCE_INTERVAL_M = 3;
const STATIONARY_TOLERANCE_M = 20;

let webLocationSubscription: Location.LocationSubscription | null = null;
let lastTrackingSample:
  | {
      lat: number;
      lng: number;
      recordedAt: number;
    }
  | null = null;

const nativeLocationTaskOptions: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: PUBLISH_INTERVAL_MS,
  distanceInterval: 5,
  deferredUpdatesDistance: 0,
  deferredUpdatesInterval: PUBLISH_INTERVAL_MS,
  deferredUpdatesTimeout: PUBLISH_INTERVAL_MS,
  activityType: Location.ActivityType.AutomotiveNavigation,
  pausesUpdatesAutomatically: false,
  foregroundService: {
    notificationTitle: 'Trans Allal',
    notificationBody: 'يتم بث موقعك في الخلفية للمراقبة المباشرة',
    notificationColor: '#083D35',
    killServiceOnDestroy: false,
  },
  showsBackgroundLocationIndicator: true,
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(
  leftLat: number,
  leftLng: number,
  rightLat: number,
  rightLng: number,
) {
  const earthRadiusM = 6_371_000;
  const dLat = toRadians(rightLat - leftLat);
  const dLng = toRadians(rightLng - leftLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(leftLat)) *
      Math.cos(toRadians(rightLat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toTrackingPayload(location: Location.LocationObject) {
  const now = Date.now();
  const { latitude, longitude, speed, heading, accuracy } = location.coords;
  const normalizedAccuracy = accuracy ?? 0;

  let speedKmh =
    speed != null && Number.isFinite(speed) && speed >= 0
      ? Number((speed * 3.6).toFixed(1))
      : 0;

  if (lastTrackingSample) {
    const distance = distanceMeters(
      lastTrackingSample.lat,
      lastTrackingSample.lng,
      latitude,
      longitude,
    );
    const hoursElapsed = (now - lastTrackingSample.recordedAt) / 3_600_000;

    if (distance <= Math.max(normalizedAccuracy, STATIONARY_TOLERANCE_M)) {
      speedKmh = 0;
    } else if (hoursElapsed > 0 && speedKmh === 0) {
      speedKmh = Number(
        Math.min(distance / 1000 / hoursElapsed, 220).toFixed(1),
      );
    }
  }

  lastTrackingSample = {
    lat: latitude,
    lng: longitude,
    recordedAt: now,
  };

  return {
    lat: latitude,
    lng: longitude,
    speedKmh,
    heading: heading ?? undefined,
    accuracyM: accuracy ?? undefined,
  };
}

async function readBatteryLevel(): Promise<number | undefined> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level >= 0 && level <= 1) {
      return Math.round(level * 100);
    }
  } catch {
    // Battery API not available on this platform
  }
  return undefined;
}

async function setTrackingEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(TRACKING_ENABLED_KEY, '1');
    return;
  }

  await AsyncStorage.removeItem(TRACKING_ENABLED_KEY);
}

async function isTrackingEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(TRACKING_ENABLED_KEY);
  return value === '1';
}

async function hasStartedNativeTracking(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
  } catch {
    return TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  }
}

async function startNativeLocationUpdates(): Promise<void> {
  const isStarted = await hasStartedNativeTracking();
  if (isStarted) {
    return;
  }

  await Location.startLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
    nativeLocationTaskOptions,
  );
}

async function publishCurrentLocationSnapshot(): Promise<void> {
  try {
    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    await publishLocationPayload(toTrackingPayload(currentLocation));
    await flushQueuedLocationPayloads();
  } catch (error) {
    console.warn('[LocationTracker] Initial publish error:', error);
  }
}

async function publishLocationPayload(
  payload: ReturnType<typeof toTrackingPayload>,
): Promise<void> {
  const token = await tokenStorage.getAccess();
  if (!token) {
    return;
  }

  const batteryLevel = await readBatteryLevel();
  const enrichedPayload = {
    ...payload,
    ...(batteryLevel !== undefined && { batteryLevel }),
  };

  try {
    const online = await isOnline();
    if (online) {
      await apiClient(
        '/tracking/location',
        {
          method: 'POST',
          body: JSON.stringify(enrichedPayload),
        },
        { token },
      );
      return;
    }
  } catch {
    // Fall through to offline queue.
  }

  await enqueueRequest({
    path: '/tracking/location',
    method: 'POST',
    body: JSON.stringify(enrichedPayload),
  });
}

async function flushQueuedLocationPayloads(): Promise<void> {
  const token = await tokenStorage.getAccess();
  if (!token) {
    return;
  }

  if (!(await isOnline())) {
    return;
  }

  await flushQueue(async (request) => {
    await apiClient(
      request.path,
      {
        method: request.method,
        body: request.body,
      },
      { token },
    );
  });
}

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

  const payload = toTrackingPayload(location);

  try {
    await publishLocationPayload(payload);
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
    const foregroundPermission =
      await Location.getForegroundPermissionsAsync();
    const fgStatus =
      foregroundPermission.status === 'granted'
        ? foregroundPermission.status
        : (await Location.requestForegroundPermissionsAsync()).status;
    if (fgStatus !== 'granted') return false;

    if (Platform.OS !== 'web') {
      const backgroundPermission =
        await Location.getBackgroundPermissionsAsync();
      const bgStatus =
        backgroundPermission.status === 'granted'
          ? backgroundPermission.status
          : (await Location.requestBackgroundPermissionsAsync()).status;
      if (bgStatus !== 'granted') return false;
    }
    return true;
  },

  async start(): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) throw new Error('Location permission denied');

    if (Platform.OS === 'web') {
      if (!webLocationSubscription) {
        webLocationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: PUBLISH_INTERVAL_MS,
            distanceInterval: WEB_DISTANCE_INTERVAL_M,
          },
          (location) => {
            void publishLocationPayload(toTrackingPayload(location));
          },
        );
      }

      await setTrackingEnabled(true);
      await publishCurrentLocationSnapshot();
      return;
    }

    await startNativeLocationUpdates();
    await setTrackingEnabled(true);
    await publishCurrentLocationSnapshot();
  },

  async stop(): Promise<void> {
    if (Platform.OS === 'web') {
      webLocationSubscription?.remove();
      webLocationSubscription = null;
      await setTrackingEnabled(false);
      return;
    }
    try {
      const isRegistered = await hasStartedNativeTracking();
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (e) {
      console.warn('[LocationTracker] Stop error:', e);
    } finally {
      await setTrackingEnabled(false);
    }
  },

  async getCurrentLocation(): Promise<Location.LocationObject> {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  },

  async isTracking(): Promise<boolean> {
    if (Platform.OS === 'web') return webLocationSubscription !== null;
    return hasStartedNativeTracking();
  },

  async shouldKeepTrackingInBackground(): Promise<boolean> {
    return isTrackingEnabled();
  },

  async restoreBackgroundTracking(): Promise<boolean> {
    if (!(await isTrackingEnabled())) {
      return false;
    }

    const token = await tokenStorage.getAccess();
    if (!token) {
      return false;
    }

    const foregroundPermission =
      await Location.getForegroundPermissionsAsync();
    if (foregroundPermission.status !== 'granted') {
      return false;
    }

    if (Platform.OS === 'web') {
      if (!webLocationSubscription) {
        await this.start();
      }
      return true;
    }

    const backgroundPermission =
      await Location.getBackgroundPermissionsAsync();
    if (backgroundPermission.status !== 'granted') {
      return false;
    }

    await startNativeLocationUpdates();
    await publishCurrentLocationSnapshot();
    return true;
  },

  async flushPendingLocations(): Promise<void> {
    await flushQueuedLocationPayloads();
  },
};
