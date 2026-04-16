/**
 * Factory that creates a NestJS application for e2e tests without any
 * database connection. Uses TestAppModule (database-free subset of AppModule)
 * and applies the same global middlewares as the production bootstrap so
 * HTTP behavior is identical.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_API_PREFIX } from '../src/common/constants/app.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from '../src/common/interceptors/success-response.interceptor';
import { parseCorsOrigins } from '../src/common/utils/cors.util';
import { TestAppModule } from './test-app.module';

export async function createTestApplication(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  const configService = app.get(ConfigService);

  const apiPrefix =
    configService.get<string>('app.apiPrefix') ?? DEFAULT_API_PREFIX;
  const corsOrigin = parseCorsOrigins(
    configService.get<string>('app.corsOrigin'),
  );

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  return app;
}
