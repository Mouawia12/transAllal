/**
 * E2E test environment setup.
 *
 * Runs before the NestJS application is bootstrapped in e2e tests.
 * Override DATABASE_URL so tests never touch the developer's local schema.
 * Set TEST_DATABASE_URL in your shell or CI to point at a dedicated test DB:
 *
 *   TEST_DATABASE_URL=mysql://user:pass@localhost:3306/trans_allal_test npm run test:e2e
 *
 * If TEST_DATABASE_URL is not provided the suite falls back to an in-process
 * stub (DATABASE_URL is set to an invalid sentinel) so the app starts without
 * a real DB connection; tests that require a live database will fail fast with a
 * clear connection error instead of silently mutating the development schema.
 */

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://test:test@localhost:3306/trans_allal_test';

// Prevent TypeORM from running synchronize or applying migrations during tests.
// Schema management in tests must be done explicitly, not as a side effect of
// application startup.
process.env.APP_ENV = 'test';
