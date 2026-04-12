import { registerAs } from '@nestjs/config';
import { AppEnvironment } from '../../common/enums/app-environment.enum';

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Trans Allal API',
  env: (process.env.APP_ENV ?? AppEnvironment.Development) as AppEnvironment,
  url: process.env.APP_URL ?? 'http://localhost:3000',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigin:
    process.env.CORS_ORIGIN ?? 'http://localhost:3001,http://localhost:19006',
}));
