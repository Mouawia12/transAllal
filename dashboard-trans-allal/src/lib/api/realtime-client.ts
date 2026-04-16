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

export type TripStatusChangedEvent = {
  driverId: string;
  tripId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  origin: string;
  destination: string;
  driverName: string | null;
  occurredAt: string;
};

class RealtimeClient {
  private socket: Socket | null = null;
  private activeCompanyId: string | null = null;
  private activeDriverIds: Set<string> = new Set();

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

    // Re-subscribe to all active rooms after each reconnect so subscriptions
    // are not lost on network interruptions.
    this.socket.on("connect", () => {
      if (this.activeCompanyId) {
        this.socket?.emit("company.subscribe", {
          companyId: this.activeCompanyId,
        });
      }
      for (const driverId of this.activeDriverIds) {
        this.socket?.emit("driver.subscribe", { driverId });
      }
    });
  }

  subscribeToCompany(companyId: string): void {
    this.activeCompanyId = companyId;
    this.socket?.emit("company.subscribe", { companyId });
  }

  subscribeToDriver(driverId: string): void {
    this.activeDriverIds.add(driverId);
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

  onTripStatusChanged(cb: (data: TripStatusChangedEvent) => void): void {
    this.socket?.on("trip.status.changed", cb);
  }

  offTripStatusChanged(cb?: (data: TripStatusChangedEvent) => void): void {
    this.socket?.off("trip.status.changed", cb);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  disconnect(): void {
    this.activeCompanyId = null;
    this.activeDriverIds.clear();
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const realtimeClient = new RealtimeClient();
