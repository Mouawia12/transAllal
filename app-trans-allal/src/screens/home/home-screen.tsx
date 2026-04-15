import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/services/api/client';
import { useTrackingState } from '@/hooks/use-tracking-state';
import type { DriverProfile, Trip } from '@/types/api';
import { appColors } from '@/theme/colors';

const PRIMARY = appColors.light.primary;
const ACCENT = appColors.light.accent;

function buildDriverName(profile: DriverProfile | null, fallbackName?: string) {
  if (fallbackName?.trim()) return fallbackName.trim();
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
}

function selectActiveTrip(trips: Trip[]): Trip | null {
  return (
    trips.find((t) => t.status === 'IN_PROGRESS') ??
    trips.find((t) => t.status === 'PENDING') ??
    null
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function OnlinePulse() {
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, { toValue: 2.6, duration: 1400, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: delay === 0 ? 0.6 : 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );

    const a1 = pulse(ring1, ring1Opacity, 0);
    const a2 = pulse(ring2, ring2Opacity, 600);
    a1.start();
    a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, [ring1, ring2, ring1Opacity, ring2Opacity]);

  return (
    <View style={pulse.container}>
      <Animated.View style={[pulse.ring, { transform: [{ scale: ring1 }], opacity: ring1Opacity }]} />
      <Animated.View style={[pulse.ring, { transform: [{ scale: ring2 }], opacity: ring2Opacity }]} />
      <View style={pulse.dot} />
    </View>
  );
}

const pulse = StyleSheet.create({
  container: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
});

export function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isTracking = useTrackingState();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  async function load() {
    try {
      const [prof, trips] = await Promise.all([
        apiClient<DriverProfile>('/drivers/me'),
        apiClient<Trip[]>('/trips/my'),
      ]);
      setProfile(prof);
      setActiveTrip(selectActiveTrip(Array.isArray(trips) ? trips : []));
    } catch {
      setActiveTrip(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, fadeAnim, slideAnim]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  const driverName = buildDriverName(profile, user?.name);
  const initials = getInitials(driverName);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 16) }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(); }}
          tintColor={PRIMARY}
          colors={[PRIMARY]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          {/* decorative glows */}
          <View style={styles.glowTopRight} />
          <View style={styles.glowBottomLeft} />

          <View style={styles.heroRow}>
            {/* Avatar */}
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>

            {/* Name + greeting */}
            <View style={styles.heroCopy}>
              <Text style={styles.heroGreeting}>{t('home.title')}</Text>
              <Text style={styles.heroName} numberOfLines={1}>{driverName}</Text>
            </View>

            {/* App icon */}
            <Image
              source={require('../../assets/images/branding/brand-icon.png')}
              style={styles.heroLogo}
            />
          </View>

          {/* Status pill */}
          <View style={[styles.statusPill, isTracking ? styles.pillOnline : styles.pillOffline]}>
            {isTracking ? (
              <OnlinePulse />
            ) : (
              <View style={styles.offlineDot} />
            )}
            <Text style={[styles.statusPillText, isTracking ? styles.statusTextOnline : styles.statusTextOffline]}>
              {isTracking ? t('home.online') : t('home.offline')}
            </Text>
          </View>
        </View>

        {/* ── Active trip card ── */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="local-shipping" size={18} color={PRIMARY} />
          <Text style={styles.sectionTitle}>{t('home.assignedTrip')}</Text>
        </View>

        <View style={styles.tripCard}>
          {activeTrip ? (
            <>
              <View style={[styles.tripStatusBar, activeTrip.status === 'IN_PROGRESS' ? styles.tripBarActive : styles.tripBarPending]} />
              <View style={styles.tripContent}>
                <TripRoute origin={activeTrip.origin} destination={activeTrip.destination} />
                <View style={styles.tripMeta}>
                  <TripChip
                    icon="flag"
                    label={t(`trip.status.${activeTrip.status}`)}
                    active={activeTrip.status === 'IN_PROGRESS'}
                  />
                  {activeTrip.truck && (
                    <TripChip
                      icon="local-shipping"
                      label={activeTrip.truck.plateNumber}
                    />
                  )}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyTrip}>
              <MaterialIcons name="directions-off" size={36} color={appColors.light.border} />
              <Text style={styles.emptyText}>{t('home.noTrip')}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function TripRoute({ origin, destination }: { origin: string; destination: string }) {
  return (
    <View style={styles.routeWrap}>
      <View style={styles.routeLeft}>
        <View style={styles.routeDotGreen} />
        <View style={styles.routeLine} />
        <View style={styles.routeDotRed} />
      </View>
      <View style={styles.routeRight}>
        <Text style={styles.routeLabel}>{origin}</Text>
        <Text style={styles.routeLabel}>{destination}</Text>
      </View>
    </View>
  );
}

function TripChip({ icon, label, active = false }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; active?: boolean }) {
  return (
    <View style={[styles.chip, active && styles.chipActive]}>
      <MaterialIcons name={icon} size={13} color={active ? '#fff' : appColors.light.muted} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.light.background },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Hero */
  heroCard: {
    borderRadius: 24,
    backgroundColor: PRIMARY,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  glowTopRight: {
    position: 'absolute', top: -40, right: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glowBottomLeft: {
    position: 'absolute', bottom: -50, left: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(208,106,61,0.18)',
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  heroCopy: { flex: 1, alignItems: 'flex-end' },
  heroGreeting: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 3 },
  heroName: { color: '#fff', fontSize: 19, fontWeight: '800', textAlign: 'right' },
  heroLogo: { width: 42, height: 42, borderRadius: 14, opacity: 0.9 },

  statusPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillOnline: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  pillOffline: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  offlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#9ca3af' },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  statusTextOnline: { color: '#4ade80' },
  statusTextOffline: { color: 'rgba(255,255,255,0.6)' },

  /* Section */
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.light.text,
  },

  /* Trip card */
  tripCard: {
    backgroundColor: appColors.light.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  tripStatusBar: { height: 4, width: '100%' },
  tripBarActive: { backgroundColor: PRIMARY },
  tripBarPending: { backgroundColor: ACCENT },
  tripContent: { padding: 16 },
  routeWrap: { flexDirection: 'row-reverse', gap: 12, marginBottom: 14 },
  routeLeft: { alignItems: 'center', paddingTop: 4, gap: 3 },
  routeDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  routeLine: { width: 2, height: 24, backgroundColor: appColors.light.border },
  routeDotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  routeRight: { flex: 1, justifyContent: 'space-between', gap: 20 },
  routeLabel: { fontSize: 14, fontWeight: '600', color: appColors.light.text, textAlign: 'right' },
  tripMeta: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: appColors.light.background,
  },
  chipActive: { backgroundColor: PRIMARY },
  chipText: { fontSize: 12, fontWeight: '600', color: appColors.light.muted },
  chipTextActive: { color: '#fff' },
  emptyTrip: { padding: 32, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: appColors.light.muted, textAlign: 'center' },
});
