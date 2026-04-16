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

    // All successful responses from this API are wrapped in { data, meta? } by
    // SuccessResponseInterceptor. Assert against the envelope, not the raw payload.
    return request(httpServer)
      .get('/api/v1/health')
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: {
            data: {
              status: string;
              communication: {
                apiBaseUrl: string;
              };
            };
          };
        }) => {
          expect(body.data).toBeDefined();
          expect(body.data.status).toBe('ok');
          expect(body.data.communication.apiBaseUrl).toContain('/api/v1');
        },
      );
  });

  afterEach(async () => {
    await app.close();
  });
});
