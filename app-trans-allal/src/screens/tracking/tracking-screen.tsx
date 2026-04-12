import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/api/client';
import { locationTracker } from '@/services/location/location-tracker.service';
import { appColors } from '@/theme/colors';

export function TrackingScreen() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    locationTracker.isTracking().then(setIsOnline);
  }, []);

  async function handleGoOnline() {
    setLoading(true);
    try {
      const granted = await locationTracker.requestPermissions();
      if (!granted) {
        Alert.alert(
          t('tracking.locationPermission'),
          t('tracking.permissionDenied'),
        );
        return;
      }
      await apiClient('/tracking/session/start', { method: 'POST' });
      await locationTracker.start();
      setIsOnline(true);
    } catch {
      // handled silently; user sees no change
    } finally {
      setLoading(false);
    }
  }

  async function handleGoOffline() {
    setLoading(true);
    try {
      await locationTracker.stop();
      await apiClient('/tracking/session/stop', { method: 'POST' });
      setIsOnline(false);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Status indicator */}
      <View style={styles.statusRow}>
        <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
        <Text style={styles.statusText}>
          {isOnline ? t('tracking.broadcasting') : t('tracking.offline')}
        </Text>
      </View>

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺</Text>
        <Text style={styles.mapLabel}>
          {t('tracking.title')}
        </Text>
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
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.light.text,
    textAlign: 'right',
    flex: 1,
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
