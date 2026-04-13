import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TrackingModule } from '../modules/telemetry/tracking/tracking.module';
import { TrackingGateway } from './tracking.gateway';
import { WebsocketService } from './websocket.service';

@Global()
@Module({
  imports: [
    TrackingModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
      }),
    }),
  ],
  providers: [TrackingGateway, WebsocketService],
  exports: [TrackingGateway, WebsocketService],
})
export class WebsocketModule {}
