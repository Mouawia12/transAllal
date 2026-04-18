import { io, Socket } from 'socket.io-client';
import { apiConfig } from './config';

const WsEvents = {
  DRIVER_LOCATION_PUBLISH: 'driver.location.publish',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  ALERT_RAISED: 'alert.raised',
  TRIP_STATUS_CHANGED: 'trip.status.changed',
  DRIVER_ONLINE_CHANGED: 'driver.online.changed',
  DRIVER_SESSION_STOPPED: 'driver.session.stopped',
  COMPANY_SUBSCRIBE: 'company.subscribe',
  DRIVER_SUBSCRIBE: 'driver.subscribe',
} as const;

let socket: Socket | null = null;
let currentToken: string | null = null;
let trackedDriverId: string | null = null;
const tripStatusChangedListeners = new Set<
  (data: { tripId: string; status: string }) => void
>();
const alertListeners = new Set<(data: unknown) => void>();
const sessionStoppedListeners = new Set<
  (data: { driverId: string; reason: 'DASHBOARD' | 'SESSION_INACTIVE' }) => void
>();
const connectionListeners = new Set<(connected: boolean) => void>();

function notifyConnectionChange(connected: boolean) {
  for (const listener of connectionListeners) {
    listener(connected);
  }
}

export const realtimeClient = {
  connect(token: string): void {
    if (socket?.connected) return;

    // If socket exists but is disconnected/reconnecting, fully reset it so the
    // new connection uses the latest token and a fresh event-listener set.
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    currentToken = token;

    socket = io(`${apiConfig.websocketUrl}/tracking`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15_000,
      randomizationFactor: 0.5,
      // Fail the initial connection attempt faster; the built-in reconnect loop
      // will retry with back-off, so a short timeout just speeds up recovery.
      timeout: 10_000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected');
      notifyConnectionChange(true);
      if (trackedDriverId) {
        socket?.emit(WsEvents.DRIVER_SUBSCRIBE, { driverId: trackedDriverId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      notifyConnectionChange(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });

    socket.on(WsEvents.TRIP_STATUS_CHANGED, (data) => {
      for (const listener of tripStatusChangedListeners) {
        listener(data as { tripId: string; status: string });
      }
    });

    socket.on(WsEvents.ALERT_RAISED, (data) => {
      for (const listener of alertListeners) {
        listener(data);
      }
    });

    socket.on(WsEvents.DRIVER_SESSION_STOPPED, (data) => {
      for (const listener of sessionStoppedListeners) {
        listener(
          data as {
            driverId: string;
            reason: 'DASHBOARD' | 'SESSION_INACTIVE';
          },
        );
      }
    });
  },

  /**
   * Force-reconnect even if the socket thinks it is already connected.
   * Call this when the app returns to the foreground to recover from silent
   * disconnects (e.g. network switch, carrier-level NAT timeout).
   */
  forceReconnect(): void {
    if (!currentToken) return;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    this.connect(currentToken);
    if (trackedDriverId) {
      this.subscribeToDriver(trackedDriverId);
    }
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

  onTripStatusChanged(
    cb: (data: { tripId: string; status: string }) => void,
  ): () => void {
    tripStatusChangedListeners.add(cb);
    return () => {
      tripStatusChangedListeners.delete(cb);
    };
  },

  onAlert(cb: (data: unknown) => void): () => void {
    alertListeners.add(cb);
    return () => {
      alertListeners.delete(cb);
    };
  },

  onSessionStopped(
    cb: (data: { driverId: string; reason: 'DASHBOARD' | 'SESSION_INACTIVE' }) => void,
  ): () => void {
    sessionStoppedListeners.add(cb);
    return () => {
      sessionStoppedListeners.delete(cb);
    };
  },

  /** Subscribe to WebSocket connection state changes (true = connected). */
  onConnectionChange(cb: (connected: boolean) => void): () => void {
    connectionListeners.add(cb);
    return () => {
      connectionListeners.delete(cb);
    };
  },

  disconnect(): void {
    currentToken = null;
    trackedDriverId = null;
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
    notifyConnectionChange(false);
  },

  isConnected(): boolean {
    return socket?.connected ?? false;
  },
};
