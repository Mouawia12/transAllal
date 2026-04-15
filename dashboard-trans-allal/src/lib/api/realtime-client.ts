import { io, type Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3000";
const TRACKING_NAMESPACE = "/tracking";

function resolveTrackingUrl(baseUrl: string): string {
  return baseUrl.endsWith(TRACKING_NAMESPACE)
    ? baseUrl
    : `${baseUrl}${TRACKING_NAMESPACE}`;
}

type LocationUpdate = {
  driverId: string;
  tripId: string | null;
  lat: number;
  lng: number;
  speedKmh: number | null;
  heading: number | null;
  batteryLevel: number | null;
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

export type OnlineChangedEvent = {
  driverId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  sessionStartedAt: string | null;
};

class RealtimeClient {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(resolveTrackingUrl(WS_URL), {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      timeout: 20_000,
    });
  }

  subscribeToCompany(companyId: string): void {
    this.socket?.emit("company.subscribe", { companyId });
  }

  subscribeToDriver(driverId: string): void {
    this.socket?.emit("driver.subscribe", { driverId });
  }

  onDriverLocation(cb: (data: LocationUpdate) => void): void {
    this.socket?.on("driver.location.updated", cb);
  }

  offDriverLocation(cb?: (data: LocationUpdate) => void): void {
    this.socket?.off("driver.location.updated", cb);
  }

  onAlert(cb: (data: AlertEvent) => void): void {
    this.socket?.on("alert.raised", cb);
  }

  offAlert(cb?: (data: AlertEvent) => void): void {
    this.socket?.off("alert.raised", cb);
  }

  onOnlineChanged(cb: (data: OnlineChangedEvent) => void): void {
    this.socket?.on("driver.online.changed", cb);
  }

  offOnlineChanged(cb?: (data: OnlineChangedEvent) => void): void {
    this.socket?.off("driver.online.changed", cb);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const realtimeClient = new RealtimeClient();
