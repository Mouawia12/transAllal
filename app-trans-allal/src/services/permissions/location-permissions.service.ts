import * as Location from 'expo-location';
import { Platform } from 'react-native';

export async function getLocationPermissionStatus() {
  const foreground = await Location.getForegroundPermissionsAsync();

  if (Platform.OS === 'web') {
    return {
      foreground: foreground.status,
      background: foreground.status,
    } as const;
  }

  const background = await Location.getBackgroundPermissionsAsync();

  return {
    foreground: foreground.status,
    background: background.status,
  } as const;
}
