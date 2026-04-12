export const apiEndpoints = {
  health: "/health",
  auth: {
    signIn: "/auth/sign-in",
    refresh: "/auth/refresh",
  },
  companies: "/companies",
  drivers: "/drivers",
  trucks: "/trucks",
  trips: "/trips",
  tracking: "/tracking",
  alerts: "/alerts",
  reports: "/reports",
} as const;
