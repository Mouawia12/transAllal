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
const BATTERY_CACHE_MS = 30_000;
const FOREGROUND_PUBLISH_INTERVAL_MS = 5_000;
const BACKGROUND_PUBLISH_INTERVAL_MS = 10_000;
const FOREGROUND_DISTANCE_INTERVAL_M = 5;
const BACKGROUND_DISTANCE_INTERVAL_M = 15;

const WEB_DISTANCE_INTERVAL_M = 3;
const STATIONARY_TOLERANCE_M = 20;

type TrackingRuntimeMode = 'foreground' | 'background';
type TrackingStateListener = (isTracking: boolean) => void;

let webLocationSubscription: Location.LocationSubscription | null = null;
let lastTrackingSample:
  | {
      lat: number;
      lng: number;
      recordedAt: number;
    }
  | null = null;
let lastBatteryReading:
  | {
      level: number;
      recordedAt: number;
    }
  | null = null;
let currentNativeTrackingMode: TrackingRuntimeMode | null = null;
const trackingStateListeners = new Set<TrackingStateListener>();

function notifyTrackingStateChange(isTracking: boolean) {
  for (const listener of trackingStateListeners) {
    listener(isTracking);
  }
}

function createNativeLocationTaskOptions(
  mode: TrackingRuntimeMode,
): Location.LocationTaskOptions {
  const isForeground = mode === 'foreground';
  const timeInterval = isForeground
    ? FOREGROUND_PUBLISH_INTERVAL_MS
    : BACKGROUND_PUBLISH_INTERVAL_MS;
  const distanceInterval = isForeground
    ? FOREGROUND_DISTANCE_INTERVAL_M
    : BACKGROUND_DISTANCE_INTERVAL_M;

  return {
    accuracy: isForeground
      ? Location.Accuracy.Highest
      : Location.Accuracy.High,
    timeInterval,
    distanceInterval,
    deferredUpdatesDistance: distanceInterval,
    deferredUpdatesInterval: timeInterval,
    deferredUpdatesTimeout: timeInterval,
    activityType: Location.ActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Trans Allal • المراقبة فعالة',
      notificationBody: 'يتم تتبع موقعك الآن في الخلفية. افتح التطبيق إذا أردت إيقاف المراقبة.',
      notificationColor: '#083D35',
      killServiceOnDestroy: false,
    },
    showsBackgroundLocationIndicator: true,
  };
}

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
  const now = Date.now();
  if (lastBatteryReading && now - lastBatteryReading.recordedAt < BATTERY_CACHE_MS) {
    return lastBatteryReading.level;
  }

  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level >= 0 && level <= 1) {
      const normalizedLevel = Math.round(level * 100);
      lastBatteryReading = {
        level: normalizedLevel,
        recordedAt: now,
      };
      return normalizedLevel;
    }
  } catch {
    // Battery API not available on this platform
  }

  return lastBatteryReading?.level;
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
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  }
}

async function startNativeLocationUpdates(
  mode: TrackingRuntimeMode,
): Promise<boolean> {
  const isStarted = await hasStartedNativeTracking();
  if (isStarted && currentNativeTrackingMode === mode) {
    return false;
  }

  if (isStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
    createNativeLocationTaskOptions(mode),
  );

  currentNativeTrackingMode = mode;
  return true;
}

async function publishCurrentLocationSnapshot(): Promise<void> {
  try {
    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
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
            timeInterval: FOREGROUND_PUBLISH_INTERVAL_MS,
            distanceInterval: WEB_DISTANCE_INTERVAL_M,
          },
          (location) => {
            void publishLocationPayload(toTrackingPayload(location));
          },
        );
      }

      await setTrackingEnabled(true);
      await publishCurrentLocationSnapshot();
      notifyTrackingStateChange(true);
      return;
    }

    await startNativeLocationUpdates('foreground');
    await setTrackingEnabled(true);
    await publishCurrentLocationSnapshot();
    notifyTrackingStateChange(true);
  },

  async stop(): Promise<void> {
    if (Platform.OS === 'web') {
      webLocationSubscription?.remove();
      webLocationSubscription = null;
      await setTrackingEnabled(false);
      notifyTrackingStateChange(false);
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
      currentNativeTrackingMode = null;
      await setTrackingEnabled(false);
      notifyTrackingStateChange(false);
    }
  },

  async getCurrentLocation(): Promise<Location.LocationObject> {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  },

  async isTracking(): Promise<boolean> {
    if (Platform.OS === 'web') return webLocationSubscription !== null;
    // Intent-based: return true if the driver intentionally enabled tracking.
    // hasStartedNativeTracking() can briefly return false during foreground/background
    // transitions (race with the OS task manager). The driver's intent is persisted
    // reliably in AsyncStorage; restoreBackgroundTracking() handles restarting the
    // native task if needed when the app returns to the foreground.
    return isTrackingEnabled();
  },

  async syncRuntimeMode(mode: TrackingRuntimeMode): Promise<boolean> {
    if (Platform.OS === 'web') {
      return webLocationSubscription !== null;
    }

    if (!(await isTrackingEnabled())) {
      return false;
    }

    const token = await tokenStorage.getAccess();
    if (!token) {
      return false;
    }

    const foregroundPermission =
      await Location.getForegroundPermissionsAsync();
    const backgroundPermission =
      await Location.getBackgroundPermissionsAsync();
    if (
      foregroundPermission.status !== 'granted' ||
      backgroundPermission.status !== 'granted'
    ) {
      return false;
    }

    await startNativeLocationUpdates(mode);
    return true;
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
      notifyTrackingStateChange(true);
      return true;
    }

    const backgroundPermission =
      await Location.getBackgroundPermissionsAsync();
    if (backgroundPermission.status !== 'granted') {
      return false;
    }

    const startedTracking = await startNativeLocationUpdates('background');
    if (startedTracking) {
      await publishCurrentLocationSnapshot();
    }
    notifyTrackingStateChange(true);
    return true;
  },

  async flushPendingLocations(): Promise<void> {
    await flushQueuedLocationPayloads();
  },

  subscribeToTrackingState(listener: TrackingStateListener): () => void {
    trackingStateListeners.add(listener);
    return () => {
      trackingStateListeners.delete(listener);
    };
  },
};
