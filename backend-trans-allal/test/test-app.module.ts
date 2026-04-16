/**
 * Minimal NestJS module used in e2e tests. Includes only the modules that
 * do NOT require a live database connection, so tests run fully in-process
 * without mutating any schema.
 *
 * Add more feature modules here only if they are genuinely database-free.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from '../src/config/app/app.config';
import authConfig from '../src/config/auth/auth.config';
import websocketConfig from '../src/config/websocket/websocket.config';
import { validateEnvironment } from '../src/config/env.validation';
import { HealthModule } from '../src/modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [appConfig, authConfig, websocketConfig],
      validate: validateEnvironment,
    }),
    HealthModule,
  ],
})
export class TestAppModule {}
