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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void;

interface PendingListener {
  event: string;
  cb: AnyFn;
}

/**
 * Singleton Socket.IO client shared across the dashboard.
 *
 * Why pending listeners?
 * ──────────────────────
 * In React, child component useEffect hooks run BEFORE parent useEffect hooks
 * (effects fire bottom-up in the component tree). DashboardShell registers its
 * event listeners (onOnlineChanged, onTripStatusChanged, …) in a useEffect that
 * executes before the Providers useEffect that calls connect(). At registration
 * time this.socket is still null, so socket?.on(…) would be silently dropped.
 *
 * The pending-listener queue captures registrations made before the socket
 * exists and applies them the moment connect() creates the socket, so no event
 * is ever lost due to component mount ordering.
 */
class RealtimeClient {
  private socket: Socket | null = null;
  private activeCompanyId: string | null = null;
  private activeDriverIds: Set<string> = new Set();
  private pendingListeners: PendingListener[] = [];

  connect(token: string): void {
    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(resolveTrackingUrl(WS_URL), {
      auth: { token },
      // Production currently serves Socket.IO polling successfully but the
      // reverse proxy still breaks WebSocket upgrades. Force polling so live
      // dashboard notifications remain reliable until the proxy is fixed.
      transports: ["polling"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      timeout: 20_000,
    });

    // Flush any listeners that were registered before the socket existed
    // (e.g. from DashboardShell whose useEffect runs before Providers').
    for (const { event, cb } of this.pendingListeners) {
      this.socket.on(event, cb);
    }
    this.pendingListeners = [];

    // Re-subscribe to all active rooms after each (re)connect so subscriptions
    // survive network interruptions.
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
    // If not yet connected, activeCompanyId is saved and will be emitted
    // once the socket connects (see the "connect" handler above).
    this.socket?.emit("company.subscribe", { companyId });
  }

  subscribeToDriver(driverId: string): void {
    this.activeDriverIds.add(driverId);
    this.socket?.emit("driver.subscribe", { driverId });
  }

  // ── event listeners ──────────────────────────────────────────────────────
  // Each on* method adds to the pending queue when the socket is not yet
  // created; each off* method removes from both the socket and the queue.

  onDriverLocation(cb: (data: LocationUpdate) => void): void {
    if (this.socket) {
      this.socket.on("driver.location.updated", cb);
    } else {
      this.pendingListeners.push({ event: "driver.location.updated", cb });
    }
  }

  offDriverLocation(cb?: (data: LocationUpdate) => void): void {
    this.socket?.off("driver.location.updated", cb);
    this.removePending("driver.location.updated", cb);
  }

  onAlert(cb: (data: AlertEvent) => void): void {
    if (this.socket) {
      this.socket.on("alert.raised", cb);
    } else {
      this.pendingListeners.push({ event: "alert.raised", cb });
    }
  }

  offAlert(cb?: (data: AlertEvent) => void): void {
    this.socket?.off("alert.raised", cb);
    this.removePending("alert.raised", cb);
  }

  onOnlineChanged(cb: (data: OnlineChangedEvent) => void): void {
    if (this.socket) {
      this.socket.on("driver.online.changed", cb);
    } else {
      this.pendingListeners.push({ event: "driver.online.changed", cb });
    }
  }

  offOnlineChanged(cb?: (data: OnlineChangedEvent) => void): void {
    this.socket?.off("driver.online.changed", cb);
    this.removePending("driver.online.changed", cb);
  }

  onTripStatusChanged(cb: (data: TripStatusChangedEvent) => void): void {
    if (this.socket) {
      this.socket.on("trip.status.changed", cb);
    } else {
      this.pendingListeners.push({ event: "trip.status.changed", cb });
    }
  }

  offTripStatusChanged(cb?: (data: TripStatusChangedEvent) => void): void {
    this.socket?.off("trip.status.changed", cb);
    this.removePending("trip.status.changed", cb);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  disconnect(): void {
    this.activeCompanyId = null;
    this.activeDriverIds.clear();
    this.pendingListeners = [];
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  // ── internal ─────────────────────────────────────────────────────────────

  private removePending(event: string, cb?: AnyFn): void {
    if (cb) {
      this.pendingListeners = this.pendingListeners.filter(
        (l) => !(l.event === event && l.cb === cb),
      );
    } else {
      this.pendingListeners = this.pendingListeners.filter(
        (l) => l.event !== event,
      );
    }
  }
}

export const realtimeClient = new RealtimeClient();
