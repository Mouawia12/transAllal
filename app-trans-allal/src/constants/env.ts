export const mobileRuntimeConfig = {
  appName: process.env.EXPO_PUBLIC_APP_NAME ?? 'Trans Allal Driver',
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    'https://apitransallal.souftech.com/api/v1',
  wsUrl:
    process.env.EXPO_PUBLIC_WS_URL ?? 'wss://apitransallal.souftech.com',
  mapProvider: process.env.EXPO_PUBLIC_MAP_PROVIDER ?? 'mapbox',
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  env: process.env.EXPO_PUBLIC_ENV ?? 'production',
  authStorageKey:
    process.env.EXPO_PUBLIC_AUTH_STORAGE_KEY ?? 'trans-allal-driver-token',
};
