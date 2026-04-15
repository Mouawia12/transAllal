import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'socket.io';
import { WsEvents } from './websocket.events';

@Injectable()
export class WebsocketService {
  private server: Server | null = null;

  constructor(private readonly configService: ConfigService) {}

  registerServer(server: Server): void {
    this.server = server;
  }

  emitAlert(alert: {
    id: string;
    type: string;
    severity: string;
    message: string | null;
    companyId: string;
    driverId: string | null;
    tripId: string | null;
  }): void {
    if (!this.server) {
      return;
    }

    this.server.to(`company:${alert.companyId}`).emit(WsEvents.ALERT_RAISED, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      driverId: alert.driverId,
      tripId: alert.tripId,
    });
  }

  emitOnlineChanged(
    driverId: string,
    companyId: string,
    isOnline: boolean,
    lastSeenAt: Date | null,
    sessionStartedAt: Date | null,
  ): void {
    if (!this.server) {
      return;
    }

    this.server
      .to(`company:${companyId}`)
      .emit(WsEvents.DRIVER_ONLINE_CHANGED, {
        driverId,
        isOnline,
        lastSeenAt,
        sessionStartedAt,
      });
  }

  emitDriverLocation(location: {
    companyId: string;
    driverId: string;
    tripId: string | null;
    lat: number;
    lng: number;
    speedKmh: number | null;
    heading: number | null;
    accuracyM: number | null;
    batteryLevel: number | null;
    recordedAt: Date;
  }): void {
    if (!this.server) {
      return;
    }

    const payload = {
      driverId: location.driverId,
      tripId: location.tripId,
      lat: location.lat,
      lng: location.lng,
      speedKmh: location.speedKmh,
      heading: location.heading,
      accuracyM: location.accuracyM,
      batteryLevel: location.batteryLevel,
      recordedAt: location.recordedAt,
    };

    this.server
      .to(`company:${location.companyId}`)
      .emit(WsEvents.DRIVER_LOCATION_UPDATED, payload);
    this.server
      .to(`driver:${location.driverId}`)
      .emit(WsEvents.DRIVER_LOCATION_UPDATED, payload);
  }

  getReadiness() {
    return {
      port: this.configService.get<number>('websocket.port') ?? 3002,
      namespace:
        this.configService.get<string>('websocket.namespace') ?? '/tracking',
      supportedEvents: Object.values(WsEvents),
      status: this.server ? 'ready' : 'initializing',
    };
  }
}
