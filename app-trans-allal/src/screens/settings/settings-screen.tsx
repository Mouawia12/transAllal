import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { switchLanguage, type SupportedLang } from '@/lib/i18n';
import { appColors } from '@/theme/colors';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();

  async function handleSwitchLanguage(lang: SupportedLang) {
    await switchLanguage(lang);
    Alert.alert(
      t('settings.language'),
      lang === 'ar' ? 'يحتاج التطبيق إلى إعادة تشغيل لتطبيق RTL' : 'App needs restart to apply RTL changes',
    );
  }

  const currentLang = i18n.language as SupportedLang;
  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Language section */}
      <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
      <View style={styles.card}>
        <Pressable
          style={[
            styles.langButton,
            currentLang === 'ar' && styles.langButtonActive,
          ]}
          onPress={() => void handleSwitchLanguage('ar')}
        >
          <Text
            style={[
              styles.langButtonText,
              currentLang === 'ar' && styles.langButtonTextActive,
            ]}
          >
            العربية
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={[
            styles.langButton,
            currentLang === 'en' && styles.langButtonActive,
          ]}
          onPress={() => void handleSwitchLanguage('en')}
        >
          <Text
            style={[
              styles.langButtonText,
              currentLang === 'en' && styles.langButtonTextActive,
            ]}
          >
            English
          </Text>
        </Pressable>
      </View>

      {/* Version section */}
      <Text style={styles.sectionTitle}>{t('settings.version')}</Text>
      <View style={styles.card}>
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>{t('settings.version')}</Text>
          <Text style={styles.versionValue}>{appVersion}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.light.background },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.light.muted,
    textAlign: 'right',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: appColors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.light.border,
    overflow: 'hidden',
  },
  langButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  langButtonActive: {
    backgroundColor: '#f0fdf4',
  },
  langButtonText: {
    fontSize: 15,
    color: appColors.light.text,
    fontWeight: '500',
  },
  langButtonTextActive: {
    color: appColors.light.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: appColors.light.border,
    marginHorizontal: 16,
  },
  versionRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  versionLabel: {
    fontSize: 14,
    color: appColors.light.text,
    textAlign: 'right',
  },
  versionValue: {
    fontSize: 14,
    color: appColors.light.muted,
  },
});
