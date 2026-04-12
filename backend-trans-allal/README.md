# backend-trans-allal

## Purpose

`backend-trans-allal` is the main NestJS backend for the Trans Allal workspace. In this phase it is prepared as a production-oriented foundation only: configuration loading, API bootstrap, module boundaries, database/websocket readiness, and a clean separation between business data and telemetry data.

## Stack

- NestJS 11
- TypeScript
- `@nestjs/config` for centralized environment loading
- Validation pipe readiness via `class-validator` and `class-transformer`

## Folder Structure

```text
src/
  config/
    app/
    auth/
    cache/
    database/
    websocket/
  common/
    constants/
    decorators/
    dto/
    enums/
    exceptions/
    filters/
    guards/
    interceptors/
    interfaces/
    pipes/
    types/
    utils/
  modules/
    auth/
    health/
    admin-business/
      users/
      companies/
      drivers/
      trucks/
      trips/
      reports/
    telemetry/
      tracking/
      alerts/
  database/
  websocket/
  shared/
  bootstrap.ts
  main.ts
  app.module.ts
```

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Adjust API, database, auth, cache, and websocket variables.
3. Keep the API prefix aligned with dashboard and mobile clients.

Key variables:

- `PORT`
- `APP_NAME`
- `APP_ENV`
- `APP_URL`
- `API_PREFIX`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_HOST`
- `REDIS_PORT`
- `CORS_ORIGIN`
- `WS_PORT`

## Run Instructions

```bash
npm install
npm run start:dev
```

Useful commands:

```bash
npm run build
npm run test
npm run test:e2e
```

## Architecture Notes

- `ConfigModule` is global and loads dedicated config namespaces for app, auth, cache, database, and websocket concerns.
- `bootstrap.ts` centralizes API prefixing, CORS, validation pipe setup, and startup logging.
- `modules/admin-business` is reserved for relational and administrative domains.
- `modules/telemetry` is reserved for high-frequency tracking and alert flows.
- `database/` exposes connection tokens and readiness placeholders for future split persistence strategies.
- `websocket/` exposes readiness placeholders for realtime namespaces and driver tracking streams.

## Modules Overview

- `auth`: authentication boundary and token workflow placeholder
- `health`: health/readiness endpoint used by clients and ops checks
- `admin-business`: users, companies, drivers, trucks, trips, reports
- `telemetry`: tracking and alerts

## Next Implementation Phase

- Implement concrete auth flows and guards
- Add actual database clients and repositories
- Introduce DTOs and validation for domain modules
- Build REST endpoints per module
- Add websocket gateway/events for realtime driver tracking
- Add caching, rate limiting, logging, and observability
