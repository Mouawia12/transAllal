import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApplication } from '../src/bootstrap';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createApplication();
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    return request(httpServer)
      .get('/api/v1/health')
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: {
            status: string;
            communication: {
              apiBaseUrl: string;
            };
          };
        }) => {
          expect(body.status).toBe('ok');
          expect(body.communication.apiBaseUrl).toContain('/api/v1');
        },
      );
  });

  afterEach(async () => {
    await app.close();
  });
});
