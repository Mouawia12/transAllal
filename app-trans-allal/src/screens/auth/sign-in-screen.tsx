import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { ApiError } from '@/services/api/client';
import { useAuthStore } from '@/store/auth.store';
import { appColors } from '@/theme/colors';

type SignInFormValues = {
  phone: string;
  password: string;
};

export function SignInScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const isRTL = i18n.dir() === 'rtl';
  const textAlign = isRTL ? 'right' : 'left';
  const rowDirection = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const alignItems = { alignItems: isRTL ? 'flex-end' : 'flex-start' } as const;

  const signInSchema = z.object({
    phone: z
      .string()
      .trim()
      .min(1, t('auth.phoneRequired'))
      .regex(/^[0-9+\-\s]{8,20}$/, t('auth.phoneInvalid')),
    password: z
      .string()
      .min(1, t('auth.passwordRequired'))
      .min(6, t('auth.passwordMin')),
  });

  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  function resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.code === 'VALIDATION_ERROR') {
        return t('auth.validationSummary');
      }

      if (error.status === 401) {
        return t('auth.invalidCredentials');
      }

      return error.message || t('auth.unexpectedError');
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return t('auth.unexpectedError');
  }

  async function handleValidSignIn(values: SignInFormValues) {
    setFormError(null);
    try {
      await login(values.phone.trim(), values.password);
      router.replace('/(driver)/(tabs)');
    } catch (error) {
      const message = resolveErrorMessage(error);
      setFormError(message);
      Alert.alert(t('common.error'), message);
    }
  }

  function handleInvalidSignIn() {
    setFormError(null);
    Alert.alert(t('auth.validationTitle'), t('auth.validationSummary'));
  }

  const submitSignIn = handleSubmit(handleValidSignIn, handleInvalidSignIn);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowAccent} />

            <View style={[styles.brandPill, rowDirection]}>
              <MaterialIcons name="local-shipping" size={16} color="#f7fbfa" />
              <Text style={styles.brandPillText}>{t('common.appName')}</Text>
            </View>

            <View style={[styles.heroCopy, alignItems]}>
              <Text style={[styles.heroTitle, { textAlign }]}>{t('auth.welcomeBack')}</Text>
              <Text style={[styles.heroSubtitle, { textAlign }]}>{t('auth.subtitle')}</Text>
            </View>

            <View style={[styles.heroHighlights, alignItems]}>
              <View style={[styles.highlightPill, rowDirection]}>
                <MaterialIcons name="verified-user" size={16} color="#d2efe8" />
                <Text style={styles.highlightText}>{t('auth.secureAccess')}</Text>
              </View>
              <View style={[styles.highlightPillSecondary, rowDirection]}>
                <MaterialIcons name="badge" size={16} color="#ffe1d2" />
                <Text style={styles.highlightSecondaryText}>{t('auth.driverPortal')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardHeader, alignItems]}>
              <Text style={[styles.cardEyebrow, { textAlign }]}>{t('auth.formEyebrow')}</Text>
              <Text style={[styles.cardTitle, { textAlign }]}>{t('auth.signIn')}</Text>
              <Text style={[styles.cardDescription, { textAlign }]}>
                {t('auth.formDescription')}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { textAlign }]}>{t('auth.phone')}</Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputShell,
                      rowDirection,
                      errors.phone && styles.inputShellError,
                    ]}
                  >
                    <MaterialIcons
                      name="phone-android"
                      size={20}
                      color={errors.phone ? '#b91c1c' : appColors.light.primary}
                    />
                    <TextInput
                      style={[styles.input, { textAlign }]}
                      placeholder={t('auth.phonePlaceholder')}
                      placeholderTextColor="#8a7f73"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(nextValue) => {
                        clearErrors('phone');
                        setFormError(null);
                        onChange(nextValue);
                      }}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      selectionColor={appColors.light.primary}
                      returnKeyType="next"
                    />
                  </View>
                )}
              />
              {errors.phone?.message ? (
                <Text style={[styles.fieldError, { textAlign }]}>{errors.phone.message}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { textAlign }]}>{t('auth.password')}</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputShell,
                      rowDirection,
                      errors.password && styles.inputShellError,
                    ]}
                  >
                    <MaterialIcons
                      name="lock-outline"
                      size={20}
                      color={errors.password ? '#b91c1c' : appColors.light.primary}
                    />
                    <TextInput
                      style={[styles.input, { textAlign }]}
                      placeholder={t('auth.passwordPlaceholder')}
                      placeholderTextColor="#8a7f73"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(nextValue) => {
                        clearErrors('password');
                        setFormError(null);
                        onChange(nextValue);
                      }}
                      secureTextEntry={!isPasswordVisible}
                      autoComplete="password"
                      textContentType="password"
                      selectionColor={appColors.light.primary}
                      returnKeyType="done"
                      onSubmitEditing={() => void submitSignIn()}
                    />
                    <Pressable
                      style={[styles.visibilityButton, rowDirection]}
                      onPress={() => setIsPasswordVisible((current) => !current)}
                    >
                      <MaterialIcons
                        name={isPasswordVisible ? 'visibility-off' : 'visibility'}
                        size={18}
                        color={appColors.light.muted}
                      />
                      <Text style={styles.visibilityButtonText}>
                        {t(isPasswordVisible ? 'auth.hidePassword' : 'auth.showPassword')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              />
              {errors.password?.message ? (
                <Text style={[styles.fieldError, { textAlign }]}>
                  {errors.password.message}
                </Text>
              ) : null}
            </View>

            {formError ? (
              <View style={[styles.errorBanner, rowDirection]}>
                <MaterialIcons name="error-outline" size={18} color="#b91c1c" />
                <Text style={[styles.errorBannerText, { textAlign }]}>{formError}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={() => void submitSignIn()}
              disabled={isLoading}
            >
              <View style={[styles.buttonContent, rowDirection]}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <MaterialIcons name="login" size={20} color="#fff" />
                )}
                <Text style={styles.buttonText}>
                  {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                </Text>
              </View>
            </Pressable>

            <Text style={[styles.footerNote, { textAlign }]}>{t('auth.signInNote')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3ede4',
  },
  container: {
    flex: 1,
    backgroundColor: '#f3ede4',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#113931',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 58,
    shadowColor: '#0a231d',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 8,
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -56,
    right: -34,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(61, 160, 134, 0.26)',
  },
  heroGlowAccent: {
    position: 'absolute',
    bottom: -34,
    left: -18,
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: 'rgba(208, 106, 61, 0.22)',
  },
  brandPill: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  brandPillText: {
    color: '#f7fbfa',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroCopy: {
    marginTop: 18,
    gap: 8,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 38,
  },
  heroSubtitle: {
    color: 'rgba(240, 248, 246, 0.82)',
    fontSize: 15,
    lineHeight: 24,
  },
  heroHighlights: {
    marginTop: 20,
    gap: 10,
  },
  highlightPill: {
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(71, 171, 142, 0.16)',
  },
  highlightText: {
    color: '#eaf7f3',
    fontSize: 13,
    fontWeight: '600',
  },
  highlightPillSecondary: {
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(208, 106, 61, 0.14)',
  },
  highlightSecondaryText: {
    color: '#fff1ea',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    marginTop: -32,
    borderRadius: 28,
    backgroundColor: appColors.light.card,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: '#ece3d8',
    shadowColor: '#735f47',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHeader: {
    gap: 6,
    marginBottom: 22,
  },
  cardEyebrow: {
    color: appColors.light.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  cardTitle: {
    color: appColors.light.text,
    fontSize: 24,
    fontWeight: '800',
  },
  cardDescription: {
    color: appColors.light.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: appColors.light.text,
  },
  inputShell: {
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddd0c0',
    backgroundColor: '#fbf7f2',
    paddingHorizontal: 14,
  },
  inputShellError: {
    borderColor: '#dc2626',
    backgroundColor: '#fff7f7',
  },
  input: {
    flex: 1,
    minHeight: 56,
    fontSize: 15,
    color: appColors.light.text,
  },
  visibilityButton: {
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  visibilityButtonText: {
    color: appColors.light.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    color: '#b91c1c',
  },
  errorBanner: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorBannerText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: appColors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#0c6b58',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  footerNote: {
    marginTop: 14,
    color: appColors.light.muted,
    fontSize: 12,
    lineHeight: 20,
  },
});
