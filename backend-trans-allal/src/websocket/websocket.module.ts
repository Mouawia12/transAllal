import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AlertsModule } from '../modules/telemetry/alerts/alerts.module';
import { TrackingModule } from '../modules/telemetry/tracking/tracking.module';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [
    TrackingModule,
    AlertsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
      }),
    }),
  ],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class WebsocketModule {}
