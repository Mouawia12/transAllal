import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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

const BRAND_ICON = require('../../assets/images/branding/brand-icon.png');

export function SignInScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { height } = useWindowDimensions();
  const isRTL = i18n.dir() === 'rtl';
  const isCompactHeight = height < 780;
  const textAlign = isRTL ? 'right' : 'left';
  const rowDirection = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const formHeaderAlignment = { alignItems: isRTL ? 'flex-end' : 'flex-start' } as const;

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.screen, isCompactHeight && styles.screenCompact]}>
          <View style={[styles.heroCard, isCompactHeight && styles.heroCardCompact]}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />

            <View style={[styles.brandBadge, rowDirection]}>
              <Image source={BRAND_ICON} style={styles.brandBadgeLogo} />
              <Text style={styles.brandBadgeText}>{t('common.appName')}</Text>
            </View>

            <View style={[styles.logoWrap, isCompactHeight && styles.logoWrapCompact]}>
              <View style={styles.logoPlate}>
                <Image
                  source={BRAND_ICON}
                  style={[styles.logoImage, isCompactHeight && styles.logoImageCompact]}
                />
              </View>
            </View>

            <Text style={[styles.heroTitle, isCompactHeight && styles.heroTitleCompact]}>
              {t('auth.welcomeBack')}
            </Text>
            <Text style={[styles.heroSubtitle, isCompactHeight && styles.heroSubtitleCompact]}>
              {t('auth.subtitle')}
            </Text>
          </View>

          <View style={[styles.formCard, isCompactHeight && styles.formCardCompact]}>
            <View style={[styles.formHeader, formHeaderAlignment]}>
              <Text style={[styles.formEyebrow, { textAlign }]}>
                {t('auth.formEyebrow')}
              </Text>
              <Text style={[styles.formTitle, isCompactHeight && styles.formTitleCompact]}>
                {t('auth.signIn')}
              </Text>
            </View>

            <View style={[styles.field, isCompactHeight && styles.fieldCompact]}>
              <Text style={[styles.label, { textAlign }]}>{t('auth.phone')}</Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputShell,
                      isCompactHeight && styles.inputShellCompact,
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
                      style={[styles.input, isCompactHeight && styles.inputCompact, { textAlign }]}
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

            <View style={[styles.field, isCompactHeight && styles.fieldCompact]}>
              <Text style={[styles.label, { textAlign }]}>{t('auth.password')}</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputShell,
                      isCompactHeight && styles.inputShellCompact,
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
                      style={[styles.input, isCompactHeight && styles.inputCompact, { textAlign }]}
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
                      style={[
                        styles.visibilityButton,
                        rowDirection,
                        isCompactHeight && styles.visibilityButtonCompact,
                      ]}
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
              style={[
                styles.button,
                isCompactHeight && styles.buttonCompact,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={() => void submitSignIn()}
              disabled={isLoading}
            >
              <View style={[styles.buttonContent, rowDirection]}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <MaterialIcons name="login" size={20} color="#fff" />
                )}
                <Text style={styles.buttonLabel}>
                  {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#efe7db',
  },
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    justifyContent: 'space-between',
    gap: 14,
  },
  screenCompact: {
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#0a4e45',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#082b28',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  heroCardCompact: {
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -44,
    right: -10,
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(78, 175, 149, 0.22)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -52,
    left: -18,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(208, 106, 61, 0.18)',
  },
  brandBadge: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  brandBadgeLogo: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  brandBadgeText: {
    color: '#eef8f5',
    fontSize: 12,
    fontWeight: '700',
  },
  logoWrap: {
    marginTop: 16,
    marginBottom: 12,
  },
  logoWrapCompact: {
    marginTop: 12,
    marginBottom: 10,
  },
  logoPlate: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f5ee',
    shadowColor: '#041d1a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  logoImageCompact: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
  },
  heroTitleCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  heroSubtitle: {
    marginTop: 8,
    maxWidth: 300,
    color: 'rgba(235, 246, 243, 0.84)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  heroSubtitleCompact: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    borderRadius: 28,
    backgroundColor: '#fcfaf5',
    borderWidth: 1,
    borderColor: '#e5d8ca',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#2b2119',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 4,
  },
  formCardCompact: {
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  formHeader: {
    gap: 2,
  },
  formEyebrow: {
    color: appColors.light.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  formTitle: {
    color: appColors.light.text,
    fontSize: 25,
    fontWeight: '800',
  },
  formTitleCompact: {
    fontSize: 22,
  },
  field: {
    marginTop: 14,
  },
  fieldCompact: {
    marginTop: 10,
  },
  label: {
    marginBottom: 7,
    color: appColors.light.text,
    fontSize: 13,
    fontWeight: '700',
  },
  inputShell: {
    minHeight: 58,
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: appColors.light.border,
    backgroundColor: '#f8f2eb',
    paddingHorizontal: 14,
  },
  inputShellCompact: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 12,
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
  inputCompact: {
    minHeight: 50,
    fontSize: 14,
  },
  visibilityButton: {
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  visibilityButtonCompact: {
    gap: 2,
  },
  visibilityButtonText: {
    color: appColors.light.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldError: {
    marginTop: 6,
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 18,
  },
  errorBanner: {
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff2f2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: appColors.light.primary,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: appColors.light.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  buttonCompact: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.82,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
