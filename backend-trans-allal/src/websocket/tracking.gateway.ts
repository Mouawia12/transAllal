import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Role } from '../common/enums/role.enum';
import { TrackingService } from '../modules/telemetry/tracking/tracking.service';
import { WebsocketService } from './websocket.service';
import { WsEvents } from './websocket.events';

interface JwtPayload {
  sub: string;
  role: Role;
  companyId: string | null;
  driverId: string | null;
}

@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly trackingService: TrackingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly websocketService: WebsocketService,
  ) {}

  afterInit(server: Server): void {
    this.websocketService.registerServer(server);
  }

  handleConnection(client: Socket): void {
    try {
      const token = (client.handshake.auth['token'] ??
        client.handshake.query['token']) as string;
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
    @MessageBody()
    payload: {
      lat: number;
      lng: number;
      speedKmh?: number;
      heading?: number;
      accuracyM?: number;
      tripId?: string;
    },
  ): Promise<void> {
    const user = (client as Socket & { user: JwtPayload }).user;
    if (!user?.driverId) return;

    await this.trackingService.saveLocation(
      user.driverId,
      user.companyId!,
      payload,
    );
  }

  @SubscribeMessage(WsEvents.COMPANY_SUBSCRIBE)
  handleCompanySubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { companyId: string },
  ): void {
    const user = (client as Socket & { user: JwtPayload }).user;

    if (user.role === Role.SUPER_ADMIN) {
      if (!payload.companyId) {
        throw new WsException('companyId is required');
      }

      void client.join(`company:${payload.companyId}`);
      return;
    }

    if (!user.companyId) {
      throw new WsException('Company scope is required');
    }

    if (payload.companyId && payload.companyId !== user.companyId) {
      throw new WsException('Not authorized for this company');
    }

    void client.join(`company:${user.companyId}`);
  }

  @SubscribeMessage(WsEvents.DRIVER_SUBSCRIBE)
  async handleDriverSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { driverId: string },
  ): Promise<void> {
    const user = (client as Socket & { user: JwtPayload }).user;

    if (!payload.driverId) {
      throw new WsException('driverId is required');
    }

    if (user.role === Role.SUPER_ADMIN) {
      await client.join(`driver:${payload.driverId}`);
      return;
    }

    if (user.role === Role.DRIVER) {
      if (payload.driverId !== user.driverId) {
        throw new WsException('Not authorized for this driver');
      }

      await client.join(`driver:${payload.driverId}`);
      return;
    }

    if (!user.companyId) {
      throw new WsException('Company scope is required');
    }

    const isAllowed = await this.trackingService.belongsToCompany(
      payload.driverId,
      user.companyId,
    );
    if (!isAllowed) {
      throw new WsException('Not authorized for this driver');
    }

    void client.join(`driver:${payload.driverId}`);
  }
}
