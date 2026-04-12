import { Platform } from 'react-native';

export async function getConnectivitySnapshot() {
  const isWeb = Platform.OS === 'web';
  const online =
    isWeb && typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    online,
    source: isWeb ? 'browser' : 'native-placeholder',
  } as const;
}
