import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app/app.config';
import authConfig from './config/auth/auth.config';
import cacheConfig from './config/cache/cache.config';
import databaseConfig from './config/database/database.config';
import { validateEnvironment } from './config/env.validation';
import websocketConfig from './config/websocket/websocket.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminBusinessModule } from './modules/admin-business/admin-business.module';
import { HealthModule } from './modules/health/health.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [
        appConfig,
        authConfig,
        cacheConfig,
        databaseConfig,
        websocketConfig,
      ],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    WebsocketModule,
    AuthModule,
    HealthModule,
    AdminBusinessModule,
    TelemetryModule,
  ],
})
export class AppModule {}
