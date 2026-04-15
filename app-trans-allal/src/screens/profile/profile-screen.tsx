import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/store/auth.store';
import { useTrackingState } from '@/hooks/use-tracking-state';
import type { DriverProfile } from '@/types/api';
import { appColors } from '@/theme/colors';

const PRIMARY = appColors.light.primary;

function buildDriverName(profile: DriverProfile | null) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const isTracking = useTrackingState();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    apiClient<DriverProfile>('/drivers/me')
      .then(setProfile)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, fadeAnim, slideAnim]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/(auth)/sign-in');
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  const driverName = buildDriverName(profile);
  const initials = getInitials(driverName);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 16) }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* ── Hero header ── */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlow2} />

          {/* Avatar */}
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          <Text style={styles.heroName}>{driverName}</Text>
          <Text style={styles.heroPhone}>{profile?.phone ?? ''}</Text>

          {/* Status pill */}
          <View style={[styles.statusPill, isTracking ? styles.pillOnline : styles.pillOffline]}>
            <View style={[styles.statusDot, isTracking ? styles.dotOnline : styles.dotOffline]} />
            <Text style={[styles.statusText, isTracking ? styles.statusOnline : styles.statusOffline]}>
              {isTracking ? t('home.online') : t('home.offline')}
            </Text>
          </View>
        </View>

        {/* ── Info section ── */}
        <View style={styles.section}>
          <InfoRow
            icon="person-outline"
            label={t('profile.name')}
            value={driverName}
          />
          <InfoRow
            icon="phone-android"
            label={t('profile.phone')}
            value={profile?.phone ?? '—'}
          />
          <InfoRow
            icon="badge"
            label={t('profile.license')}
            value={profile?.licenseNumber ?? '—'}
            isLast
          />
        </View>

        {/* ── Logout ── */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutPressed,
            loggingOut && styles.logoutDisabled,
          ]}
          onPress={() => void handleLogout()}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="logout" size={18} color="#fff" />
              <Text style={styles.logoutText}>{t('auth.signOut')}</Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowIconWrap}>
        <MaterialIcons name={icon} size={18} color={PRIMARY} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.light.background },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Hero */
  hero: {
    backgroundColor: PRIMARY,
    borderRadius: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute', top: -50, right: -30,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroGlow2: {
    position: 'absolute', bottom: -40, left: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(208,106,61,0.15)',
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  heroPhone: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 16 },

  statusPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillOnline: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  pillOffline: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: '#4ade80' },
  dotOffline: { backgroundColor: '#9ca3af' },
  statusText: { fontSize: 13, fontWeight: '700' },
  statusOnline: { color: '#4ade80' },
  statusOffline: { color: 'rgba(255,255,255,0.6)' },

  /* Info section */
  section: {
    backgroundColor: appColors.light.card,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.light.border,
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${PRIMARY}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  rowContent: { flex: 1, alignItems: 'flex-end' },
  rowLabel: { fontSize: 11, color: appColors.light.muted, marginBottom: 2 },
  rowValue: { fontSize: 14, fontWeight: '600', color: appColors.light.text, textAlign: 'right' },

  /* Logout */
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  logoutPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  logoutDisabled: { opacity: 0.6 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
