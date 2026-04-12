export async function getLocationPermissionStatus() {
  return {
    foreground: 'not-requested',
    background: 'not-requested',
  } as const;
}
