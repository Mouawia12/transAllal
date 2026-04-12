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

export const realtimeClient = {
  connect(token: string): void {
    if (socket?.connected) return;

    socket = io(`${apiConfig.websocketUrl}/tracking`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected');
    });
    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.error('[WS] Connection error:', err.message);
    });
  },

  subscribeToDriver(driverId: string): void {
    socket?.emit(WsEvents.DRIVER_SUBSCRIBE, { driverId });
  },

  publishLocation(payload: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
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
    socket?.disconnect();
    socket = null;
  },

  isConnected(): boolean {
    return socket?.connected ?? false;
  },
};
