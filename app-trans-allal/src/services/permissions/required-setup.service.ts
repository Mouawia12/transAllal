import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { NativeModules, Platform } from 'react-native';
import { getLocationPermissionStatus } from './location-permissions.service';

const MANUFACTURER_CONFIRMATION_KEY_PREFIX =
  'trans-allal:background-manufacturer-confirmed:';

type NativeDeviceInfo = {
  manufacturer?: string;
  brand?: string;
  model?: string;
};

type NativeAppSetupModule = {
  getDeviceInfo(): Promise<NativeDeviceInfo>;
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): Promise<boolean>;
  openAppSettings(): Promise<boolean>;
  openLocationSettings(): Promise<boolean>;
  openNotificationSettings(): Promise<boolean>;
  openManufacturerBackgroundSettings(): Promise<boolean>;
};

type ManufacturerGuide = {
  manufacturer: string;
  requiresManualConfirmation: boolean;
  title: string;
  steps: string[];
};

export type RequiredSetupStatus = {
  locationServicesEnabled: boolean;
  foregroundLocationGranted: boolean;
  backgroundLocationGranted: boolean;
  notificationsGranted: boolean;
  batteryOptimizationIgnored: boolean;
  batteryOptimizationSupported: boolean;
  manufacturerGuide: ManufacturerGuide;
  manufacturerBackgroundConfirmed: boolean;
  isComplete: boolean;
};

const appSetupNativeModule =
  NativeModules.AppSetup as NativeAppSetupModule | undefined;

function getFallbackManufacturerGuide(): ManufacturerGuide {
  return {
    manufacturer: '',
    requiresManualConfirmation: false,
    title: '',
    steps: [],
  };
}

function getManufacturerGuide(manufacturerRaw: string): ManufacturerGuide {
  const manufacturer = manufacturerRaw.trim().toLowerCase();

  if (!manufacturer) {
    return getFallbackManufacturerGuide();
  }

  if (manufacturer.includes('realme') || manufacturer.includes('oppo')) {
    return {
      manufacturer,
      requiresManualConfirmation: true,
      title: 'ColorOS background access',
      steps: [
        'Set battery usage to unrestricted if this option appears.',
        'Allow background activity if the phone shows this switch.',
        'Enable auto-start if your phone exposes it for this app.',
      ],
    };
  }

  if (manufacturer.includes('xiaomi')) {
    return {
      manufacturer,
      requiresManualConfirmation: true,
      title: 'MIUI background access',
      steps: [
        'Set battery saver to no restrictions for this app.',
        'Enable auto-start if the phone shows this option.',
        'Allow background pop-up or start in background if available.',
      ],
    };
  }

  if (manufacturer.includes('vivo')) {
    return {
      manufacturer,
      requiresManualConfirmation: true,
      title: 'Funtouch background access',
      steps: [
        'Allow background activity if the phone shows this switch.',
        'Whitelist the app from power saving if possible.',
        'Enable auto-start if your phone exposes it.',
      ],
    };
  }

  if (manufacturer.includes('huawei') || manufacturer.includes('honor')) {
    return {
      manufacturer,
      requiresManualConfirmation: true,
      title: 'Huawei background protection',
      steps: [
        'Turn off automatic battery management for this app if shown.',
        'Allow the app to run in background and launch automatically.',
        'Keep location and notifications enabled for the app.',
      ],
    };
  }

  if (manufacturer.includes('oneplus')) {
    return {
      manufacturer,
      requiresManualConfirmation: true,
      title: 'OnePlus background access',
      steps: [
        'Set battery optimization to don’t optimize if shown.',
        'Allow auto-launch or background launch if your phone exposes it.',
        'Keep background activity enabled for this app.',
      ],
    };
  }

  return getFallbackManufacturerGuide();
}

async function getDeviceInfo(): Promise<NativeDeviceInfo> {
  if (Platform.OS !== 'android' || !appSetupNativeModule) {
    return {};
  }

  try {
    return await appSetupNativeModule.getDeviceInfo();
  } catch {
    return {};
  }
}

function getManufacturerConfirmationKey(manufacturer: string) {
  return `${MANUFACTURER_CONFIRMATION_KEY_PREFIX}${manufacturer || 'generic'}`;
}

async function isManufacturerBackgroundConfirmed(
  guide: ManufacturerGuide,
): Promise<boolean> {
  if (!guide.requiresManualConfirmation) {
    return true;
  }

  const value = await AsyncStorage.getItem(
    getManufacturerConfirmationKey(guide.manufacturer),
  );
  return value === '1';
}

async function readNotificationPermissionGranted(): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted === true;
}

export async function getRequiredSetupStatus(): Promise<RequiredSetupStatus> {
  const [locationServicesEnabled, locationPermission, notificationsGranted, deviceInfo] =
    await Promise.all([
      Location.hasServicesEnabledAsync(),
      getLocationPermissionStatus(),
      readNotificationPermissionGranted(),
      getDeviceInfo(),
    ]);

  const manufacturerGuide =
    Platform.OS === 'android'
      ? getManufacturerGuide(deviceInfo.manufacturer ?? deviceInfo.brand ?? '')
      : getFallbackManufacturerGuide();

  const manufacturerBackgroundConfirmed =
    await isManufacturerBackgroundConfirmed(manufacturerGuide);

  const batteryOptimizationSupported =
    Platform.OS === 'android' && Boolean(appSetupNativeModule);

  const batteryOptimizationIgnored = batteryOptimizationSupported
    ? await appSetupNativeModule!.isIgnoringBatteryOptimizations()
    : true;

  const foregroundLocationGranted = locationPermission.foreground === 'granted';
  const backgroundLocationGranted = locationPermission.background === 'granted';

  const isComplete =
    locationServicesEnabled &&
    foregroundLocationGranted &&
    backgroundLocationGranted &&
    notificationsGranted &&
    batteryOptimizationIgnored &&
    manufacturerBackgroundConfirmed;

  return {
    locationServicesEnabled,
    foregroundLocationGranted,
    backgroundLocationGranted,
    notificationsGranted,
    batteryOptimizationIgnored,
    batteryOptimizationSupported,
    manufacturerGuide,
    manufacturerBackgroundConfirmed,
    isComplete,
  };
}

export async function requestBatteryOptimizationExemption(): Promise<boolean> {
  if (Platform.OS !== 'android' || !appSetupNativeModule) {
    return true;
  }

  return appSetupNativeModule.requestIgnoreBatteryOptimizations();
}

export async function openAppSettings(): Promise<boolean> {
  if (Platform.OS === 'android' && appSetupNativeModule) {
    return appSetupNativeModule.openAppSettings();
  }

  return false;
}

export async function openLocationSettings(): Promise<boolean> {
  if (Platform.OS === 'android' && appSetupNativeModule) {
    return appSetupNativeModule.openLocationSettings();
  }

  return false;
}

export async function openNotificationSettings(): Promise<boolean> {
  if (Platform.OS === 'android' && appSetupNativeModule) {
    return appSetupNativeModule.openNotificationSettings();
  }

  return false;
}

export async function openManufacturerBackgroundSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !appSetupNativeModule) {
    return false;
  }

  return appSetupNativeModule.openManufacturerBackgroundSettings();
}

export async function confirmManufacturerBackgroundSetup(
  manufacturer: string,
): Promise<void> {
  if (!manufacturer) {
    return;
  }

  await AsyncStorage.setItem(getManufacturerConfirmationKey(manufacturer), '1');
}

export async function resetManufacturerBackgroundSetup(
  manufacturer: string,
): Promise<void> {
  if (!manufacturer) {
    return;
  }

  await AsyncStorage.removeItem(getManufacturerConfirmationKey(manufacturer));
}
