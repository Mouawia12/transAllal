import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import type { LocationObject } from 'expo-location';
import { apiClient } from '@/services/api/client';
import { locationTracker } from '@/services/location/location-tracker.service';
import { appColors } from '@/theme/colors';

const SESSION_STARTED_KEY = 'trans-allal:session-started-at';

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TrackingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<LocationObject | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync UI with real tracking state (call on mount + app foreground)
  const syncState = useCallback(async () => {
    const tracking = await locationTracker.isTracking();
    setIsOnline(tracking);
    if (tracking) {
      const stored = await AsyncStorage.getItem(SESSION_STARTED_KEY);
      if (stored) {
        const startedAt = Number(stored);
        setSessionStartedAt(startedAt);
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }
    } else {
      setSessionStartedAt(null);
      setElapsed(0);
    }
  }, []);

  useEffect(() => {
    void syncState();
  }, [syncState]);

  // Re-sync whenever app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') void syncState();
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [syncState]);

  // Tick the elapsed counter while online
  const startTimer = useCallback((startedAt: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }, []);

  useEffect(() => {
    if (sessionStartedAt && isOnline) {
      startTimer(sessionStartedAt);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStartedAt, isOnline, startTimer]);

  // Refresh the displayed position whenever the app is online
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    locationTracker.getCurrentLocation()
      .then((loc) => { if (!cancelled) setCurrentLocation(loc); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOnline]);

  async function handleGoOnline() {
    setLoading(true);
    try {
      const granted = await locationTracker.requestPermissions();
      if (!granted) {
        Alert.alert(
          t('tracking.locationPermission'),
          t('tracking.permissionDeniedDetail'),
        );
        return;
      }

      // Start backend session first, then start local tracker.
      // If the local tracker fails we roll back the backend session so both
      // sides stay in sync (atomicity: no state drift on partial failure).
      await apiClient('/tracking/session/start', { method: 'POST' });
      try {
        await locationTracker.start();
      } catch (trackerErr) {
        // Rollback: backend session must be stopped to match local state
        try {
          await apiClient('/tracking/session/stop', { method: 'POST' });
        } catch {
          // Rollback best-effort — syncState() will reconcile on next mount
        }
        throw trackerErr;
      }

      const now = Date.now();
      await AsyncStorage.setItem(SESSION_STARTED_KEY, String(now));
      setSessionStartedAt(now);
      setIsOnline(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('tracking.startFailed');
      Alert.alert(t('tracking.startFailedTitle'), message);
      await syncState();
    } finally {
      setLoading(false);
    }
  }

  async function handleGoOffline() {
    setLoading(true);
    try {
      // Stop local tracker FIRST. If it fails, the backend session is still
      // running — no drift (both sides agree: online). Only proceed to stop
      // the backend once the local tracker has cleanly stopped.
      await locationTracker.stop();

      // Local tracker stopped. Now stop the backend session.
      try {
        await apiClient('/tracking/session/stop', { method: 'POST' });
      } catch (apiErr) {
        // Backend stop failed but local tracker is already stopped.
        // Rollback: restart the local tracker so both sides stay in sync.
        // Best-effort — if this also fails, syncState() will reconcile on
        // the next foreground transition.
        try {
          await locationTracker.start();
        } catch {
          // Rollback best-effort
        }
        throw apiErr;
      }

      await AsyncStorage.removeItem(SESSION_STARTED_KEY);
      setCurrentLocation(null);
      setSessionStartedAt(null);
      setIsOnline(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('tracking.stopFailed');
      Alert.alert(t('tracking.stopFailedTitle'), message);
      await syncState();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top + 8, 20) }]}>
      {/* Status indicator */}
      <View style={styles.statusRow}>
        <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
        <View style={styles.statusTextGroup}>
          <Text style={styles.statusText}>
            {isOnline ? t('tracking.broadcasting') : t('tracking.offline')}
          </Text>
          {isOnline && sessionStartedAt ? (
            <Text style={styles.elapsedText}>{formatElapsed(elapsed)}</Text>
          ) : null}
        </View>
      </View>

      {/* Location display — explicit fallback until a map library is integrated */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺</Text>
        {currentLocation ? (
          <>
            <Text style={styles.coordLabel}>
              {currentLocation.coords.latitude.toFixed(6)}°N
            </Text>
            <Text style={styles.coordLabel}>
              {currentLocation.coords.longitude.toFixed(6)}°E
            </Text>
            {currentLocation.coords.accuracy != null ? (
              <Text style={styles.coordAccuracy}>
                ±{Math.round(currentLocation.coords.accuracy)}m
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.mapLabel}>
            {t('tracking.title')}
          </Text>
        )}
      </View>

      {/* Toggle button */}
      <Pressable
        style={[
          styles.toggleButton,
          isOnline ? styles.toggleButtonOffline : styles.toggleButtonOnline,
          loading && styles.toggleButtonDisabled,
        ]}
        onPress={isOnline ? handleGoOffline : handleGoOnline}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.toggleButtonText}>
            {isOnline ? t('tracking.goOffline') : t('tracking.goOnline')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.light.background,
    padding: 20,
  },
  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: appColors.light.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOnline: {
    backgroundColor: '#22c55e',
  },
  dotOffline: {
    backgroundColor: '#9ca3af',
  },
  statusTextGroup: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.light.text,
    textAlign: 'right',
  },
  elapsedText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.light.primary,
    fontVariant: ['tabular-nums'],
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: appColors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  mapEmoji: {
    fontSize: 64,
  },
  mapLabel: {
    fontSize: 14,
    color: appColors.light.muted,
    textAlign: 'center',
  },
  coordLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: appColors.light.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  coordAccuracy: {
    fontSize: 12,
    color: appColors.light.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  toggleButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonOnline: {
    backgroundColor: appColors.light.primary,
  },
  toggleButtonOffline: {
    backgroundColor: appColors.light.accent,
  },
  toggleButtonDisabled: {
    opacity: 0.6,
  },
  toggleButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
});
