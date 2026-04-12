export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  DRIVER_LOGIN: '/auth/driver/login',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',

  // Companies
  COMPANIES: '/companies',
  COMPANY: (id: string) => `/companies/${id}`,

  // Drivers
  DRIVERS: '/drivers',
  DRIVER: (id: string) => `/drivers/${id}`,

  // Trucks
  TRUCKS: '/trucks',
  TRUCK: (id: string) => `/trucks/${id}`,

  // Trips
  TRIPS: '/trips',
  TRIP: (id: string) => `/trips/${id}`,
  TRIP_TRACK: (id: string) => `/trips/${id}/track`,

  // Tracking
  TRACKING_SESSION_START: '/tracking/session/start',
  TRACKING_SESSION_STOP: '/tracking/session/stop',
  TRACKING_LOCATION: '/tracking/location',
  TRACKING_LIVE: '/tracking/live',
  TRACKING_FLEET: '/tracking/fleet',
  TRACKING_DRIVER_HISTORY: (driverId: string) => `/tracking/driver/${driverId}`,

  // Alerts
  ALERTS: '/alerts',
  ALERT_READ: (id: string) => `/alerts/${id}/read`,
  ALERTS_READ_ALL: '/alerts/read-all',

  // Reports
  REPORTS_SUMMARY: '/reports/summary',
  REPORTS_TRIPS: '/reports/trips',
  REPORTS_DRIVERS: '/reports/drivers',
  REPORTS_ALERTS: '/reports/alerts',
} as const;
