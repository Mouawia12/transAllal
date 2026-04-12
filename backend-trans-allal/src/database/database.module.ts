import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BUSINESS_DATA_SOURCE, TELEMETRY_DATA_SOURCE } from './database.tokens';

@Global()
@Module({
  providers: [
    {
      provide: BUSINESS_DATA_SOURCE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        domain: 'admin-business',
        url: configService.get<string>('database.url'),
        schema: configService.get<string>('database.businessSchema'),
        status: 'placeholder',
      }),
    },
    {
      provide: TELEMETRY_DATA_SOURCE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        domain: 'tracking-telemetry',
        url: configService.get<string>('database.url'),
        schema: configService.get<string>('database.telemetrySchema'),
        status: 'placeholder',
      }),
    },
  ],
  exports: [BUSINESS_DATA_SOURCE, TELEMETRY_DATA_SOURCE],
})
export class DatabaseModule {}
