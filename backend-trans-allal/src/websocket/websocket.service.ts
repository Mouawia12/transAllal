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

  emitTripAssigned(
    driverId: string,
    companyId: string,
    trip: {
      tripId: string;
      origin: string;
      destination: string;
      driverName: string | null;
    },
  ): void {
    this.emitTripStatusChanged({
      driverId,
      companyId,
      tripId: trip.tripId,
      status: 'PENDING',
      origin: trip.origin,
      destination: trip.destination,
      driverName: trip.driverName,
      occurredAt: new Date(),
    });
  }

  emitTripStatusChanged(payload: {
    driverId: string;
    companyId: string;
    tripId: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    origin: string;
    destination: string;
    driverName: string | null;
    occurredAt: Date;
  }): void {
    if (!this.server) {
      return;
    }

    const event = {
      driverId: payload.driverId,
      tripId: payload.tripId,
      status: payload.status,
      origin: payload.origin,
      destination: payload.destination,
      driverName: payload.driverName,
      occurredAt: payload.occurredAt,
    };

    this.server.to(`driver:${payload.driverId}`).emit(
      WsEvents.TRIP_STATUS_CHANGED,
      event,
    );
    this.server.to(`company:${payload.companyId}`).emit(
      WsEvents.TRIP_STATUS_CHANGED,
      event,
    );
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
