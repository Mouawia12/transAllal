export const apiEndpoints = {
  auth: {
    signIn: '/auth/login',
    refresh: '/auth/refresh',
  },
  trips: '/trips',
  tracking: '/tracking',
  driverProfile: '/drivers/me',
} as const;
