export const WsEvents = {
  // Client → Server
  DRIVER_LOCATION_PUBLISH: 'driver.location.publish',
  COMPANY_SUBSCRIBE: 'company.subscribe',
  DRIVER_SUBSCRIBE: 'driver.subscribe',
  // Server → Client
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  ALERT_RAISED: 'alert.raised',
  TRIP_STATUS_CHANGED: 'trip.status.changed',
  DRIVER_ONLINE_CHANGED: 'driver.online.changed',
  DRIVER_SESSION_STOPPED: 'driver.session.stopped',
} as const;
