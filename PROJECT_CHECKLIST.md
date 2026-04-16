# PROJECT_CHECKLIST

## Project Overview

- [x] Workspace contains the three existing projects only:
  - `backend-trans-allal`
  - `dashboard-trans-allal`
  - `app-trans-allal`
- [x] Root-level handoff documentation has been created.
- [x] This phase stayed focused on structure, readiness, docs, and cleanup.
- [ ] Business logic implementation is intentionally deferred.

## Current Workspace Structure

- [x] Root README explains project roles and system communication.
- [x] Each project has its own `README.md`.
- [x] Each project has its own `.env.example`.
- [x] Folder naming across the workspace is now predictable and feature-oriented.
- [ ] Final implementation should keep new modules/screens/routes inside the current structure instead of creating parallel patterns.

## Backend Organization Checklist

- [x] NestJS starter boilerplate has been replaced with a structured backend skeleton.
- [x] `ConfigModule` is centralized and global.
- [x] `config/` is split into `app`, `auth`, `cache`, `database`, and `websocket`.
- [x] `common/` contains reusable architectural primitives.
- [x] `modules/` is separated into `auth`, `health`, `admin-business`, and `telemetry`.
- [x] Business/admin modules are isolated from tracking/telemetry modules.
- [x] `database/` contains future split-connection readiness.
- [x] `websocket/` contains future realtime readiness.
- [x] Health endpoint scaffold exists for diagnostics.
- [ ] Implement concrete auth, repositories, DTOs, controllers, and domain services.

## Dashboard Organization Checklist

- [x] App Router is organized with `(auth)` and `(dashboard)` route groups.
- [x] Dashboard layout boundary is centralized.
- [x] Feature folders exist for auth, overview, companies, drivers, trucks, trips, tracking, alerts, reports, and settings.
- [x] Shared UI/layout/maps/charts/tables folders exist.
- [x] Central API config, endpoints, and fetch client exist.
- [x] Auth token handling placeholder exists.
- [x] Realtime/websocket client placeholder exists.
- [x] Starter public boilerplate assets were removed.
- [ ] Replace placeholder feature pages with real data views and workflows.

## Mobile Organization Checklist

- [x] Expo Router has been moved into `src/app`.
- [x] Navigation boundaries are separated from screens.
- [x] Screens are separated into auth, home, trip, tracking, profile, and settings.
- [x] Services are split into api, storage, permissions, location, and connectivity.
- [x] Features are separated into auth, driver, trip, tracking, and sync.
- [x] Theme, constants, hooks, store, and types are centralized.
- [x] Tracking/background location readiness exists as a placeholder.
- [x] Old Expo starter boilerplate was removed after migration.
- [ ] Implement secure storage, location permissions, offline sync queue, and live telemetry delivery.

## Environment Variables Checklist

- [x] Backend `.env.example` contains API, database, auth, cache, CORS, and websocket variables.
- [x] Dashboard `.env.example` contains public app, API, websocket, and map variables.
- [x] Mobile `.env.example` contains public app, API, websocket, map, and environment variables.
- [x] Naming is aligned across the three projects where possible.
- [ ] Keep actual `.env` values consistent across local, staging, and production environments.

## API Communication Readiness Checklist

- [x] Backend has a clear API prefix concept.
- [x] Backend exposes a health/readiness endpoint.
- [x] Dashboard has a centralized API client.
- [x] Dashboard has centralized endpoint constants.
- [x] Mobile has a centralized API client.
- [x] Mobile has centralized endpoint constants.
- [x] Dashboard and mobile both have websocket URL readiness.
- [ ] Replace placeholder endpoints with real contract-by-contract integration.

## Shared Conventions Checklist

- [x] Project naming remains unchanged.
- [x] Folders are grouped by responsibility instead of by framework default only.
- [x] Auth, business data, tracking, and sync concerns are clearly separated.
- [x] Readmes explain purpose, structure, env setup, and next phase.
- [x] Imports are cleaner and more predictable in frontend/mobile projects via `@/`.
- [ ] Preserve this convention when adding new domains or screens.

## Security Basics Checklist

- [x] Secrets are documented in `.env.example` instead of hardcoded into logic.
- [x] Backend bootstrap is prepared for global validation.
- [x] Dashboard has an isolated auth storage boundary.
- [x] Mobile has an isolated token storage boundary ready to be swapped with secure storage.
- [ ] Implement real auth guards, refresh flows, secure token persistence, and role enforcement.
- [ ] Add rate limiting, request logging, auditing, and secret rotation policy.

## Realtime Readiness Checklist

- [x] Backend has websocket configuration space and event naming placeholders.
- [x] Dashboard has a future websocket client location.
- [x] Mobile has a future websocket client location.
- [x] Tracking-related modules/screens are separated from admin/business concerns.
- [ ] Implement actual websocket gateway/server transport and client subscriptions.
- [ ] Define event contracts for driver location, trip updates, and alerts.

## Future Implementation Roadmap

- [ ] Implement backend auth and user/company/driver/truck/trip/report APIs.
- [ ] Introduce actual database connections and repository layers.
- [ ] Implement dashboard auth flow and protected routes.
- [ ] Connect dashboard widgets, tables, and tracking views to live backend APIs.
- [ ] Implement mobile sign-in, token persistence, trip lifecycle actions, and offline sync.
- [ ] Add realtime tracking from mobile to backend and from backend to dashboard.
- [ ] Add validation, tests, logging, monitoring, and deployment configuration.

## Review Findings Backlog

- [x] Fix dashboard websocket reconnect behavior in `dashboard-trans-allal/src/lib/api/realtime-client.ts` so company subscriptions are restored automatically after reconnect instead of being lost after network interruption.
- [x] Stop `dashboard-trans-allal/src/app/(dashboard)/alerts/page.tsx` from disconnecting the shared realtime socket on page unmount; page cleanup must remove only its own listeners.
- [x] Make mobile tracking session start/stop atomic in `app-trans-allal/src/screens/tracking/tracking-screen.tsx` so backend session state and local tracker state cannot drift apart on partial failures.
- [x] Replace the placeholder tracking surface in `app-trans-allal/src/screens/tracking/tracking-screen.tsx` with a real map/current-location experience or an explicitly supported fallback.
- [x] Review the live-tracking SLA and publishing strategy in `app-trans-allal/src/services/location/location-tracker.service.ts`; current location delivery runs on a 5-second cadence and is only near-real-time.
- [x] Add full TypeORM migration support in `backend-trans-allal` with a real data source file, migration scripts, baseline migration, and run/revert workflow.
- [x] Remove schema-management dependence on `synchronize` in `backend-trans-allal/src/database/database.module.ts` and use migrations as the only controlled schema evolution path.
- [x] Isolate automated tests from the real local database; backend test runs must not mutate the main schema or apply implicit ALTER statements during startup.
- [x] Add and verify telemetry-oriented database indexes for `driver_locations`, especially around `driverId`, `tripId`, and `recordedAt` access patterns used by tracking history and latest-location queries.
- [x] Extend `backend-trans-allal/.env.example` and setup docs with the Firebase server configuration required for push delivery, including `FIREBASE_SERVICE_ACCOUNT_JSON`.
- [x] Complete push notification support end-to-end across backend and mobile, including platform configuration validation instead of relying on a partial happy path.
- [x] Unify notification behavior across dashboard and mobile so online/offline, alerts, and trip-assignment events follow one consistent subscription and display strategy.
- [x] Fix backend e2e tests to assert the API success envelope `{ data, meta? }`, starting with `backend-trans-allal/test/app.e2e-spec.ts`.

## Notes for Claude Code Handoff

- [x] The workspace is now scaffolded for implementation, not redesign.
- [x] Continue inside the current folder boundaries instead of rebuilding the projects.
- [x] Start from shared API contracts and health checks first.
- [x] Preserve the backend split between `admin-business` and `telemetry`.
- [x] Preserve the dashboard split between route groups, feature folders, and shared lib layers.
- [x] Preserve the mobile split between routing, screens, services, and features.
- [ ] Before implementing business logic, confirm endpoint contracts and auth strategy across all three projects.
