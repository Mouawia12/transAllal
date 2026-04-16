import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRequiredSetupStatus } from '@/hooks/use-required-setup-status';
import { registerPushToken } from '@/services/notifications/push-notifications.service';
import {
  confirmManufacturerBackgroundSetup,
  openAppSettings,
  openLocationSettings,
  openManufacturerBackgroundSettings,
  openNotificationSettings,
  requestBatteryOptimizationExemption,
} from '@/services/permissions/required-setup.service';
import { locationTracker } from '@/services/location/location-tracker.service';
import { useAuthStore } from '@/store/auth.store';
import { appColors } from '@/theme/colors';

type BusyAction =
  | 'all'
  | 'location-services'
  | 'location-permissions'
  | 'notifications'
  | 'battery'
  | 'manufacturer'
  | 'manufacturer-confirm'
  | 'logout'
  | null;

type SetupStepId =
  | 'location-services'
  | 'location-permissions'
  | 'notifications'
  | 'battery'
  | 'manufacturer';

type SetupCardProps = {
  title: string;
  description: string;
  done: boolean;
  actionLabel: string;
  onPress: () => void;
  busy: boolean;
  children?: ReactNode;
};

function SetupCard({
  title,
  description,
  done,
  actionLabel,
  onPress,
  busy,
  children,
}: SetupCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.statusBadge,
            done ? styles.statusBadgeDone : styles.statusBadgePending,
          ]}
        >
          <MaterialIcons
            color={done ? '#0f5132' : '#9a3412'}
            name={done ? 'check-circle' : 'pending'}
            size={18}
          />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </View>
      {children}
      {!done ? (
        <Pressable
          style={[styles.secondaryButton, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={onPress}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.secondaryButtonText}>{actionLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export function RequiredSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);
  const { status, isLoading, refresh } = useRequiredSetupStatus(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [guidedStep, setGuidedStep] = useState<SetupStepId | null>(null);
  const [manufacturerSettingsVisited, setManufacturerSettingsVisited] =
    useState(false);

  const manufacturerSteps = useMemo(() => {
    if (!status?.manufacturerGuide.steps.length) {
      return [];
    }

    return status.manufacturerGuide.steps.map((step, index) => ({
      id: `${index}-${step}`,
      label: step,
    }));
  }, [status?.manufacturerGuide.steps]);

  const runAction = useCallback(async (action: BusyAction, work: () => Promise<void>) => {
    setBusyAction(action);
    try {
      await work();
    } finally {
      await refresh();
      setBusyAction(null);
    }
  }, [refresh]);

  const getNextPendingStep = useCallback((): SetupStepId | null => {
    if (!status) {
      return null;
    }

    if (!status.locationServicesEnabled) {
      return 'location-services';
    }

    if (
      !status.foregroundLocationGranted ||
      !status.backgroundLocationGranted
    ) {
      return 'location-permissions';
    }

    if (!status.notificationsGranted) {
      return 'notifications';
    }

    if (
      status.batteryOptimizationSupported &&
      !status.batteryOptimizationIgnored
    ) {
      return 'battery';
    }

    if (
      status.manufacturerGuide.requiresManualConfirmation &&
      !status.manufacturerBackgroundConfirmed
    ) {
      return 'manufacturer';
    }

    return null;
  }, [status]);

  const isStepComplete = useCallback((step: SetupStepId) => {
    if (!status) {
      return false;
    }

    switch (step) {
      case 'location-services':
        return status.locationServicesEnabled;
      case 'location-permissions':
        return (
          status.foregroundLocationGranted &&
          status.backgroundLocationGranted
        );
      case 'notifications':
        return status.notificationsGranted;
      case 'battery':
        return !status.batteryOptimizationSupported || status.batteryOptimizationIgnored;
      case 'manufacturer':
        return (
          !status.manufacturerGuide.requiresManualConfirmation ||
          status.manufacturerBackgroundConfirmed
        );
      default:
        return false;
    }
  }, [status]);

  const requestLocationPermissions = useCallback(async () => {
    const granted = await locationTracker.requestPermissions();
    if (!granted) {
      await openAppSettings();
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    await registerPushToken();
    const nextStatus = await refresh();
    if (nextStatus && !nextStatus.notificationsGranted) {
      await openNotificationSettings();
    }
  }, [refresh]);

  const runGuidedStep = useCallback(async (step: SetupStepId) => {
    setGuidedStep(step);

    switch (step) {
      case 'location-services':
        await runAction('location-services', async () => {
          await openLocationSettings();
        });
        return;
      case 'location-permissions':
        await runAction('location-permissions', requestLocationPermissions);
        return;
      case 'notifications':
        await runAction('notifications', requestNotifications);
        return;
      case 'battery':
        await runAction('battery', async () => {
          await requestBatteryOptimizationExemption();
        });
        return;
      case 'manufacturer':
        if (!manufacturerSettingsVisited) {
          await runAction('manufacturer', async () => {
            const opened = await openManufacturerBackgroundSettings();
            if (opened) {
              setManufacturerSettingsVisited(true);
            }
          });
          return;
        }

        await runAction('manufacturer-confirm', async () => {
          if (!status?.manufacturerGuide.manufacturer) {
            return;
          }
          await confirmManufacturerBackgroundSetup(
            status.manufacturerGuide.manufacturer,
          );
        });
        return;
      default:
        return;
    }
  }, [
    manufacturerSettingsVisited,
    requestLocationPermissions,
    requestNotifications,
    runAction,
    status?.manufacturerGuide.manufacturer,
  ]);

  async function handleAllRequirements() {
    const nextStep = getNextPendingStep();
    if (!nextStep) {
      return;
    }

    await runGuidedStep(nextStep);
  }

  async function handleManufacturerConfirmation() {
    if (!status?.manufacturerGuide.manufacturer) {
      return;
    }

    await runAction('manufacturer-confirm', async () => {
      await confirmManufacturerBackgroundSetup(
        status.manufacturerGuide.manufacturer,
      );
    });
  }

  useEffect(() => {
    if (!status?.isComplete) {
      return;
    }

    router.replace('/(driver)/(tabs)');
  }, [router, status?.isComplete]);

  useEffect(() => {
    if (!status || busyAction !== null || !guidedStep) {
      return;
    }

    if (status.isComplete) {
      setGuidedStep(null);
      return;
    }

    if (!isStepComplete(guidedStep)) {
      setGuidedStep(null);
      return;
    }

    const nextStep = getNextPendingStep();
    if (!nextStep) {
      setGuidedStep(null);
      return;
    }

    void runGuidedStep(nextStep);
  }, [busyAction, getNextPendingStep, guidedStep, isStepComplete, runGuidedStep, status]);

  async function handleLogout() {
    await runAction('logout', logout);
  }

  const nextPendingStep = getNextPendingStep();
  const primaryActionLabel =
    nextPendingStep === 'location-services'
      ? t('setup.openLocationSettings')
      : nextPendingStep === 'location-permissions'
        ? t('setup.grantLocationPermissions')
        : nextPendingStep === 'notifications'
          ? t('setup.grantNotificationPermission')
          : nextPendingStep === 'battery'
            ? t('setup.disableBatteryOptimization')
            : nextPendingStep === 'manufacturer'
              ? manufacturerSettingsVisited
                ? t('setup.confirmManufacturer')
                : t('setup.openBackgroundSettings')
              : t('setup.requestAll');

  if (isLoading || !status) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={appColors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Math.max(insets.top + 20, 28),
          paddingBottom: Math.max(insets.bottom + 24, 28),
        },
      ]}
      style={styles.container}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{t('setup.eyebrow')}</Text>
        <Text style={styles.title}>{t('setup.title')}</Text>
        <Text style={styles.subtitle}>{t('setup.subtitle')}</Text>
      </View>

      <View style={styles.summary}>
        <MaterialIcons
          color={
            status.isComplete ? appColors.light.primary : appColors.light.accent
          }
          name={status.isComplete ? 'verified' : 'warning-amber'}
          size={26}
        />
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>
            {status.isComplete
              ? t('setup.allDone')
              : t('setup.pendingSummary')}
          </Text>
          <Text style={styles.summaryDescription}>
            {status.isComplete
              ? t('setup.completeDescription')
              : t('setup.pendingDescription')}
          </Text>
        </View>
      </View>

      {!status.isComplete ? (
        <Pressable
          style={[styles.primaryButton, busyAction && styles.buttonDisabled]}
          disabled={busyAction !== null}
          onPress={handleAllRequirements}
        >
          {busyAction === 'all' ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {primaryActionLabel}
            </Text>
          )}
        </Pressable>
      ) : null}

      <SetupCard
        actionLabel={t('setup.openLocationSettings')}
        busy={busyAction === 'location-services'}
        description={t('setup.locationServicesDescription')}
        done={status.locationServicesEnabled}
        onPress={() =>
          void runAction('location-services', async () => {
            await openLocationSettings();
          })
        }
        title={t('setup.locationServicesTitle')}
      />

      <SetupCard
        actionLabel={t('setup.grantLocationPermissions')}
        busy={busyAction === 'location-permissions'}
        description={t('setup.locationPermissionsDescription')}
        done={
          status.foregroundLocationGranted && status.backgroundLocationGranted
        }
          onPress={() =>
            void runAction('location-permissions', requestLocationPermissions)
          }
          title={t('setup.locationPermissionsTitle')}
      />

      <SetupCard
        actionLabel={t('setup.grantNotificationPermission')}
        busy={busyAction === 'notifications'}
        description={t('setup.notificationDescription')}
        done={status.notificationsGranted}
          onPress={() =>
            void runAction('notifications', requestNotifications)
          }
          title={t('setup.notificationTitle')}
      />

      {status.batteryOptimizationSupported ? (
        <SetupCard
          actionLabel={t('setup.disableBatteryOptimization')}
          busy={busyAction === 'battery'}
          description={t('setup.batteryOptimizationDescription')}
          done={status.batteryOptimizationIgnored}
          onPress={() =>
            void runAction('battery', async () => {
              await requestBatteryOptimizationExemption();
            })
          }
          title={t('setup.batteryOptimizationTitle')}
        />
      ) : null}

      {status.manufacturerGuide.requiresManualConfirmation ? (
        <SetupCard
          actionLabel={t('setup.openBackgroundSettings')}
          busy={busyAction === 'manufacturer'}
          description={t('setup.manufacturerDescription')}
          done={status.manufacturerBackgroundConfirmed}
          onPress={() =>
            void runAction('manufacturer', async () => {
              await openManufacturerBackgroundSettings();
            })
          }
          title={t('setup.manufacturerTitle')}
        >
          <View style={styles.guideBox}>
            <Text style={styles.guideTitle}>
              {status.manufacturerGuide.title}
            </Text>
            {manufacturerSteps.map((step) => (
              <Text key={step.id} style={styles.guideStep}>
                {`\u2022 ${step.label}`}
              </Text>
            ))}
          </View>

          {!status.manufacturerBackgroundConfirmed ? (
            <Pressable
              style={[
                styles.confirmButton,
                busyAction && styles.buttonDisabled,
              ]}
              disabled={busyAction !== null}
              onPress={() => void handleManufacturerConfirmation()}
            >
              {busyAction === 'manufacturer-confirm' ? (
                <ActivityIndicator color={appColors.light.primary} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {t('setup.confirmManufacturer')}
                </Text>
              )}
            </Pressable>
          ) : null}
        </SetupCard>
      ) : null}

      <Pressable
        style={[styles.logoutButton, busyAction && styles.buttonDisabled]}
        disabled={busyAction !== null}
        onPress={() => void handleLogout()}
      >
        {busyAction === 'logout' ? (
          <ActivityIndicator color={appColors.light.accent} />
        ) : (
          <Text style={styles.logoutButtonText}>{t('auth.signOut')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.light.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.light.background,
  },
  hero: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: appColors.light.primary,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: appColors.light.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: appColors.light.muted,
    textAlign: 'right',
  },
  summary: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: appColors.light.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.light.border,
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.light.text,
    textAlign: 'right',
  },
  summaryDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: appColors.light.muted,
    textAlign: 'right',
  },
  card: {
    backgroundColor: appColors.light.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.light.border,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'flex-start',
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeDone: {
    backgroundColor: '#dff6e9',
  },
  statusBadgePending: {
    backgroundColor: '#fff0db',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appColors.light.text,
    textAlign: 'right',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: appColors.light.muted,
    textAlign: 'right',
  },
  primaryButton: {
    backgroundColor: appColors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: appColors.light.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: appColors.light.primary,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: appColors.light.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f4c7b3',
    backgroundColor: '#fff6f1',
  },
  logoutButtonText: {
    color: appColors.light.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  guideBox: {
    gap: 8,
    backgroundColor: '#f7f3ed',
    borderRadius: 14,
    padding: 14,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.light.text,
    textAlign: 'right',
  },
  guideStep: {
    fontSize: 12,
    lineHeight: 19,
    color: appColors.light.muted,
    textAlign: 'right',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
