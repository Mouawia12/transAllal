import { registerAs } from '@nestjs/config';
import { AppEnvironment } from '../../common/enums/app-environment.enum';

function withDevelopmentCorsOrigins(
  env: AppEnvironment,
  configuredOrigins?: string,
) {
  const baseOrigins = (configuredOrigins ?? 'http://localhost:3001,http://localhost:19006')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env !== AppEnvironment.Development) {
    return baseOrigins.join(',');
  }

  const devOrigins = [
    'http://localhost:3001',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:19006',
    'http://127.0.0.1:19006',
  ];

  return Array.from(new Set([...baseOrigins, ...devOrigins])).join(',');
}

export default registerAs('app', () => ({
  env: (process.env.APP_ENV ?? AppEnvironment.Development) as AppEnvironment,
  name: process.env.APP_NAME ?? 'Trans Allal API',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigin: withDevelopmentCorsOrigins(
    (process.env.APP_ENV ?? AppEnvironment.Development) as AppEnvironment,
    process.env.CORS_ORIGIN,
  ),
}));
