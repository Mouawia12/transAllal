import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TrackingService } from '../modules/telemetry/tracking/tracking.service';
import { WsEvents } from './websocket.events';

interface JwtPayload {
  sub: string;
  role: string;
  companyId: string | null;
  driverId: string | null;
}

@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private server: Server;
  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly trackingService: TrackingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token = (client.handshake.auth['token'] ?? client.handshake.query['token']) as string;
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('auth.jwtSecret'),
      });
      (client as Socket & { user: JwtPayload }).user = payload;
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated connection: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WsEvents.DRIVER_LOCATION_PUBLISH)
  async handleLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lat: number; lng: number; speedKmh?: number; heading?: number; accuracyM?: number; tripId?: string },
  ): Promise<void> {
    const user = (client as Socket & { user: JwtPayload }).user;
    if (!user?.driverId) return;

    const location = await this.trackingService.saveLocation(user.driverId, user.companyId!, payload);
    this.server.to(`company:${user.companyId}`).emit(WsEvents.DRIVER_LOCATION_UPDATED, {
      driverId: user.driverId,
      tripId: payload.tripId ?? null,
      lat: location.lat,
      lng: location.lng,
      speedKmh: location.speedKmh,
      heading: location.heading,
      accuracyM: location.accuracyM,
      recordedAt: location.recordedAt,
    });
    this.server.to(`driver:${user.driverId}`).emit(WsEvents.DRIVER_LOCATION_UPDATED, {
      driverId: user.driverId,
      tripId: payload.tripId ?? null,
      lat: location.lat,
      lng: location.lng,
      speedKmh: location.speedKmh,
      heading: location.heading,
      accuracyM: location.accuracyM,
      recordedAt: location.recordedAt,
    });
  }

  @SubscribeMessage(WsEvents.COMPANY_SUBSCRIBE)
  handleCompanySubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: { companyId: string }): void {
    void client.join(`company:${payload.companyId}`);
  }

  @SubscribeMessage(WsEvents.DRIVER_SUBSCRIBE)
  handleDriverSubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: { driverId: string }): void {
    void client.join(`driver:${payload.driverId}`);
  }

  emitAlert(alert: { id: string; type: string; severity: string; message: string | null; companyId: string; driverId: string | null; tripId: string | null }): void {
    this.server.to(`company:${alert.companyId}`).emit(WsEvents.ALERT_RAISED, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      driverId: alert.driverId,
      tripId: alert.tripId,
    });
  }

  emitOnlineChanged(driverId: string, companyId: string, isOnline: boolean, lastSeenAt: Date | null): void {
    this.server.to(`company:${companyId}`).emit(WsEvents.DRIVER_ONLINE_CHANGED, {
      driverId,
      isOnline,
      lastSeenAt,
    });
  }
}
