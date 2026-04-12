import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DEFAULT_API_PREFIX } from './common/constants/app.constants';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { parseCorsOrigins } from './common/utils/cors.util';

export async function createApplication(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const apiPrefix =
    configService.get<string>('app.apiPrefix') ?? DEFAULT_API_PREFIX;
  const corsOrigin = parseCorsOrigins(
    configService.get<string>('app.corsOrigin'),
  );

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const appName =
    configService.get<string>('app.name') ?? 'backend-trans-allal';
  const apiPrefix =
    configService.get<string>('app.apiPrefix') ?? DEFAULT_API_PREFIX;

  await app.listen(port);

  Logger.log(
    `${appName} is listening on http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
}
