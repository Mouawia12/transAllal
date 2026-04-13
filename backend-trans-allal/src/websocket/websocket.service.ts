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
      });
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
