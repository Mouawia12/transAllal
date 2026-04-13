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
    this.socket = io(resolveTrackingUrl(WS_URL), {
      auth: { token },
      transports: ["websocket"],
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

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const realtimeClient = new RealtimeClient();
