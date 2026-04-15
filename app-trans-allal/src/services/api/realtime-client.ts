import { io, Socket } from 'socket.io-client';
import { apiConfig } from './config';

const WsEvents = {
  DRIVER_LOCATION_PUBLISH: 'driver.location.publish',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  ALERT_RAISED: 'alert.raised',
  TRIP_STATUS_CHANGED: 'trip.status.changed',
  DRIVER_ONLINE_CHANGED: 'driver.online.changed',
  COMPANY_SUBSCRIBE: 'company.subscribe',
  DRIVER_SUBSCRIBE: 'driver.subscribe',
} as const;

let socket: Socket | null = null;
// Remembers the last driver subscribed so we can re-subscribe after reconnect
let trackedDriverId: string | null = null;

export const realtimeClient = {
  connect(token: string): void {
    if (socket?.connected) return;

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    socket = io(`${apiConfig.websocketUrl}/tracking`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      timeout: 20_000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected');
      // Re-subscribe to driver room after every (re)connect
      if (trackedDriverId) {
        socket?.emit(WsEvents.DRIVER_SUBSCRIBE, { driverId: trackedDriverId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });
  },

  subscribeToDriver(driverId: string): void {
    trackedDriverId = driverId;
    if (socket?.connected) {
      socket.emit(WsEvents.DRIVER_SUBSCRIBE, { driverId });
    }
  },

  publishLocation(payload: {
    lat: number;
    lng: number;
    speedKmh?: number;
    heading?: number;
    accuracyM?: number;
    tripId?: string;
  }): void {
    socket?.emit(WsEvents.DRIVER_LOCATION_PUBLISH, payload);
  },

  onTripStatusChanged(cb: (data: { tripId: string; status: string }) => void): () => void {
    socket?.on(WsEvents.TRIP_STATUS_CHANGED, cb);
    return () => { socket?.off(WsEvents.TRIP_STATUS_CHANGED, cb); };
  },

  onAlert(cb: (data: unknown) => void): () => void {
    socket?.on(WsEvents.ALERT_RAISED, cb);
    return () => { socket?.off(WsEvents.ALERT_RAISED, cb); };
  },

  disconnect(): void {
    trackedDriverId = null;
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
  },

  isConnected(): boolean {
    return socket?.connected ?? false;
  },
};
