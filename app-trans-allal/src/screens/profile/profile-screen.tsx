import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/store/auth.store';
import type { DriverProfile } from '@/types/api';
import { appColors } from '@/theme/colors';

export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuthStore();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    apiClient<DriverProfile>('/drivers/me')
      .then(setProfile)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

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
        <ActivityIndicator color={appColors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Status badge */}
      <View style={styles.headerCard}>
        <Text style={styles.driverName}>{profile?.user?.name ?? ''}</Text>
        <View
          style={[
            styles.statusBadge,
            profile?.isOnline ? styles.badgeOnline : styles.badgeOffline,
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {profile?.isOnline ? t('home.online') : t('home.offline')}
          </Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.card}>
        <ProfileRow label={t('profile.name')} value={profile?.user?.name ?? ''} />
        <ProfileRow label={t('profile.phone')} value={profile?.user?.phone ?? profile?.phone ?? ''} />
        <ProfileRow label={t('profile.license')} value={profile?.licenseNumber ?? ''} isLast />
      </View>

      {/* Logout */}
      <Pressable
        style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
        onPress={() => void handleLogout()}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.logoutText}>{t('auth.signOut')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function ProfileRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.light.background },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: appColors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'flex-end',
    gap: 10,
  },
  driverName: {
    fontSize: 22,
    fontWeight: '700',
    color: appColors.light.text,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeOnline: { backgroundColor: '#d1fae5' },
  badgeOffline: { backgroundColor: '#f3f4f6' },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.light.text,
  },
  card: {
    backgroundColor: appColors.light.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: appColors.light.border,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 14,
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
    textAlign: 'right',
    flexShrink: 1,
    marginStart: 8,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
});
