export const apiEndpoints = {
  auth: {
    signIn: '/auth/sign-in',
    refresh: '/auth/refresh',
  },
  trips: '/trips',
  tracking: '/tracking',
  driverProfile: '/drivers/me',
} as const;
