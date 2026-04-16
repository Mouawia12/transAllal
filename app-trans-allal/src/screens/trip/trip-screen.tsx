import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '@/services/api/client';
import { realtimeClient } from '@/services/api/realtime-client';
import type { Trip, TripStatus } from '@/types/api';
import { appColors } from '@/theme/colors';

const STATUS_COLORS: Record<TripStatus, string> = {
  PENDING: '#fef08a',
  IN_PROGRESS: '#bfdbfe',
  COMPLETED: '#bbf7d0',
  CANCELLED: '#fecaca',
};

const STATUS_TEXT_COLORS: Record<TripStatus, string> = {
  PENDING: '#854d0e',
  IN_PROGRESS: '#1e40af',
  COMPLETED: '#166534',
  CANCELLED: '#991b1b',
};

export function TripScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiClient<Trip[]>('/trips/my');
      setTrips(Array.isArray(result) ? result : []);
    } catch {
      // errors shown inline
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void load();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [load]);

  useEffect(() => {
    return realtimeClient.onTripStatusChanged(() => {
      void load();
    });
  }, [load]);

  async function handleTripAction(trip: Trip, newStatus: 'IN_PROGRESS' | 'COMPLETED') {
    setActionLoading(trip.id);
    try {
      await apiClient(`/trips/${trip.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch {
      // silently ignore
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={appColors.light.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 8, 16) },
        trips.length === 0 && styles.emptyContent,
      ]}
      data={trips}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('trip.title')}</Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('trip.noTrips')}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TripCard
          trip={item}
          t={t}
          onAction={handleTripAction}
          actionLoading={actionLoading === item.id}
        />
      )}
    />
  );
}

type TFunction = (key: string) => string;

function TripCard({
  trip,
  t,
  onAction,
  actionLoading,
}: {
  trip: Trip;
  t: TFunction;
  onAction: (trip: Trip, status: 'IN_PROGRESS' | 'COMPLETED') => Promise<void>;
  actionLoading: boolean;
}) {
  const scheduledDate = trip.scheduledAt
    ? new Date(trip.scheduledAt).toLocaleDateString('ar-DZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[trip.status] },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: STATUS_TEXT_COLORS[trip.status] }]}>
            {t(`trip.status.${trip.status}`)}
          </Text>
        </View>
        {scheduledDate ? (
          <Text style={styles.scheduledAt}>{scheduledDate}</Text>
        ) : null}
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('trip.origin')}</Text>
        <Text style={styles.rowValue}>{trip.origin}</Text>
      </View>

      <View style={[styles.row, styles.rowLast]}>
        <Text style={styles.rowLabel}>{t('trip.destination')}</Text>
        <Text style={styles.rowValue}>{trip.destination}</Text>
      </View>

      {trip.status === 'IN_PROGRESS' || trip.status === 'PENDING' ? (
        <Pressable
          style={[
            styles.actionButton,
            trip.status === 'IN_PROGRESS'
              ? styles.actionButtonComplete
              : styles.actionButtonStart,
            actionLoading && styles.actionButtonDisabled,
          ]}
          disabled={actionLoading}
          onPress={() =>
            void onAction(
              trip,
              trip.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED',
            )
          }
        >
          {actionLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>
              {trip.status === 'PENDING'
                ? t('trip.startTrip')
                : t('trip.completeTrip')}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.light.background },
  content: { padding: 16 },
  header: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: appColors.light.text,
    textAlign: 'right',
  },
  emptyContent: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: appColors.light.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: appColors.light.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: appColors.light.border,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scheduledAt: {
    fontSize: 12,
    color: appColors.light.muted,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: appColors.light.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 13,
    color: appColors.light.muted,
  },
  rowValue: {
    fontSize: 13,
    color: appColors.light.text,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    marginStart: 8,
  },
  actionButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonStart: {
    backgroundColor: appColors.light.primary,
  },
  actionButtonComplete: {
    backgroundColor: appColors.light.accent,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
