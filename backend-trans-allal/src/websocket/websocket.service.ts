import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsEvents } from './websocket.events';

@Injectable()
export class WebsocketService {
  constructor(private readonly configService: ConfigService) {}

  getReadiness() {
    return {
      port: this.configService.get<number>('websocket.port') ?? 3002,
      namespace:
        this.configService.get<string>('websocket.namespace') ?? '/tracking',
      supportedEvents: Object.values(WsEvents),
      status: 'placeholder',
    };
  }
}
