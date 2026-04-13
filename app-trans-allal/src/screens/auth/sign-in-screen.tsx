import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/services/api/client';
import { appColors } from '@/theme/colors';

type SignInFormValues = {
  phone: string;
  password: string;
};

export function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.appName}>{t('common.appName')}</Text>
        <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.phone')}</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder={t('auth.phonePlaceholder')}
                value={value}
                onBlur={onBlur}
                onChangeText={(nextValue) => {
                  clearErrors('phone');
                  setFormError(null);
                  onChange(nextValue);
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                textAlign="right"
              />
            )}
          />
          {errors.phone?.message ? (
            <Text style={styles.fieldError}>{errors.phone.message}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.password')}</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder={t('auth.passwordPlaceholder')}
                value={value}
                onBlur={onBlur}
                onChangeText={(nextValue) => {
                  clearErrors('password');
                  setFormError(null);
                  onChange(nextValue);
                }}
                secureTextEntry
                textAlign="right"
              />
            )}
          />
          {errors.password?.message ? (
            <Text style={styles.fieldError}>{errors.password.message}</Text>
          ) : null}
        </View>

        {formError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit(handleValidSignIn, handleInvalidSignIn)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.light.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: appColors.light.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 13,
    color: appColors.light.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: appColors.light.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: appColors.light.muted,
    textAlign: 'center',
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: appColors.light.text,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    backgroundColor: appColors.light.background,
    borderWidth: 1,
    borderColor: appColors.light.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: appColors.light.text,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    color: '#b91c1c',
    textAlign: 'right',
  },
  errorBanner: {
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 13,
    textAlign: 'right',
  },
  button: {
    backgroundColor: appColors.light.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
