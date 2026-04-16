# Trans Allal — Technical Implementation Plan

> **Audience:** AI coding agents (Codex, Claude, etc.)
> **How to use this file:**
> - Work top-to-bottom, task by task.
> - Do NOT move to the next task until the current one is fully implemented and verified.
> - When a task is done, mark its checkbox: `[ ]` → `[x]`.
> - Never skip a task. Never leave a placeholder or TODO in code.
> - Write production-quality, strictly-typed TypeScript throughout.

---

## Project Map

```
transAllal/
├── backend-trans-allal/      NestJS 11 + TypeScript + MySQL + Redis
├── dashboard-trans-allal/    Next.js 16 App Router + React 19 + Tailwind v4
└── app-trans-allal/          Expo 54 + React Native + Expo Router
```

---

## Shared Reference (read before coding — do not check off)

### Execution Locks (resolve here first — do not change mid-implementation)
- **ORM:** TypeORM only for this plan. Do not introduce Prisma in any phase.
- **Auth principal:** `User` is the only JWT subject across dashboard and mobile.
- **Driver auth model:** every `Driver` profile has one linked `User` with `role = DRIVER`.
- **Dashboard overview route:** `/` stays the overview route via `src/app/(dashboard)/page.tsx`.
- **Mobile protected routes:** keep the existing `src/app/(driver)` + `src/app/(driver)/(tabs)` tree. Do not create a parallel `/(app)` tree.
- **WebSocket contract:** use Socket.IO at `ws://localhost:3002/tracking` with namespace `/tracking`.
- **Foundational alignment rule:** extend existing scaffold files first; only add new files when the scaffold has no equivalent placeholder.

### REST API Base
- **URL:** `http://localhost:3000/api/v1`
- **Auth header:** `Authorization: Bearer <access_token>`
- **Success response shape:** `{ data, meta? }`
- **Error response shape:** `{ data: null, error, meta? }`
- **`meta` usage:** pagination and request metadata only. Standard pagination shape: `{ page, limit, total, totalPages }`
- **Error shape:** `{ code: string, message: string, details?: unknown }`
- **Health endpoint:** follows the same success envelope; its readiness payload lives inside `data`

### WebSocket
- **URL:** `ws://localhost:3002/tracking`
- **Namespace:** `/tracking`
- **Transport:** Socket.IO
- **Auth handshake:** `auth: { token: <access_token> }`

| Direction | Event | Payload |
|-----------|-------|---------|
| Client→Server | `driver.location.publish` | `{ lat, lng, speedKmh?, heading?, accuracyM?, tripId? }` |
| Server→Client | `driver.location.updated` | `{ driverId, tripId?, lat, lng, speedKmh?, heading?, accuracyM?, recordedAt }` |
| Server→Client | `alert.raised` | `{ alertId, type, severity, message, driverId, tripId }` |
| Server→Client | `trip.status.changed` | `{ tripId, status, driverId, changedAt }` |
| Server→Client | `driver.online.changed` | `{ driverId, isOnline, lastSeenAt }` |
| Client→Server | `company.subscribe` | `{ companyId }` |
| Client→Server | `driver.subscribe` | `{ driverId }` |

### Auth & Claims Contract
- **JWT payload:** `{ sub: userId, role, companyId?: string | null, driverId?: string | null }`
- **`sub`:** always the authenticated `User.id`
- **`role`:** one of `SUPER_ADMIN | COMPANY_ADMIN | DISPATCHER | DRIVER`
- **`companyId`:**
  - required for `COMPANY_ADMIN`, `DISPATCHER`, and `DRIVER`
  - `null` for `SUPER_ADMIN`
- **`driverId`:**
  - required for `DRIVER`
  - omitted / `null` for non-driver roles
- **`JwtAuthGuard`:** validates the JWT and attaches a unified request user object from the payload
- **`RolesGuard`:** checks `req.user.role` only; it does not branch on token shape
- **`/auth/me`:** returns the authenticated `User` plus linked `Driver` profile when `role = DRIVER`

### Enums (use in both backend and frontend — no magic strings)
```
Role:       SUPER_ADMIN | COMPANY_ADMIN | DISPATCHER | DRIVER
TripStatus: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
AlertType:  SPEEDING | GEOFENCE_EXIT | IDLE | SOS | ROUTE_DEVIATION
Severity:   LOW | MEDIUM | HIGH | CRITICAL
Locale:     en | ar
```

### i18n & RTL Contract (apply to Dashboard and Mobile — not Backend)
- **Supported locales:** `en` (English, LTR) and `ar` (Arabic, RTL)
- **Default locale:** `ar`
- **Direction:** `dir="ltr"` for English, `dir="rtl"` for Arabic — applied at the root HTML/View level
- **Library (Dashboard):** `next-intl` with App Router integration
- **Library (Mobile):** `i18next` + `react-i18next` + `expo-localization`
- **Translation file structure:** flat JSON files per locale, one file per feature namespace
  ```
  messages/                     (Dashboard)
  ├── en/
  │   ├── common.json           (shared: buttons, labels, errors, status values)
  │   ├── auth.json
  │   ├── companies.json
  │   ├── drivers.json
  │   ├── trucks.json
  │   ├── trips.json
  │   ├── tracking.json
  │   ├── alerts.json
  │   ├── reports.json
  │   └── settings.json
  └── ar/
      └── (same structure, all keys identical)

  src/locales/                  (Mobile)
  ├── en.json                   (single flat file — mobile has fewer strings)
  └── ar.json
  ```
- **Key naming:** `snake_case` keys, nested by feature. Example: `{ "trips": { "start_trip": "Start Trip", "complete_trip": "Complete Trip" } }`
- **No hardcoded UI strings** anywhere — every visible label, button, placeholder, error message, and toast must use a translation key
- **RTL layout rule (Dashboard):** use Tailwind `rtl:` variants for mirroring. Example: `ml-4 rtl:ml-0 rtl:mr-4`, `flex-row rtl:flex-row-reverse`. Do NOT use absolute left/right positioning in shared components — use logical CSS properties (`start`, `end`) when possible
- **RTL layout rule (Mobile):** React Native's flexbox automatically mirrors when `I18nManager.isRTL` is true. Use `flexDirection: 'row'` and let the system mirror; avoid hardcoded `left`/`right` style properties in shared components
- **Language switching:** persisted to `localStorage` (Dashboard) and `AsyncStorage` (Mobile); app reloads/restarts are acceptable when switching language on mobile

### Persistence Decision
- **TypeORM only** in backend Phase 1 through Phase 4
- Use TypeORM entities, repositories, relations, and query builders consistently
- Keep `admin-business` and `telemetry` as module boundaries in code; do not introduce a second ORM path

### Code Quality Rules (apply to every file)
1. No `any` types — use proper interfaces or `unknown` with type guards.
2. No magic strings — use enums/constants for status values, role names, event names.
3. Async/await only — no `.then/.catch` chains in business logic.
4. Services throw typed exceptions; controllers/UI catch and transform.
5. All list endpoints: `page` (default 1) + `limit` (default 20, max 100) query params.
6. No direct state mutation — spread or immer patterns.
7. Single responsibility — no file over ~200 lines.
8. No `console.log` — use NestJS `Logger` (backend) or structured logging.
9. Env vars accessed only via config service or `constants/env.ts`. Never `process.env.X` inline.
10. Every endpoint that accepts a body must have a fully validated DTO.
11. Build on the current scaffold. If a placeholder file already exists, expand or refactor it explicitly instead of creating a parallel baseline.

---

## Phase 1 — Backend (`backend-trans-allal`)

### 1-A  Install Dependencies

- [ ] **1-A-1** Install ORM + DB packages
  ```bash
  cd backend-trans-allal
  npm install @nestjs/typeorm typeorm pg
  ```

- [ ] **1-A-2** Install Auth packages
  ```bash
  npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
  npm install -D @types/passport-jwt @types/bcrypt
  ```

- [ ] **1-A-3** Install Cache + WebSocket packages
  ```bash
  npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet ioredis
  npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
  ```

---

### 1-B  Environment Setup

- [ ] **1-B-1** Create `backend-trans-allal/.env` from `.env.example` with these values:
  ```env
  PORT=3000
  APP_NAME=Trans Allal API
  APP_ENV=development
  APP_URL=http://localhost:3000
  API_PREFIX=api/v1
  DATABASE_URL=mysql://mouawia:mouawia@localhost:3306/trans-allal-db
  JWT_SECRET=change_me_32chars_minimum_secret_key
  JWT_EXPIRES_IN=15m
  JWT_REFRESH_SECRET=change_me_refresh_secret_key_32ch
  JWT_REFRESH_EXPIRES_IN=7d
  REDIS_HOST=127.0.0.1
  REDIS_PORT=6379
  CORS_ORIGIN=http://localhost:3001,http://localhost:19006
  WS_PORT=3002
  ```
  > Keep the backend contract fixed at API `http://localhost:3000/api/v1` and Socket.IO `ws://localhost:3002/tracking`. Mobile device-specific LAN overrides happen in the mobile `.env`, not here.

---

### 1-C  Database Configuration

- [ ] **1-C-1** Keep `src/config/database/database.config.ts` as the single database config entrypoint. Expand the existing file; do not create a parallel `src/config/database/index.ts`.
- [ ] **1-C-2** Replace the placeholder providers in `src/database/database.module.ts` with the real TypeORM bootstrap using `TypeOrmModule.forRootAsync(...)`.
- [ ] **1-C-3** Use one MySQL TypeORM connection in Phase 1, sourced from `database.url`, while preserving module boundaries between business data and telemetry data.
- [ ] **1-C-4** If a separate factory is needed, add `src/database/typeorm.config.ts`; do not duplicate config namespaces or add Prisma files.

---

### 1-D  Entities

> Rule: plain class + TypeORM decorators. Use `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn()`, `@UpdateDateColumn()`. Keep TypeORM as the only ORM path in this plan.

- [ ] **1-D-1** `src/modules/admin-business/companies/company.entity.ts`
  Fields: `id`, `name`, `taxId`, `phone`, `email`, `address`, `isActive`, `createdAt`, `updatedAt`

- [ ] **1-D-2** `src/modules/admin-business/users/user.entity.ts`
  Fields: `id`, `companyId` (nullable for `SUPER_ADMIN`), `email` (nullable for `DRIVER`, unique when present), `password` (excluded from selects via `select: false`), `firstName`, `lastName`, `role` (enum Role including `DRIVER`), `isActive`, `lastLoginAt` (nullable), `createdAt`, `updatedAt`
  Relations: `@ManyToOne(() => Company, { nullable: true })`, `@OneToOne(() => Driver, (driver) => driver.user)`
  Notes:
  - `User` is the only authentication principal
  - all JWTs use `User.id` as `sub`

- [ ] **1-D-3** `src/modules/admin-business/drivers/driver.entity.ts`
  Fields: `id`, `companyId`, `userId` (unique), `firstName`, `lastName`, `phone` (unique), `licenseNumber`, `licenseExpiry`, `isActive`, `isOnline` (boolean, default false), `lastSeenAt` (TIMESTAMPTZ, nullable), `createdAt`, `updatedAt`
  Relations: `@ManyToOne(() => Company)`, `@OneToOne(() => User) @JoinColumn()`
  Notes:
  - `Driver` is a profile / domain entity, not a separate auth principal
  - each driver must have exactly one linked `User` with `role = DRIVER`
  - `isOnline` tracks whether the driver is actively broadcasting location (independent of trip status)
  - `lastSeenAt` updates every time a location ping is received

- [ ] **1-D-4** `src/modules/admin-business/trucks/truck.entity.ts`
  Fields: `id`, `companyId`, `plateNumber`, `brand`, `model`, `year`, `capacityTons`, `isActive`, `createdAt`, `updatedAt`
  Relations: `@ManyToOne(() => Company)`

- [ ] **1-D-5** `src/modules/admin-business/trips/trip.entity.ts`
  Fields: `id`, `companyId`, `driverId`, `truckId`, `origin`, `destination`, `originLat`, `originLng`, `destinationLat`, `destinationLng`, `scheduledAt`, `startedAt`, `completedAt`, `status` (enum TripStatus), `notes`, `createdAt`, `updatedAt`
  Relations: `@ManyToOne(() => Company)`, `@ManyToOne(() => Driver)`, `@ManyToOne(() => Truck)`

- [ ] **1-D-6** `src/modules/telemetry/tracking/driver-location.entity.ts`
  Fields: `id` (bigint auto-increment), `driverId`, `tripId`, `lat`, `lng`, `speedKmh`, `heading`, `accuracyM`, `recordedAt`
  Relations: `@ManyToOne(() => Driver)`, `@ManyToOne(() => Trip)`

- [ ] **1-D-7** `src/modules/telemetry/alerts/alert.entity.ts`
  Fields: `id`, `companyId`, `driverId`, `tripId`, `type` (enum AlertType), `severity` (enum Severity), `message`, `isRead`, `createdAt`
  Relations: `@ManyToOne(() => Company)`, `@ManyToOne(() => Driver)`, `@ManyToOne(() => Trip)`

- [ ] **1-D-8** `src/modules/auth/refresh-token.entity.ts`
  Fields: `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt` (nullable), `createdAt`
  Relations: `@ManyToOne(() => User)`
  Notes:
  - refresh tokens belong only to `User`
  - do not model a separate `driverId` path in refresh tokens

---

### 1-E  Common Utilities

- [ ] **1-E-1** `src/common/enums/role.enum.ts` — export string enum `Role { SUPER_ADMIN = 'SUPER_ADMIN', COMPANY_ADMIN = 'COMPANY_ADMIN', DISPATCHER = 'DISPATCHER', DRIVER = 'DRIVER' }`
- [ ] **1-E-2** `src/common/enums/trip-status.enum.ts` — export string enum `TripStatus { PENDING = 'PENDING', IN_PROGRESS = 'IN_PROGRESS', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED' }`
- [ ] **1-E-3** `src/common/enums/alert.enum.ts` — export string enums `AlertType` and `Severity`
- [ ] **1-E-4** `src/common/decorators/roles.decorator.ts` — `@Roles(...roles: Role[])` using `SetMetadata`
- [ ] **1-E-5** `src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` that extracts `req.user`
- [ ] **1-E-6** Replace the placeholder auth guard with a real JWT guard. If you rename `src/common/guards/auth-placeholder.guard.ts` to `jwt-auth.guard.ts`, treat it as an explicit refactor and update imports in the same phase.
- [ ] **1-E-7** `src/common/guards/roles.guard.ts` — implements `CanActivate`, reads `@Roles()` metadata, checks only `req.user.role` from the unified JWT payload
- [ ] **1-E-8** Expand `src/common/types/request-context.type.ts` into the canonical request-user shape: `{ userId, role, companyId?, driverId? }`
- [ ] **1-E-9** Expand the existing `src/common/filters/http-exception.filter.ts` so every API error returns `{ data: null, error: { code, message, details? }, meta?: { timestamp, requestId? } }`
- [ ] **1-E-10** Keep `src/common/dto/pagination-query.dto.ts` as the shared pagination DTO: `page` default `1`, `limit` default `20`, max `100`
- [ ] **1-E-11** Register the exception filter globally in `bootstrap.ts` and keep `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`
- [ ] **1-E-12** Refactor the existing `src/common/interfaces/api-response.interface.ts` so backend success / error typings match the locked API envelope instead of the current placeholder shape

---

### 1-F  Auth Module

- [ ] **1-F-1** `src/modules/auth/strategies/jwt.strategy.ts`
  - Extends `PassportStrategy(Strategy, 'jwt')`
  - Extracts Bearer from header
  - Validates payload `{ sub, role, companyId?, driverId? }`
  - Attaches unified request user `{ userId: sub, role, companyId, driverId }`

- [ ] **1-F-2** Phase 1 auth is **service-driven**, not local-strategy-driven:
  - no `passport-local` strategy is required
  - no separate driver JWT type is allowed
  - both dashboard and mobile auth flows must resolve to a `User`

- [ ] **1-F-3** `src/modules/auth/auth.service.ts` — implement methods:
  - `loginUser(email, password)` → authenticate non-driver users by `User.email`
  - `loginDriver(phone, password)` → find `Driver` by phone with linked `User(role = DRIVER)`, verify `user.password`, issue the same token pair shape
  - `refresh(refreshToken)` → verify hash in `refresh_tokens`, rotate both tokens, update DB record
  - `logout(userId, refreshToken)` → revoke the current session token for that `User`
  - `getMe(requestUser)` → return authenticated `User`; include linked `Driver` profile when role is `DRIVER`
  - `generateTokenPair(payload)` → private, returns `{ accessToken, refreshToken }`
  - `buildJwtPayload(user)` → private, returns `{ sub, role, companyId?, driverId? }`

- [ ] **1-F-4** DTOs:
  - `login.dto.ts` — `email: string`, `password: string`
  - `driver-login.dto.ts` — `phone: string`, `password: string`
  - `refresh.dto.ts` — `refreshToken: string`
  - `logout.dto.ts` — `refreshToken: string`

- [ ] **1-F-5** `src/modules/auth/auth.controller.ts` — endpoints:
  - `POST /auth/login` → `loginUser`
  - `POST /auth/driver/login` → `loginDriver`
  - `POST /auth/refresh` → `refresh`
  - `POST /auth/logout` → `logout` (requires JWT guard + `refreshToken` body)
  - `GET /auth/me` → `getMe` (requires JWT guard)
  - All success responses use the shared `{ data, meta? }` envelope

- [ ] **1-F-6** `src/modules/auth/auth.module.ts` — import `JwtModule.registerAsync`, `PassportModule`, `TypeOrmModule.forFeature([RefreshToken, User, Driver])`, register `JwtStrategy`

- [ ] **1-F-7** Keep `AuthModule` registered in `app.module.ts`; do not add a separate mobile-only auth module

---

### 1-G  Companies Module

- [ ] **1-G-1** `src/modules/admin-business/companies/dto/create-company.dto.ts` — all fields validated
- [ ] **1-G-2** `src/modules/admin-business/companies/dto/update-company.dto.ts` — `PartialType(CreateCompanyDto)`
- [ ] **1-G-3** `src/modules/admin-business/companies/dto/query-company.dto.ts` — extends `PaginationQueryDto`, adds `isActive?: boolean`, `search?: string`
- [ ] **1-G-4** `src/modules/admin-business/companies/companies.service.ts` — implement: `findAll(query)`, `findOne(id)`, `create(dto)`, `update(id, dto)`, `softDelete(id)`
- [ ] **1-G-5** `src/modules/admin-business/companies/companies.controller.ts` — all 5 endpoints, protected by `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(Role.SUPER_ADMIN)`
- [ ] **1-G-6** `src/modules/admin-business/companies/companies.module.ts` — wire up and register in `app.module.ts`

---

### 1-H  Users Module

- [ ] **1-H-1** Scope decision: `UsersModule` manages back-office users only (`SUPER_ADMIN`, `COMPANY_ADMIN`, `DISPATCHER`). Do not create `DRIVER` accounts here.
- [ ] **1-H-2** DTOs: `create-user.dto.ts` (includes role, companyId), `update-user.dto.ts`, `query-user.dto.ts`
- [ ] **1-H-3** `users.service.ts` — `findAll`, `findOne`, `create` (hash password with bcrypt), `update`, `softDelete`
- [ ] **1-H-4** `users.controller.ts` — CRUD endpoints, SUPER_ADMIN only
- [ ] **1-H-5** `users.module.ts` — wire and register

---

### 1-I  Drivers Module

- [ ] **1-I-1** DTOs: `create-driver.dto.ts`, `update-driver.dto.ts`, `query-driver.dto.ts` (filter by `companyId`, `isActive`, `search`)
- [ ] **1-I-2** `drivers.service.ts`
  - `findAll`, `findOne` (include last known location from `driver_locations`)
  - `create(dto)` → create `Driver` profile + linked `User(role = DRIVER)` in one transaction
  - initial password policy:
    - accept optional `initialPassword`
    - if omitted, generate a temporary password
    - hash before persistence
    - return the temporary password once in the create response / admin workflow payload
  - `update(id, dto)` → keep linked `User.firstName`, `User.lastName`, and activation state aligned when driver profile changes
  - `softDelete(id)` → deactivate both the `Driver` profile and linked `User`
- [ ] **1-I-3** `drivers.controller.ts`
  - admin CRUD endpoints require `SUPER_ADMIN` or `COMPANY_ADMIN`
  - add self-service endpoints for authenticated drivers:
    - `GET /drivers/me`
    - `PATCH /drivers/me`
- [ ] **1-I-4** `drivers.module.ts` — wire and register

---

### 1-J  Trucks Module

- [ ] **1-J-1** DTOs: `create-truck.dto.ts`, `update-truck.dto.ts`, `query-truck.dto.ts` (filter by `companyId`, `isActive`)
- [ ] **1-J-2** `trucks.service.ts` — `findAll`, `findOne`, `create`, `update`, `softDelete`
- [ ] **1-J-3** `trucks.controller.ts` — CRUD endpoints, requires `SUPER_ADMIN` or `COMPANY_ADMIN`
- [ ] **1-J-4** `trucks.module.ts` — wire and register

---

### 1-K  Trips Module

- [ ] **1-K-1** DTOs: `create-trip.dto.ts`, `update-trip.dto.ts`, `query-trip.dto.ts` (filter by `companyId`, `driverId`, `status`, `from`/`to` dates)
- [ ] **1-K-2** `trips.service.ts`:
  - `findAll(query)` — paginated, join driver + truck
  - `findOne(id)` — with driver and truck details
  - `create(dto)` — validate driver and truck belong to same company
  - `update(id, dto)` — set `startedAt` when status → `IN_PROGRESS`, `completedAt` when → `COMPLETED`
  - `cancel(id)` — set status to `CANCELLED`
  - `getMyTrips(requestUser)` — driver-scoped list for mobile using `requestUser.driverId`
  - `updateTripStatusForDriver(requestUser, tripId, status)` — only allow the assigned driver to move `PENDING -> IN_PROGRESS -> COMPLETED`
  - `getTrackHistory(tripId)` — all `driver_locations` records for trip ordered by `recordedAt`
- [ ] **1-K-3** `trips.controller.ts`
  - admin endpoints: list / detail / create / update / cancel / `GET /:id/track`
  - driver endpoints for mobile:
    - `GET /trips/my`
    - `PATCH /trips/:id/status`
- [ ] **1-K-4** `trips.module.ts` — wire and register

---

### 1-L  Tracking Module

- [ ] **1-L-1** `src/modules/telemetry/tracking/dto/save-location.dto.ts` — `lat`, `lng`, `speedKmh?`, `heading?`, `accuracyM?`, `tripId?` (nullable — location can be sent without an active trip)
- [ ] **1-L-2** `src/modules/telemetry/tracking/dto/query-tracking.dto.ts` — `from: Date`, `to: Date`, both required, ISO string format
- [ ] **1-L-3** `tracking.service.ts`:
  - `saveLocation(driverId, dto)` → insert into `driver_locations` (with or without `tripId`). Update `driver.lastSeenAt = NOW()`. If `speedKmh > 120` → call `AlertsService.create(SPEEDING alert)`
  - `startSession(driverId)` → set `driver.isOnline = true`, emit `driver.online.changed` via gateway
  - `stopSession(driverId)` → set `driver.isOnline = false`, emit `driver.online.changed` via gateway
  - `getLiveLocations(companyId)` → latest location per **online** driver in company (filter `driver.isOnline = true`), use `DISTINCT ON (driver_id)` ordered by `recorded_at DESC`
  - `getAllTruckPositions(companyId)` → latest known location for **all** active drivers regardless of `isOnline` or trip status — used by fleet overview map; returns `null` for drivers with no location history
  - `getHistory(driverId, from, to)` → ordered by `recordedAt ASC`
- [ ] **1-L-4** `tracking.controller.ts`:
  - `POST /tracking/session/start` — driver JWT only, calls `startSession`; response: `{ isOnline: true }`
  - `POST /tracking/session/stop` — driver JWT only, calls `stopSession`; response: `{ isOnline: false }`
  - `POST /tracking/location` — driver JWT only, calls `saveLocation` (works regardless of session state; session state is for dashboard display only)
  - `GET /tracking/live` — dashboard JWT, query param `companyId`; returns only currently online drivers
  - `GET /tracking/fleet` — dashboard JWT, query param `companyId`; returns last known position of ALL active drivers
  - `GET /tracking/driver/:driverId` — dashboard JWT; full location history with query params `from`, `to`
- [ ] **1-L-5** `tracking.module.ts` — wire and register

---

### 1-M  Alerts Module

- [ ] **1-M-1** `src/modules/telemetry/alerts/dto/create-alert.dto.ts` — `companyId`, `driverId?`, `tripId?`, `type`, `severity`, `message`
- [ ] **1-M-2** `src/modules/telemetry/alerts/dto/query-alert.dto.ts` — filter by `companyId`, `type`, `severity`, `isRead`
- [ ] **1-M-3** `alerts.service.ts`:
  - `create(dto)` → save alert, then emit `alert.raised` via WebSocket gateway
  - `findAll(query)` → paginated with filters
  - `markRead(id)` → set `isRead = true`
  - `markAllRead(companyId)` → bulk update where `companyId = ? AND isRead = false`
- [ ] **1-M-4** `alerts.controller.ts`:
  - `GET /alerts`
  - `PATCH /alerts/:id/read`
  - `PATCH /alerts/read-all` — body: `{ companyId }`
- [ ] **1-M-5** `alerts.module.ts` — wire and register

---

### 1-N  Reports Module

- [ ] **1-N-1** `reports.service.ts` — use `QueryBuilder` for all queries, no entity array loading:
  - `getSummary(companyId)` → COUNT trips by status, COUNT active drivers, COUNT active trucks
  - `getTripsReport(companyId, from, to, groupBy: 'day'|'week')` → GROUP BY truncated date
  - `getDriversReport(companyId, from, to)` → per driver: trip count, completed count
  - `getAlertsReport(companyId, from, to)` → COUNT by type and by severity
- [ ] **1-N-2** `reports.controller.ts`:
  - `GET /reports/summary?companyId=`
  - `GET /reports/trips?companyId=&from=&to=&groupBy=`
  - `GET /reports/drivers?companyId=&from=&to=`
  - `GET /reports/alerts?companyId=&from=&to=`
- [ ] **1-N-3** `reports.module.ts` — wire and register

---

### 1-O  WebSocket Gateway

- [ ] **1-O-1** `src/websocket/tracking.gateway.ts`
  - Bind to configured `WS_PORT` and namespace `/tracking`
  - Read access token from `client.handshake.auth.token`, verify with `JwtService`, disconnect on invalid
  - `driver.location.publish` → call `TrackingService.saveLocation()` → emit `driver.location.updated` to rooms `company:<id>` and `driver:<id>`
  - `company.subscribe` → `client.join('company:' + companyId)` — dashboard joins this to receive all driver updates for a company
  - `driver.subscribe` → `client.join('driver:' + driverId)` — dashboard joins this to watch a single driver
  - Export `emitAlert(alert)` method used by `AlertsService`
  - Export `emitOnlineChanged(driverId, isOnline, lastSeenAt)` method used by `TrackingService` when session starts/stops
  - Expand the existing `src/websocket/websocket.events.ts` contract instead of introducing a second event-definition file

- [ ] **1-O-2** `src/websocket/websocket.module.ts` — imports `TrackingModule`, `AlertsModule`, exports gateway

- [ ] **1-O-3** Keep `WebsocketModule` registered in `app.module.ts`; refactor the existing placeholder module in place

---

### 1-P  Backend Verification

- [ ] **1-P-1** Run `npm run build` — zero TypeScript errors
- [ ] **1-P-2** Run `npm run start:dev` — server starts on port 3000, no runtime errors
- [ ] **1-P-3** `GET http://localhost:3000/api/v1/health` returns `200 OK` with the shared success envelope and `data.status === 'ok'`
- [ ] **1-P-4** Test auth flow: `POST /auth/login` with valid credentials returns `accessToken` + `refreshToken`
- [ ] **1-P-5** Test driver auth flow: `POST /auth/driver/login` with valid phone/password returns the same token pair shape as dashboard auth
- [ ] **1-P-6** Test protected endpoint: `GET /companies` with Bearer token returns data; without token returns 401

---

## Phase 2 — Dashboard (`dashboard-trans-allal`)

### 2-A  Install Dependencies

- [ ] **2-A-1** Install data fetching + state
  ```bash
  cd dashboard-trans-allal
  npm install @tanstack/react-query zustand
  ```

- [ ] **2-A-2** Install UI + forms
  ```bash
  npm install react-hook-form @hookform/resolvers zod
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-tabs
  npm install lucide-react clsx tailwind-merge
  npm install date-fns
  ```

- [ ] **2-A-3** Install maps + charts + realtime
  ```bash
  npm install mapbox-gl @types/mapbox-gl react-map-gl
  npm install recharts
  npm install socket.io-client
  ```

---

### 2-B  Environment Setup

- [ ] **2-B-1** Create `dashboard-trans-allal/.env.local` from the existing `.env.example` and keep these values aligned:
  ```env
  NEXT_PUBLIC_APP_NAME=Trans Allal Dashboard
  NEXT_PUBLIC_APP_URL=http://localhost:3001
  NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
  NEXT_PUBLIC_WS_URL=ws://localhost:3002/tracking
  NEXT_PUBLIC_MAP_PROVIDER=mapbox
  NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
  NEXT_PUBLIC_AUTH_STORAGE_KEY=trans-allal-dashboard-token
  NEXT_PUBLIC_DEFAULT_LOCALE=en
  ```

---

### 2-C  Foundation

- [ ] **2-C-1** `src/lib/api/endpoints.ts` — typed constants for every endpoint from Phase 1 API contract
- [ ] **2-C-2** `src/lib/api/client.ts`
  - Expand the existing fetch-based client; do not replace it with Axios unless this is an explicit refactor decision
  - Base URL = `NEXT_PUBLIC_API_BASE_URL`
  - Read token from auth session store / token store → set `Authorization: Bearer`
  - Parse the shared API envelope and throw normalized app errors from the shared error envelope
  - On 401 → call `POST /auth/refresh` → retry original request once; on second 401 → logout + redirect to `/sign-in`
- [ ] **2-C-3** Keep `src/lib/auth/token-store.ts` as the low-level browser storage adapter keyed by `NEXT_PUBLIC_AUTH_STORAGE_KEY`
- [ ] **2-C-4** Add `src/lib/auth/auth-store.ts` (Zustand) on top of `token-store.ts`
  - State: `accessToken`, `refreshToken`, `user: CurrentUser | null`
  - Actions: `login(email, password)`, `logout()`, `refresh()`
  - Persist via the existing `token-store.ts` boundary; do not read `localStorage` ad hoc throughout the app
- [ ] **2-C-5** `src/lib/query-client.ts` — `new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })`
- [ ] **2-C-6** `src/app/layout.tsx` — wrap with `<QueryClientProvider>`, `<ToastProvider>`, hydrate auth store on mount
- [ ] **2-C-7** `src/lib/api/realtime-client.ts`
  - Class `RealtimeClient` with: `connect(token)`, `subscribeToCompany(id)`, `subscribeToDriver(id)`, `onDriverLocation(cb)`, `onAlert(cb)`, `disconnect()`
  - Connect to `ws://localhost:3002/tracking` and send auth via `auth.token`
  - Use the locked event names from the shared WebSocket contract
  - Export singleton `realtimeClient`
- [ ] **2-C-8** `src/components/layout/auth-guard.tsx` — client component, reads auth store, redirects to `/sign-in` if no token
- [ ] **2-C-9** `src/app/(dashboard)/layout.tsx` — keep the existing `DashboardShell` composition, add `<AuthGuard>`, and continue rendering the existing `sidebar.tsx` + `topbar.tsx`

---

### 2-D  Shared UI Components

- [ ] **2-D-1** `src/components/ui/button.tsx` — props: `variant` (primary/secondary/danger/ghost), `size` (sm/md/lg), `loading?: boolean`, `disabled`, standard HTML button attrs
- [ ] **2-D-2** `src/components/ui/input.tsx` — props: `label`, `error`, controlled, `type`, standard input attrs
- [ ] **2-D-3** `src/components/ui/modal.tsx` — Radix `Dialog` wrapper with `title`, `description`, `footer` slot
- [ ] **2-D-4** `src/components/ui/badge.tsx` — maps status/severity string to color class (green=active/low, yellow=pending/medium, red=cancelled/critical, blue=in-progress)
- [ ] **2-D-5** `src/components/ui/table.tsx` — props: `columns` (with optional sort), `data`, `loading` (shows skeleton rows), `emptyMessage`
- [ ] **2-D-6** `src/components/ui/pagination.tsx` — props: `page`, `totalPages`, `onPageChange`
- [ ] **2-D-7** `src/components/ui/stat.tsx` — KPI card: `icon`, `label`, `value`, `trend?: { value, direction }`
- [ ] **2-D-8** Expand the existing `src/components/layout/sidebar.tsx` with real navigation state instead of creating a second sidebar component
- [ ] **2-D-9** Expand the existing `src/components/layout/topbar.tsx` with app name, current user dropdown, and logout action instead of creating a separate header baseline
- [ ] **2-D-10** `src/components/maps/driver-map.tsx` — `react-map-gl` Map with `Marker` per driver, props: `drivers: DriverLocation[]`, `onDriverClick`

- [ ] **2-D-11** `src/components/maps/location-picker.tsx`
  - `react-map-gl` Map where user clicks anywhere to place a pin
  - Props: `value: { lat: number; lng: number; label?: string } | null`, `onChange(coords: { lat, lng, label }): void`, `placeholder?: string`
  - On click → place a draggable `Marker` at the clicked coordinate
  - Marker is draggable: on `dragend` → call `onChange` with new coordinates
  - Shows a text overlay of the selected coordinate (lat, lng) below the map
  - Optional: reverse-geocode the coordinate using Mapbox API to populate `label`; if token is absent, skip geocoding and show raw coordinates only
  - Used inside `TripForm` to set `originLat/Lng` and `destinationLat/Lng`

---

### 2-E  Auth Feature

- [ ] **2-E-1** `src/features/auth/types.ts` — `LoginPayload`, `AuthResponse`, `CurrentUser`
- [ ] **2-E-2** `src/app/(auth)/sign-in/page.tsx` — `react-hook-form` + `zod` schema (`email`, `password`), calls `authStore.login()`, redirects to `/` on success, shows error toast on failure

---

### 2-F  Companies Feature

- [ ] **2-F-1** `src/features/companies/types.ts`
- [ ] **2-F-2** `src/features/companies/api.ts` — `getCompanies(query)`, `getCompany(id)`, `createCompany(dto)`, `updateCompany(id, dto)`, `deleteCompany(id)`
- [ ] **2-F-3** `src/features/companies/queries.ts` — `useCompanies(query)`, `useCompany(id)`, `useCreateCompany()`, `useUpdateCompany()`, `useDeleteCompany()`
- [ ] **2-F-4** `src/features/companies/components/CompanyTable.tsx` — sortable columns: name, email, phone, status badge, edit/delete actions
- [ ] **2-F-5** `src/features/companies/components/CompanyForm.tsx` — create/edit form in a `<Modal>`
- [ ] **2-F-6** `src/app/(dashboard)/companies/page.tsx` — search bar, create button, `<CompanyTable>` with pagination

---

### 2-G  Drivers Feature

- [ ] **2-G-1** `src/features/drivers/types.ts`
- [ ] **2-G-2** `src/features/drivers/api.ts`
- [ ] **2-G-3** `src/features/drivers/queries.ts`
- [ ] **2-G-4** `src/features/drivers/components/DriverTable.tsx` — columns: name, phone, license, company, status, last-seen badge
- [ ] **2-G-5** `src/features/drivers/components/DriverForm.tsx`
- [ ] **2-G-6** `src/app/(dashboard)/drivers/page.tsx`

---

### 2-H  Trucks Feature

- [ ] **2-H-1** `src/features/trucks/types.ts`
- [ ] **2-H-2** `src/features/trucks/api.ts`
- [ ] **2-H-3** `src/features/trucks/queries.ts`
- [ ] **2-H-4** `src/features/trucks/components/TruckTable.tsx` — columns: plate, brand, model, year, capacity, company, status
- [ ] **2-H-5** `src/features/trucks/components/TruckForm.tsx`
- [ ] **2-H-6** `src/app/(dashboard)/trucks/page.tsx`

---

### 2-I  Trips Feature

- [ ] **2-I-1** `src/features/trips/types.ts`
- [ ] **2-I-2** `src/features/trips/api.ts`
- [ ] **2-I-3** `src/features/trips/queries.ts`
- [ ] **2-I-4** `src/features/trips/components/TripTable.tsx` — columns: origin→destination, driver, truck, status badge, scheduled date
- [ ] **2-I-5** `src/features/trips/components/TripForm.tsx`
  - Fields: driver select (from `useDrivers`), truck select (from `useTrucks`), `scheduledAt` date-time picker, notes textarea
  - **Origin section:** text input for address label + `<LocationPicker>` map below it; coordinates stored in hidden fields `originLat`, `originLng`
  - **Destination section:** same pattern as origin — text input label + `<LocationPicker>` map; stores `destinationLat`, `destinationLng`
  - Both `LocationPicker` instances are independent with their own pin
  - Validation with `zod`: `originLat` and `destinationLat` must be valid numbers (not null) before form can submit
- [ ] **2-I-6** `src/app/(dashboard)/trips/page.tsx` — filter by status + date range

---

### 2-J  Tracking Feature

- [ ] **2-J-1** `src/features/tracking/types.ts`
  ```typescript
  interface LiveDriver {
    driverId: string;
    driverName: string;
    lat: number;
    lng: number;
    speedKmh: number | null;
    heading: number | null;
    isOnline: boolean;
    lastSeenAt: string;
    tripId: string | null;       // null if driver is online but not in a trip
    tripStatus: TripStatus | null;
  }
  interface LocationUpdate {
    driverId: string;
    tripId: string | null;
    lat: number;
    lng: number;
    speedKmh: number | null;
    heading: number | null;
    accuracyM: number | null;
    recordedAt: string;
  }
  ```

- [ ] **2-J-2** `src/features/tracking/api.ts`
  - `getLiveLocations(companyId)` → `GET /tracking/live?companyId=` — online drivers only
  - `getAllTruckPositions(companyId)` → `GET /tracking/fleet?companyId=` — last known position of all active drivers
  - `getDriverHistory(driverId, from, to)` → `GET /tracking/driver/:driverId?from=&to=`

- [ ] **2-J-3** `src/features/tracking/queries.ts` — `useLiveLocations(companyId)`, `useFleetPositions(companyId)`, `useDriverHistory`

- [ ] **2-J-4** `src/features/tracking/hooks/useRealtimeTracking.ts`
  - On mount: `realtimeClient.connect(token)`, `realtimeClient.subscribeToCompany(companyId)`
  - `realtimeClient.onDriverLocation()` → upsert into local map `{ [driverId]: LocationUpdate }`
  - `realtimeClient.onOnlineChanged()` → update `isOnline` flag on the relevant driver in local state
  - On unmount: `realtimeClient.disconnect()`

- [ ] **2-J-5** `src/app/(dashboard)/tracking/page.tsx`
  - **Toolbar:** toggle between "Live Only" (online drivers) and "Fleet Overview" (all trucks last known position)
  - **Left sidebar:** driver list with:
    - Green dot = online + in trip
    - Yellow dot = online, no active trip (standalone tracking)
    - Grey dot = offline (only shown in fleet overview mode)
    - Shows driver name, truck plate, speed (if available), last update time
  - **Main map:** `<DriverMap>` fed from merged initial REST data + realtime WebSocket updates
    - Online drivers: animated pulsing marker
    - Offline drivers (fleet mode only): grey static marker showing last known position
    - Click any marker → right panel shows: driver name, truck plate, speed, coordinates, trip info (or "No active trip"), last seen timestamp
  - Real-time updates arrive via `useRealtimeTracking` without page reload

---

### 2-K  Alerts Feature

- [ ] **2-K-1** `src/features/alerts/types.ts`
- [ ] **2-K-2** `src/features/alerts/api.ts`
- [ ] **2-K-3** `src/features/alerts/queries.ts`
- [ ] **2-K-4** `src/features/alerts/components/AlertList.tsx` — severity-colored rows, `isRead` dimming, mark-read button
- [ ] **2-K-5** `src/app/(dashboard)/alerts/page.tsx` — filter by type, severity, read status

---

### 2-L  Reports Feature

- [ ] **2-L-1** `src/features/reports/types.ts`
- [ ] **2-L-2** `src/features/reports/api.ts`
- [ ] **2-L-3** `src/features/reports/queries.ts`
- [ ] **2-L-4** `src/features/reports/components/SummaryCards.tsx` — 4 `<Stat>` cards: total trips, completed, active drivers, active trucks
- [ ] **2-L-5** `src/features/reports/components/TripsChart.tsx` — `recharts` LineChart, trips over time
- [ ] **2-L-6** `src/features/reports/components/AlertsChart.tsx` — BarChart, alerts by type
- [ ] **2-L-7** `src/app/(dashboard)/reports/page.tsx` — date range picker, company selector, all charts

---

### 2-M  i18n Setup (Dashboard)

- [ ] **2-M-1** Install `next-intl`
  ```bash
  cd dashboard-trans-allal
  npm install next-intl
  ```

- [ ] **2-M-2** Configure `next-intl` in `next.config.ts`
  - Enable `createNextIntlPlugin` wrapper
  - Supported locales: `['ar', 'en']`, default locale: `'ar'`

- [ ] **2-M-3** Create `src/i18n/request.ts` — `next-intl` server-side config
  - Read locale from cookie `NEXT_LOCALE` (fallback: `'ar'`)
  - Load messages from `messages/<locale>/<namespace>.json`

- [ ] **2-M-4** Create translation files for all namespaces:
  - `messages/ar/common.json` + `messages/en/common.json`
    ```json
    {
      "save": "Save / حفظ",
      "cancel": "Cancel / إلغاء",
      "delete": "Delete / حذف",
      "edit": "Edit / تعديل",
      "create": "Create / إنشاء",
      "search": "Search / بحث",
      "loading": "Loading… / جارٍ التحميل…",
      "no_data": "No data available / لا توجد بيانات",
      "confirm_delete": "Are you sure you want to delete? / هل أنت متأكد من الحذف؟",
      "status": {
        "PENDING": "Pending / قيد الانتظار",
        "IN_PROGRESS": "In Progress / جارٍ التنفيذ",
        "COMPLETED": "Completed / مكتمل",
        "CANCELLED": "Cancelled / ملغى",
        "active": "Active / نشط",
        "inactive": "Inactive / غير نشط"
      },
      "severity": {
        "LOW": "Low / منخفض",
        "MEDIUM": "Medium / متوسط",
        "HIGH": "High / عالٍ",
        "CRITICAL": "Critical / حرج"
      }
    }
    ```
  - `messages/ar/auth.json` + `messages/en/auth.json`
  - `messages/ar/companies.json` + `messages/en/companies.json`
  - `messages/ar/drivers.json` + `messages/en/drivers.json`
  - `messages/ar/trucks.json` + `messages/en/trucks.json`
  - `messages/ar/trips.json` + `messages/en/trips.json`
  - `messages/ar/tracking.json` + `messages/en/tracking.json`
  - `messages/ar/alerts.json` + `messages/en/alerts.json`
  - `messages/ar/reports.json` + `messages/en/reports.json`
  - `messages/ar/settings.json` + `messages/en/settings.json`

- [ ] **2-M-5** Update root `src/app/layout.tsx`
  - Set `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` dynamically
  - Import and load `next-intl`'s `NextIntlClientProvider`

- [ ] **2-M-6** Add font support for Arabic
  - Load `Noto Sans Arabic` (Google Fonts or local) for `dir="rtl"`
  - Load `Inter` for `dir="ltr"`
  - Apply via Tailwind `fontFamily` config — `font-sans` resolves to the correct font based on direction

- [ ] **2-M-7** `src/components/layout/language-switcher.tsx`
  - Toggle button: shows "العربية" when current locale is `en`, shows "English" when current locale is `ar`
  - On click: set cookie `NEXT_LOCALE=<new>`, call `router.refresh()` to re-render with new locale
  - Place inside `topbar.tsx` next to user avatar

- [ ] **2-M-8** Apply RTL-aware Tailwind classes to all shared components built in `2-D`:
  - `button.tsx`: padding direction, icon placement
  - `input.tsx`: `text-start` instead of `text-left`, error message alignment
  - `modal.tsx`: header and footer alignment
  - `table.tsx`: header alignment, action column position
  - `sidebar.tsx`: icon and label order, active indicator position
  - `topbar.tsx`: user menu side, logo position
  - Rule: use `rtl:` Tailwind variants, never duplicate a component for each direction

- [ ] **2-M-9** Replace all hardcoded UI strings in every feature page and component built in sections `2-E` through `2-L` with `useTranslations('<namespace>')` hook calls

---

### 2-N  Overview + Settings

- [ ] **2-N-1** Keep `/` as the only overview route:
  - `src/features/overview/overview-page.tsx` becomes the real overview implementation
  - `src/app/(dashboard)/page.tsx` remains the thin route entry for that overview
  - do **not** add a competing `src/app/(dashboard)/overview/page.tsx` route
- [ ] **2-N-2** `src/app/(dashboard)/settings/page.tsx` — form to update current user profile (firstName, lastName, email, password change) + language preference selector (AR / EN)

---

### 2-O  Dashboard Verification

- [ ] **2-O-1** `npm run build` — zero TypeScript errors
- [ ] **2-O-2** `npm run dev` — dev server starts on port 3001
- [ ] **2-O-3** Navigate to `/sign-in` → login → redirect to `/` works
- [ ] **2-O-4** Navigate to `/companies` → table loads with real data from backend
- [ ] **2-O-5** Navigate to `/tracking` → map renders with markers, live updates arrive via WebSocket
- [ ] **2-O-6** Click language switcher → page re-renders in Arabic with `dir="rtl"` and mirrored layout; switch back to English → `dir="ltr"` restores correctly
- [ ] **2-O-7** Inspect `<html>` tag in DevTools — `dir` and `lang` attributes match active locale

---

## Phase 3 — Mobile App (`app-trans-allal`)

### 3-A  Install Dependencies

- [ ] **3-A-1** Install secure storage + location
  ```bash
  cd app-trans-allal
  npx expo install expo-secure-store expo-location expo-task-manager
  ```

- [ ] **3-A-2** Install maps + networking
  ```bash
  npx expo install react-native-maps
  npm install socket.io-client zustand
  npm install react-hook-form @hookform/resolvers zod
  npx expo install @react-native-community/netinfo
  npm install @react-native-async-storage/async-storage
  ```

---

### 3-B  Environment Setup

- [ ] **3-B-1** Create `app-trans-allal/.env` from the existing `.env.example` and keep these contract values aligned:
  ```env
  EXPO_PUBLIC_APP_NAME=Trans Allal Driver
  EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
  EXPO_PUBLIC_WS_URL=ws://localhost:3002/tracking
  EXPO_PUBLIC_MAP_PROVIDER=mapbox
  EXPO_PUBLIC_MAPBOX_TOKEN=
  EXPO_PUBLIC_ENV=development
  EXPO_PUBLIC_AUTH_STORAGE_KEY=trans-allal-driver-token
  ```
  > For physical device testing, replace only the host with your LAN IP while preserving `/api/v1` and `/tracking`.

---

### 3-C  Foundation

- [ ] **3-C-1** `src/services/api/client.ts`
  - Expand the existing fetch-based client; do not replace it with Axios unless this is an explicit refactor decision
  - Base URL = `EXPO_PUBLIC_API_BASE_URL`
  - Read Bearer token from the auth store / token storage boundary
  - Parse the shared API envelope and normalize shared error responses
  - On 401 → refresh → retry once; on failure → logout

- [ ] **3-C-2** `src/services/api/endpoints.ts` — same endpoint constants as dashboard, adapted for mobile paths

- [ ] **3-C-3** Expand `src/services/storage/token-storage.ts` from the in-memory placeholder to a SecureStore-backed adapter
- [ ] **3-C-4** `src/store/auth.store.ts` (Zustand)
  - State: `accessToken`, `refreshToken`, `driver: DriverProfile | null`, `isLoading`
  - Actions: `login(phone, password)`, `logout()`, `refresh()`, `hydrate()`
  - Persist auth data through the existing `token-storage.ts` boundary backed by `expo-secure-store`
  - Do not use AsyncStorage for auth tokens

- [ ] **3-C-5** `src/services/api/realtime-client.ts`
  - Class `MobileRealtimeClient` with: `connect(token)`, `sendLocation(payload)`, `onAlert(cb)`, `disconnect()`, `isConnected()`
  - Uses `socket.io-client`
  - Connect to `ws://localhost:3002/tracking` and send auth via `auth.token`
  - Use the locked event names from the shared WebSocket contract
  - Export singleton `realtimeClient`

- [ ] **3-C-6** `src/services/connectivity/connectivity.service.ts`
  - Watch online/offline state via `@react-native-community/netinfo`
  - Export `useIsOnline()` hook
  - Manage `offlineQueue: LocationPayload[]`
  - Persist the queue via `@react-native-async-storage/async-storage`
  - `flushQueue()` → send buffered locations to backend in order on reconnect

---

### 3-D  Location Service

- [ ] **3-D-1** Expand the existing `src/services/permissions/location-permissions.service.ts`
  - `requestPermissions()` → foreground + background permissions; return `boolean`
  - centralize all permission prompts here instead of scattering permission calls across screens/hooks

- [ ] **3-D-2** Expand the existing `src/services/location/location-tracker.service.ts`
  - `getCurrentPosition()` → return `{ lat, lng, accuracy }`
  - `startWatching(callback, intervalMs = 10_000)` → `Location.watchPositionAsync`
  - `stopWatching()` → remove foreground subscription
  - register the TaskManager location task for background tracking
  - expose `startBackgroundTracking()` and `stopBackgroundTracking()`
  - only extract a separate helper file if this service becomes too large; do not introduce a parallel location baseline up front

---

### 3-E  Auth Feature (Mobile)

- [ ] **3-E-1** `src/features/auth/auth.api.ts` — `loginDriver(phone, password)`, `refreshTokens(refreshToken)`
- [ ] **3-E-2** `src/app/_layout.tsx` — call `authStore.hydrate()` before rendering, show `SplashScreen` while loading
- [ ] **3-E-3** `src/app/index.tsx` — redirect to `/(driver)/(tabs)` if authenticated, else `/(auth)/sign-in`
- [ ] **3-E-4** Keep route files thin:
  - `src/screens/auth/sign-in-screen.tsx` implements the phone/password form
  - `src/app/(auth)/sign-in.tsx` remains a thin route wrapper around that screen
  - Phone + password form with `react-hook-form` + `zod`
  - Shows validation errors inline
  - On success → navigate to `/(driver)/(tabs)`
  - On error → show error message below form

---

### 3-F  Trip Feature (Mobile)

- [ ] **3-F-1** `src/features/trip/trip.api.ts` — `getMyTrips()`, `getTripById(id)`, `updateTripStatus(id, status)`
- [ ] **3-F-2** `src/features/trip/components/TripCard.tsx`
  - Shows: status badge, origin → destination, scheduled time
  - Tappable within the trip tab workspace
- [ ] **3-F-3** Keep the current routing structure:
  - `src/screens/trip/trip-screen.tsx` becomes the primary trip workspace for list + active trip details/actions
  - `src/app/(driver)/(tabs)/trip.tsx` remains the thin route wrapper around that screen
- [ ] **3-F-4** Trip actions in `trip-screen.tsx`
  - Show trip details: driver, truck, origin, destination, status, notes
  - Action buttons based on status:
    - `PENDING` → "Start Trip" → `updateTripStatus(id, IN_PROGRESS)` → start location tracking
    - `IN_PROGRESS` → "Complete Trip" → `updateTripStatus(id, COMPLETED)` → stop tracking
    - `COMPLETED` / `CANCELLED` → read-only view

---

### 3-G  Tracking Feature (Mobile)

- [ ] **3-G-1** `src/features/tracking/hooks/useLocationTracking.ts`
  - Props: `tripId: string | null`, `mode: 'trip' | 'standalone'`
  - When activated (either mode):
    1. Request permissions (foreground + background)
    2. Call `POST /tracking/session/start` → backend sets `driver.isOnline = true`
    3. Connect WebSocket: `realtimeClient.connect(token)`
    4. Start watching position every 10 seconds
  - Each position update:
    - Build payload `{ lat, lng, speedKmh, heading, accuracyM, tripId: tripId ?? undefined }`
    - If online → `realtimeClient.sendLocation(payload)`
    - If offline → push to `offlineQueue`
  - When deactivated:
    1. Stop location watcher + background task
    2. Call `POST /tracking/session/stop` → backend sets `driver.isOnline = false`
    3. `realtimeClient.disconnect()`
    4. `connectivityService.flushQueue()`

- [ ] **3-G-2** Keep route files thin:
  - `src/screens/tracking/tracking-screen.tsx` implements the map and tracking UI
  - `src/app/(driver)/(tabs)/tracking.tsx` remains the thin route wrapper
  - `MapView` (react-native-maps) centered on current driver position
  - Blue dot for current position, polyline for route traveled **during current session**
  - Speed, heading, accuracy shown in a bottom overlay card
  - **Standalone Tracking Toggle:** a prominent "Go Online" / "Go Offline" button at the top of the screen
    - "Go Online" → calls `useLocationTracking` with `mode: 'standalone'`, `tripId: null`
    - While online: button turns red "Go Offline" + pulsing indicator
    - "Go Offline" → deactivates tracking
  - **Trip tracking:** when a trip is `IN_PROGRESS`, tracking activates automatically with `mode: 'trip'` and the toggle button is hidden/disabled

- [ ] **3-G-3** `src/screens/trip/location-picker-screen.tsx`
  - Full-screen `MapView` (react-native-maps)
  - On mount: center map on driver's current GPS position
  - User taps anywhere on map → place a draggable `Marker` at that coordinate
  - Draggable: user can drag the marker to fine-tune position
  - Bottom sheet shows: selected `lat`, `lng` with 6 decimal precision
  - Two buttons: "Confirm" → calls navigation `goBack()` passing `{ lat, lng }` as params; "Reset" → removes pin
  - Used from the trip creation/edit flow when admin sets origin or destination:
    - `src/app/(driver)/trip/location-picker.tsx` — route wrapper
    - Navigates to this screen from `TripForm` or trip detail when editing coordinates

---

### 3-H  Driver Profile Feature

- [ ] **3-H-1** `src/features/driver/driver.api.ts` — `getProfile()`, `updateProfile(dto)`
- [ ] **3-H-2** Keep route files thin:
  - `src/screens/profile/profile-screen.tsx` displays and edits the driver profile
  - `src/app/(driver)/(tabs)/profile.tsx` remains the thin route wrapper

---

### 3-I  Settings + Navigation

- [ ] **3-I-1** Keep the existing routing boundaries:
  - `src/app/(driver)/_layout.tsx` remains the protected driver area boundary
  - `src/app/(driver)/(tabs)/_layout.tsx` remains the tab navigator
  - Tabs stay: Home (`index.tsx`), Trip (`trip.tsx`), Tracking (`tracking.tsx`), Profile (`profile.tsx`)
  - `src/app/(driver)/settings.tsx` remains the non-tab settings route

- [ ] **3-I-2** `src/screens/home/home-screen.tsx`
  - **Online status bar** at the top: green "You are Online" / grey "You are Offline" — tapping it navigates to the Tracking tab
  - Active trip card (if any trip is `IN_PROGRESS`) — shows origin, destination, elapsed time
  - If no active trip but driver is online (standalone tracking): show "Tracking Active — No Trip" card with a "Go Offline" shortcut button
  - Quick stats: completed trips this week
  - Quick action: view all trips button
  - `src/app/(driver)/(tabs)/index.tsx` remains the thin route wrapper

- [ ] **3-I-3** `src/screens/settings/settings-screen.tsx`
  - App version, logout button, clear cache option
  - `src/app/(driver)/settings.tsx` remains the thin route wrapper

---

### 3-J  i18n Setup (Mobile)

- [ ] **3-J-1** Install i18n packages
  ```bash
  cd app-trans-allal
  npx expo install expo-localization
  npm install i18next react-i18next
  npm install @react-native-async-storage/async-storage
  ```

- [ ] **3-J-2** Create translation files
  - `src/locales/ar.json` — Arabic strings (default)
  - `src/locales/en.json` — English strings
  - Both files share identical key structure:
    ```json
    {
      "common": {
        "save": "...", "cancel": "...", "loading": "...", "no_data": "...",
        "go_online": "...", "go_offline": "...", "confirm": "...", "reset": "..."
      },
      "auth": { "sign_in": "...", "phone": "...", "password": "...", "login_button": "..." },
      "trip": {
        "my_trips": "...", "start_trip": "...", "complete_trip": "...",
        "origin": "...", "destination": "...", "scheduled_at": "...",
        "status": { "PENDING": "...", "IN_PROGRESS": "...", "COMPLETED": "...", "CANCELLED": "..." }
      },
      "tracking": { "tracking_active": "...", "no_active_trip": "...", "speed": "...", "heading": "..." },
      "profile": { "title": "...", "edit": "...", "logout": "..." },
      "settings": { "title": "...", "language": "...", "version": "...", "clear_cache": "..." }
    }
    ```

- [ ] **3-J-3** `src/lib/i18n.ts` — initialize `i18next`
  ```typescript
  import i18n from 'i18next';
  import { initReactI18next } from 'react-i18next';
  import * as Localization from 'expo-localization';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import en from '../locales/en.json';
  import ar from '../locales/ar.json';

  const LANGUAGE_KEY = 'ta_language';

  export async function initI18n() {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'ar';
    const lng = saved ?? (deviceLang === 'ar' ? 'ar' : 'en');

    await i18n.use(initReactI18next).init({
      lng,
      fallbackLng: 'ar',
      resources: { en: { translation: en }, ar: { translation: ar } },
      interpolation: { escapeValue: false },
    });
  }

  export async function changeLanguage(lang: 'ar' | 'en') {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
    // RTL is handled in the call site — see 3-J-4
  }

  export default i18n;
  ```

- [ ] **3-J-4** RTL handling in `src/app/_layout.tsx`
  - Call `await initI18n()` before rendering (inside the existing `hydrate` logic)
  - After i18n is initialized:
    ```typescript
    import { I18nManager } from 'react-native';
    const isRTL = i18n.language === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      // RN requires a full reload to apply RTL — trigger via expo-updates or warn user
    }
    ```
  - Wrap app with `<I18nextProvider i18n={i18n}>`

- [ ] **3-J-5** Language switcher in `src/screens/settings/settings-screen.tsx`
  - Two radio/toggle buttons: "العربية" and "English"
  - On select: call `changeLanguage(lang)` → show a confirmation dialog: "الرجاء إعادة تشغيل التطبيق لتطبيق اللغة / Please restart the app to apply the language change"
  - This is standard React Native behavior — a full restart is required for RTL changes

- [ ] **3-J-6** Replace all hardcoded strings in every screen built in sections `3-E` through `3-I` with `useTranslation()` hook calls
  ```typescript
  const { t } = useTranslation();
  // Usage: t('trip.start_trip')
  ```

- [ ] **3-J-7** RTL-safe styles — audit all screens and components:
  - No `left`/`right` in `StyleSheet` — use `start`/`end` or let flexbox mirror automatically
  - Icons that indicate direction (arrows, chevrons) must flip: wrap them with a `scaleX: I18nManager.isRTL ? -1 : 1` transform

---

### 3-K  Offline Buffering

- [ ] **3-K-1** In `connectivity.service.ts`: implement `offlineQueue` as array in module scope, persisted to `AsyncStorage` with key `ta_offline_queue`
- [ ] **3-K-2** On network reconnect: `flushQueue()` → iterate queue, POST each location to `POST /tracking/location`, clear queue on success

---

### 3-L  Mobile Verification

- [ ] **3-L-1** `npm run typecheck` — zero TypeScript errors
- [ ] **3-L-2** `npm run start` — Expo dev server starts
- [ ] **3-L-3** Sign-in with valid driver phone/password → navigates to home
- [ ] **3-L-4** View trips list → tap a trip → start trip → location updates appear in dashboard map
- [ ] **3-L-5** Open Settings → switch to English → confirm dialog appears → restart app → UI renders in English LTR
- [ ] **3-L-6** Switch back to Arabic → restart → UI renders in Arabic RTL, all text right-aligned, icons mirrored

---

## Phase 4 — End-to-End Integration & Polish

### 4-A  Full Flow Test

- [ ] **4-A-1** Driver logs in on mobile → token stored in SecureStore
- [ ] **4-A-2** Driver starts a trip → status changes to `IN_PROGRESS` in backend
- [ ] **4-A-3** Mobile sends location every 10 seconds via WebSocket
- [ ] **4-A-4** Dashboard tracking page "Live Only" mode shows driver marker moving in real time
- [ ] **4-A-5** Driver speed exceeds 120 km/h → alert appears in dashboard alerts page
- [ ] **4-A-6** Dashboard marks alert as read → `isRead` updated in DB
- [ ] **4-A-7** Standalone tracking: driver taps "Go Online" (no trip active) → dashboard "Fleet Overview" mode shows driver marker; driver taps "Go Offline" → marker goes grey
- [ ] **4-A-8** Fleet overview mode: dashboard shows last known position of ALL active drivers, including those currently offline
- [ ] **4-A-9** Trip creation on dashboard: admin clicks map to set origin pin → drags it to adjust → saves; same for destination; `originLat/Lng` and `destinationLat/Lng` stored correctly in DB
- [ ] **4-A-10** Mobile location picker: tapping "Set Location" opens full-screen map → driver taps to pin → confirms → coordinates passed back to trip form correctly

### 4-B  Error States

- [ ] **4-B-1** All dashboard tables show proper empty state when no data
- [ ] **4-B-2** All dashboard tables show error state when API fails
- [ ] **4-B-3** Loading skeletons shown while data is fetching
- [ ] **4-B-4** Mobile shows offline banner when no internet
- [ ] **4-B-5** Token expiry handled: refresh fires transparently, user not logged out

### 4-C  Token Refresh Flow

- [ ] **4-C-1** Backend: access token expires in 15 minutes — verified via `JWT_EXPIRES_IN`
- [ ] **4-C-2** Dashboard: interceptor catches 401, calls `/auth/refresh`, retries original request — tested manually
- [ ] **4-C-3** Mobile: same interceptor logic works on device

### 4-D  i18n Completeness Check

- [ ] **4-D-1** Dashboard: `npm run build` emits zero `missing translation key` warnings
- [ ] **4-D-2** Dashboard: switch to Arabic → every visible string is translated — no English text leaking in RTL mode
- [ ] **4-D-3** Dashboard: switch to Arabic → sidebar, header, tables, forms, modals, toasts all mirror correctly (no broken layouts)
- [ ] **4-D-4** Mobile: `npm run typecheck` passes
- [ ] **4-D-5** Mobile: run in Arabic → all screens show Arabic text, RTL layout, mirrored icons
- [ ] **4-D-6** Mobile: run in English → all screens show English text, LTR layout

### 4-E  Final Build Check

- [ ] **4-E-1** `cd backend-trans-allal && npm run build` — passes
- [ ] **4-E-2** `cd dashboard-trans-allal && npm run build` — passes
- [ ] **4-E-3** `cd app-trans-allal && npm run typecheck` — passes

---

*Last updated: 2026-04-12 | Version 2.3 — Arabic/English i18n + RTL Support*
