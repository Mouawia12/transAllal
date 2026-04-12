import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/services/api/client';
import type { DriverProfile, Trip } from '@/types/api';
import { appColors } from '@/theme/colors';

export function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [prof, trips] = await Promise.all([
        apiClient<DriverProfile>('/drivers/me'),
        apiClient<{ items: Trip[] }>('/trips/my?status=IN_PROGRESS&limit=1'),
      ]);
      setProfile(prof);
      setActiveTrip(trips.items[0] ?? null);
    } catch {
      // errors shown inline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={appColors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{t('home.title')}</Text>
        <Text style={styles.name}>{user?.name ?? profile?.user?.name ?? ''}</Text>

        <View style={[styles.badge, profile?.isOnline ? styles.badgeOnline : styles.badgeOffline]}>
          <Text style={styles.badgeText}>
            {profile?.isOnline ? t('home.online') : t('home.offline')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.assignedTrip')}</Text>
        {activeTrip ? (
          <View>
            <TripRow label={t('trip.origin')} value={activeTrip.originAddress} />
            <TripRow label={t('trip.destination')} value={activeTrip.destinationAddress} />
            <TripRow label={t('trip.status.IN_PROGRESS')} value={t('trip.status.IN_PROGRESS')} />
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('home.noTrip')}</Text>
        )}
      </View>
    </ScrollView>
  );
}

function TripRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.light.background },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: appColors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  greeting: { fontSize: 13, color: appColors.light.muted, marginBottom: 4 },
  name: { fontSize: 20, fontWeight: '700', color: appColors.light.text, marginBottom: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeOnline: { backgroundColor: '#d1fae5' },
  badgeOffline: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontWeight: '600', color: appColors.light.text },
  card: {
    backgroundColor: appColors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: appColors.light.text,
    marginBottom: 12,
    textAlign: 'right',
  },
  emptyText: { fontSize: 14, color: appColors.light.muted, textAlign: 'right' },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: appColors.light.border,
  },
  rowLabel: { fontSize: 13, color: appColors.light.muted },
  rowValue: { fontSize: 13, color: appColors.light.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
});
