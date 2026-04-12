import { registerAs } from '@nestjs/config';

export default registerAs('websocket', () => ({
  port: Number(process.env.WS_PORT ?? 3002),
  namespace: '/tracking',
}));
