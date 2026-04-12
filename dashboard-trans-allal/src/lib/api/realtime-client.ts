import { io, type Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3002';

type LocationUpdate = {
  driverId: string;
  tripId: string | null;
  lat: number;
  lng: number;
  speedKmh: number | null;
  heading: number | null;
  recordedAt: string;
};

type AlertEvent = {
  alertId: string;
  type: string;
  severity: string;
  message: string | null;
  driverId: string | null;
  tripId: string | null;
};

type OnlineChangedEvent = {
  driverId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
};

class RealtimeClient {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;
    this.socket = io(`${WS_URL}/tracking`, {
      auth: { token },
      transports: ['websocket'],
    });
  }

  subscribeToCompany(companyId: string): void {
    this.socket?.emit('company.subscribe', { companyId });
  }

  subscribeToDriver(driverId: string): void {
    this.socket?.emit('driver.subscribe', { driverId });
  }

  onDriverLocation(cb: (data: LocationUpdate) => void): void {
    this.socket?.on('driver.location.updated', cb);
  }

  onAlert(cb: (data: AlertEvent) => void): void {
    this.socket?.on('alert.raised', cb);
  }

  onOnlineChanged(cb: (data: OnlineChangedEvent) => void): void {
    this.socket?.on('driver.online.changed', cb);
  }

  off(event: string, cb?: (...args: unknown[]) => void): void {
    this.socket?.off(event, cb);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const realtimeClient = new RealtimeClient();
