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
├── backend-trans-allal/      NestJS 11 + TypeScript + PostgreSQL + Redis
├── dashboard-trans-allal/    Next.js 16 App Router + React 19 + Tailwind v4
└── app-trans-allal/          Expo 54 + React Native + Expo Router
```

---

## Shared Reference (read before coding — do not check off)

### REST API Base
- **URL:** `http://localhost:3000/api/v1`
- **Auth header:** `Authorization: Bearer <access_token>`
- **All responses shape:** `{ data, meta?, error? }`

### WebSocket
- **Namespace:** `/ws/tracking`
- **Auth:** token passed in socket handshake query `?token=`

| Direction | Event | Payload |
|-----------|-------|---------|
| Client→Server | `driver:location` | `{ lat, lng, speed_kmh, heading, accuracy_m, trip_id? }` |
| Server→Client | `driver:location:update` | `{ driverId, lat, lng, speed_kmh, heading, timestamp }` |
| Server→Client | `alert:new` | `{ alertId, type, severity, message, driverId, tripId }` |
| Client→Server | `subscribe:company` | `{ companyId }` |
| Client→Server | `subscribe:driver` | `{ driverId }` |

### Enums (use in both backend and frontend — no magic strings)
```
Role:       SUPER_ADMIN | COMPANY_ADMIN | DISPATCHER
TripStatus: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
AlertType:  SPEEDING | GEOFENCE_EXIT | IDLE | SOS | ROUTE_DEVIATION
Severity:   LOW | MEDIUM | HIGH | CRITICAL
```

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
  npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
  npm install -D @types/passport-jwt @types/passport-local @types/bcrypt
  ```

- [ ] **1-A-3** Install Cache + WebSocket packages
  ```bash
  npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet ioredis
  npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
  npm install -D @types/socket.io
  ```

- [ ] **1-A-4** Install utilities
  ```bash
  npm install uuid
  npm install -D @types/uuid
  ```

---

### 1-B  Environment Setup

- [ ] **1-B-1** Create `backend-trans-allal/.env` from `.env.example` with these values:
  ```env
  PORT=3000
  APP_NAME=TransAllal API
  APP_ENV=development
  APP_URL=http://localhost:3000
  API_PREFIX=api/v1
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trans_allal
  JWT_SECRET=change_me_32chars_minimum_secret_key
  JWT_EXPIRES_IN=15m
  JWT_REFRESH_SECRET=change_me_refresh_secret_key_32ch
  JWT_REFRESH_EXPIRES_IN=7d
  REDIS_HOST=localhost
  REDIS_PORT=6379
  CORS_ORIGIN=http://localhost:3001
  WS_PORT=3000
  ```

---

### 1-C  Database Configuration

- [ ] **1-C-1** Create `src/config/database/index.ts`
  ```typescript
  import { registerAs } from '@nestjs/config';
  export default registerAs('database', () => ({
    url: process.env.DATABASE_URL,
  }));
  ```

- [ ] **1-C-2** Create `src/config/database/typeorm.config.ts`
  ```typescript
  import { TypeOrmModuleOptions } from '@nestjs/typeorm';
  import { ConfigService } from '@nestjs/config';

  export const typeOrmConfig = (config: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: config.get<string>('database.url'),
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
    synchronize: config.get('app.env') === 'development',
    logging: config.get('app.env') === 'development',
    ssl: config.get('app.env') === 'production' ? { rejectUnauthorized: false } : false,
  });
  ```

- [ ] **1-C-3** Register `databaseConfig` in `app.module.ts` and add `TypeOrmModule.forRootAsync({ useFactory: typeOrmConfig, inject: [ConfigService] })`.

---

### 1-D  Entities

> Rule: plain class + TypeORM decorators. Use `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn()`, `@UpdateDateColumn()`. Add all relationships as TypeORM `@ManyToOne` / `@OneToMany`.

- [ ] **1-D-1** `src/modules/admin-business/companies/company.entity.ts`
  Fields: `id`, `name`, `taxId`, `phone`, `email`, `address`, `isActive`, `createdAt`, `updatedAt`

- [ ] **1-D-2** `src/modules/admin-business/users/user.entity.ts`
  Fields: `id`, `companyId`, `email`, `password` (excluded from selects via `select: false`), `firstName`, `lastName`, `role` (enum Role), `isActive`, `createdAt`, `updatedAt`
  Relations: `@ManyToOne(() => Company)`

- [ ] **1-D-3** `src/modules/admin-business/drivers/driver.entity.ts`
  Fields: `id`, `companyId`, `firstName`, `lastName`, `phone`, `licenseNumber`, `licenseExpiry`, `isActive`, `createdAt`, `updatedAt`
  Relations: `@ManyToOne(() => Company)`

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
  Fields: `id`, `userId` (nullable), `driverId` (nullable), `tokenHash`, `expiresAt`, `createdAt`
  Relations: `@ManyToOne(() => User)`, `@ManyToOne(() => Driver)`

---

### 1-E  Common Utilities

- [ ] **1-E-1** `src/common/enums/role.enum.ts` — export `enum Role { SUPER_ADMIN, COMPANY_ADMIN, DISPATCHER }`
- [ ] **1-E-2** `src/common/enums/trip-status.enum.ts` — export `enum TripStatus { PENDING, IN_PROGRESS, COMPLETED, CANCELLED }`
- [ ] **1-E-3** `src/common/enums/alert.enum.ts` — export `enum AlertType` and `enum Severity`
- [ ] **1-E-4** `src/common/decorators/roles.decorator.ts` — `@Roles(...roles: Role[])` using `SetMetadata`
- [ ] **1-E-5** `src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` that extracts `req.user`
- [ ] **1-E-6** `src/common/guards/jwt-auth.guard.ts` — extends `AuthGuard('jwt')`
- [ ] **1-E-7** `src/common/guards/roles.guard.ts` — implements `CanActivate`, reads `@Roles()` metadata, checks `req.user.role`
- [ ] **1-E-8** `src/common/filters/http-exception.filter.ts` — global filter, returns `{ error: { code, message, details } }`
- [ ] **1-E-9** `src/common/dto/pagination-query.dto.ts` — `page: number` (default 1), `limit: number` (default 20, max 100), both validated with `class-validator`
- [ ] **1-E-10** Register `HttpExceptionFilter` as global filter in `bootstrap.ts`. Verify `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` is already enabled.

---

### 1-F  Auth Module

- [ ] **1-F-1** `src/modules/auth/strategies/jwt.strategy.ts`
  - Extends `PassportStrategy(Strategy, 'jwt')`
  - Extracts Bearer from header
  - Validates payload `{ sub, role, companyId }` → returns user-like object

- [ ] **1-F-2** `src/modules/auth/strategies/jwt-refresh.strategy.ts`
  - Reads `refreshToken` from request body
  - Verifies token exists and is not expired in `refresh_tokens` table
  - Returns driver or user payload

- [ ] **1-F-3** `src/modules/auth/strategies/driver-local.strategy.ts`
  - Extends `PassportStrategy(Strategy, 'driver-local')`
  - Validates phone + password for driver login

- [ ] **1-F-4** `src/modules/auth/auth.service.ts` — implement methods:
  - `loginUser(email, password)` → find user, verify bcrypt, call `generateTokenPair`, store hashed refresh token
  - `loginDriver(phone, password)` → same flow for driver
  - `refresh(refreshToken)` → verify hash in DB, rotate both tokens, update DB record
  - `logout(refreshToken)` → delete record from `refresh_tokens`
  - `getMe(userId, type)` → return current user or driver profile
  - `generateTokenPair(payload)` → private, returns `{ accessToken, refreshToken }`

- [ ] **1-F-5** `src/modules/auth/dto/login.dto.ts` — `email: string`, `password: string`, with `@IsEmail()` and `@IsString()`
- [ ] **1-F-6** `src/modules/auth/dto/driver-login.dto.ts` — `phone: string`, `password: string`
- [ ] **1-F-7** `src/modules/auth/dto/refresh.dto.ts` — `refreshToken: string`

- [ ] **1-F-8** `src/modules/auth/auth.controller.ts` — endpoints:
  - `POST /auth/login` → `loginUser`
  - `POST /auth/driver/login` → `loginDriver`
  - `POST /auth/refresh` → `refresh`
  - `POST /auth/logout` → `logout` (requires JWT guard)
  - `GET /auth/me` → `getMe` (requires JWT guard)

- [ ] **1-F-9** `src/modules/auth/auth.module.ts` — import `JwtModule.registerAsync`, `PassportModule`, all strategies, `TypeOrmModule.forFeature([RefreshToken, User, Driver])`

- [ ] **1-F-10** Register `AuthModule` in `app.module.ts`

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

- [ ] **1-H-1** DTOs: `create-user.dto.ts` (includes role, companyId), `update-user.dto.ts`, `query-user.dto.ts`
- [ ] **1-H-2** `users.service.ts` — `findAll`, `findOne`, `create` (hash password with bcrypt), `update`, `softDelete`
- [ ] **1-H-3** `users.controller.ts` — CRUD endpoints, SUPER_ADMIN only
- [ ] **1-H-4** `users.module.ts` — wire and register

---

### 1-I  Drivers Module

- [ ] **1-I-1** DTOs: `create-driver.dto.ts`, `update-driver.dto.ts`, `query-driver.dto.ts` (filter by `companyId`, `isActive`, `search`)
- [ ] **1-I-2** `drivers.service.ts` — `findAll`, `findOne` (include last known location from `driver_locations`), `create` (auto-generate initial password, hash it), `update`, `softDelete`
- [ ] **1-I-3** `drivers.controller.ts` — CRUD endpoints, requires `SUPER_ADMIN` or `COMPANY_ADMIN`
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
  - `getTrackHistory(tripId)` — all `driver_locations` records for trip ordered by `recordedAt`
- [ ] **1-K-3** `trips.controller.ts` — all 6 endpoints including `GET /:id/track`
- [ ] **1-K-4** `trips.module.ts` — wire and register

---

### 1-L  Tracking Module

- [ ] **1-L-1** `src/modules/telemetry/tracking/dto/save-location.dto.ts` — `lat`, `lng`, `speedKmh?`, `heading?`, `accuracyM?`, `tripId?`
- [ ] **1-L-2** `src/modules/telemetry/tracking/dto/query-tracking.dto.ts` — `from: Date`, `to: Date`, both required, ISO string format
- [ ] **1-L-3** `tracking.service.ts`:
  - `saveLocation(driverId, dto)` → insert into `driver_locations`. If `speedKmh > 120` → call `AlertsService.create(SPEEDING alert)`
  - `getLiveLocations(companyId)` → SQL: latest location per driver in company (use subquery or `DISTINCT ON`)
  - `getHistory(driverId, from, to)` → ordered by `recordedAt ASC`
- [ ] **1-L-4** `tracking.controller.ts`:
  - `POST /tracking/location` — driver JWT only, calls `saveLocation`
  - `GET /tracking/live` — dashboard JWT, query param `companyId`
  - `GET /tracking/driver/:driverId` — dashboard JWT
- [ ] **1-L-5** `tracking.module.ts` — wire and register

---

### 1-M  Alerts Module

- [ ] **1-M-1** `src/modules/telemetry/alerts/dto/create-alert.dto.ts` — `companyId`, `driverId?`, `tripId?`, `type`, `severity`, `message`
- [ ] **1-M-2** `src/modules/telemetry/alerts/dto/query-alert.dto.ts` — filter by `companyId`, `type`, `severity`, `isRead`
- [ ] **1-M-3** `alerts.service.ts`:
  - `create(dto)` → save alert, then emit `alert:new` via WebSocket gateway
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
  - `@WebSocketGateway({ namespace: '/ws/tracking', cors: { origin: '*' } })`
  - `handleConnection(client)` → extract `token` from `client.handshake.query`, verify with `JwtService.verify()`, disconnect on invalid
  - `@SubscribeMessage('driver:location')` → call `TrackingService.saveLocation()` → `server.to('driver:' + driverId).emit('driver:location:update', payload)`
  - `@SubscribeMessage('subscribe:company')` → `client.join('company:' + companyId)`
  - `@SubscribeMessage('subscribe:driver')` → `client.join('driver:' + driverId)`
  - Export `emitAlert(alert)` method used by `AlertsService`

- [ ] **1-O-2** `src/websocket/websocket.module.ts` — imports `TrackingModule`, `AlertsModule`, exports gateway

- [ ] **1-O-3** Register `WebsocketModule` in `app.module.ts`

---

### 1-P  Backend Verification

- [ ] **1-P-1** Run `npm run build` — zero TypeScript errors
- [ ] **1-P-2** Run `npm run start:dev` — server starts on port 3000, no runtime errors
- [ ] **1-P-3** `GET http://localhost:3000/api/v1/health` returns `200 OK`
- [ ] **1-P-4** Test auth flow: `POST /auth/login` with valid credentials returns `accessToken` + `refreshToken`
- [ ] **1-P-5** Test protected endpoint: `GET /companies` with Bearer token returns data; without token returns 401

---

## Phase 2 — Dashboard (`dashboard-trans-allal`)

### 2-A  Install Dependencies

- [ ] **2-A-1** Install data fetching + state
  ```bash
  cd dashboard-trans-allal
  npm install @tanstack/react-query axios zustand
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

- [ ] **2-B-1** Create `dashboard-trans-allal/.env.local`:
  ```env
  NEXT_PUBLIC_APP_NAME=Trans Allal Dashboard
  NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
  NEXT_PUBLIC_WS_URL=http://localhost:3000
  NEXT_PUBLIC_MAP_PROVIDER=mapbox
  NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
  NEXT_PUBLIC_AUTH_STORAGE_KEY=ta_auth
  ```

---

### 2-C  Foundation

- [ ] **2-C-1** `src/lib/api/endpoints.ts` — typed constants for every endpoint from Phase 1 API contract
- [ ] **2-C-2** `src/lib/api/client.ts`
  - Axios instance with `baseURL = NEXT_PUBLIC_API_BASE_URL`
  - Request interceptor: read token from auth store → set `Authorization: Bearer`
  - Response interceptor: on 401 → call `POST /auth/refresh` → retry original; on second 401 → `authStore.logout()` + `router.push('/sign-in')`
- [ ] **2-C-3** `src/lib/auth/auth-store.ts` (Zustand)
  - State: `accessToken`, `refreshToken`, `user: CurrentUser | null`
  - Actions: `login(email, password)`, `logout()`, `refresh()`
  - Persist tokens to `localStorage` with key `NEXT_PUBLIC_AUTH_STORAGE_KEY`
- [ ] **2-C-4** `src/lib/query-client.ts` — `new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })`
- [ ] **2-C-5** `src/app/layout.tsx` — wrap with `<QueryClientProvider>`, `<ToastProvider>`, hydrate auth store on mount
- [ ] **2-C-6** `src/lib/realtime/realtime-client.ts`
  - Class `RealtimeClient` with: `connect(token)`, `subscribeToCompany(id)`, `subscribeToDriver(id)`, `onDriverLocation(cb)`, `onAlert(cb)`, `disconnect()`
  - Export singleton `realtimeClient`
- [ ] **2-C-7** `src/components/layout/auth-guard.tsx` — client component, reads auth store, redirects to `/sign-in` if no token
- [ ] **2-C-8** `src/app/(dashboard)/layout.tsx` — wrap content with `<AuthGuard>`, render `<Sidebar>` + `<Header>`

---

### 2-D  Shared UI Components

- [ ] **2-D-1** `src/components/ui/Button.tsx` — props: `variant` (primary/secondary/danger/ghost), `size` (sm/md/lg), `loading?: boolean`, `disabled`, standard HTML button attrs
- [ ] **2-D-2** `src/components/ui/Input.tsx` — props: `label`, `error`, controlled, `type`, standard input attrs
- [ ] **2-D-3** `src/components/ui/Modal.tsx` — Radix `Dialog` wrapper with `title`, `description`, `footer` slot
- [ ] **2-D-4** `src/components/ui/Badge.tsx` — maps status/severity string to color class (green=active/low, yellow=pending/medium, red=cancelled/critical, blue=in-progress)
- [ ] **2-D-5** `src/components/ui/Table.tsx` — props: `columns` (with optional sort), `data`, `loading` (shows skeleton rows), `emptyMessage`
- [ ] **2-D-6** `src/components/ui/Pagination.tsx` — props: `page`, `totalPages`, `onPageChange`
- [ ] **2-D-7** `src/components/ui/Stat.tsx` — KPI card: `icon`, `label`, `value`, `trend?: { value, direction }`
- [ ] **2-D-8** `src/components/layout/Sidebar.tsx` — nav links with icons (from lucide-react), active state highlighted
- [ ] **2-D-9** `src/components/layout/Header.tsx` — app name, user avatar dropdown with logout
- [ ] **2-D-10** `src/components/maps/DriverMap.tsx` — `react-map-gl` Map with `Marker` per driver, props: `drivers: DriverLocation[]`, `onDriverClick`

---

### 2-E  Auth Feature

- [ ] **2-E-1** `src/features/auth/types.ts` — `LoginPayload`, `AuthResponse`, `CurrentUser`
- [ ] **2-E-2** `src/app/(auth)/sign-in/page.tsx` — `react-hook-form` + `zod` schema (`email`, `password`), calls `authStore.login()`, redirects to `/overview` on success, shows error toast on failure

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
- [ ] **2-I-5** `src/features/trips/components/TripForm.tsx` — driver select, truck select, date picker, origin/destination
- [ ] **2-I-6** `src/app/(dashboard)/trips/page.tsx` — filter by status + date range

---

### 2-J  Tracking Feature

- [ ] **2-J-1** `src/features/tracking/types.ts` — `LiveDriver`, `LocationUpdate`
- [ ] **2-J-2** `src/features/tracking/api.ts` — `getLiveLocations(companyId)`, `getDriverHistory(driverId, from, to)`
- [ ] **2-J-3** `src/features/tracking/queries.ts` — `useLiveLocations(companyId)` (initial load), `useDriverHistory`
- [ ] **2-J-4** `src/features/tracking/hooks/useRealtimeTracking.ts`
  - On mount: `realtimeClient.connect(token)`, `realtimeClient.subscribeToCompany(companyId)`
  - `realtimeClient.onDriverLocation()` → update local state map of `{ driverId: LocationUpdate }`
  - On unmount: `realtimeClient.disconnect()`
- [ ] **2-J-5** `src/app/(dashboard)/tracking/page.tsx`
  - Left sidebar: list of active drivers with status indicators
  - Main: `<DriverMap>` fed from merged initial + realtime data
  - Click driver → show info panel with speed, last update time

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

### 2-M  Overview + Settings

- [ ] **2-M-1** `src/app/(dashboard)/overview/page.tsx` — `<SummaryCards>` (last 30 days) + recent 5 trips table + recent 5 alerts list
- [ ] **2-M-2** `src/app/(dashboard)/settings/page.tsx` — form to update current user profile (firstName, lastName, email, password change)

---

### 2-N  Dashboard Verification

- [ ] **2-N-1** `npm run build` — zero TypeScript errors
- [ ] **2-N-2** `npm run dev` — dev server starts on port 3001
- [ ] **2-N-3** Navigate to `/sign-in` → login → redirect to `/overview` works
- [ ] **2-N-4** Navigate to `/companies` → table loads with real data from backend
- [ ] **2-N-5** Navigate to `/tracking` → map renders with markers, live updates arrive via WebSocket

---

## Phase 3 — Mobile App (`app-trans-allal`)

### 3-A  Install Dependencies

- [ ] **3-A-1** Install secure storage + location
  ```bash
  cd app-trans-allal
  npx expo install expo-secure-store expo-location expo-task-manager expo-background-fetch
  ```

- [ ] **3-A-2** Install maps + networking
  ```bash
  npx expo install react-native-maps
  npm install axios socket.io-client zustand
  npm install react-hook-form @hookform/resolvers zod
  npx expo install @react-native-community/netinfo
  ```

---

### 3-B  Environment Setup

- [ ] **3-B-1** Create `app-trans-allal/.env`:
  ```env
  EXPO_PUBLIC_APP_NAME=Trans Allal Driver
  EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000/api/v1
  EXPO_PUBLIC_WS_URL=http://192.168.1.x:3000
  EXPO_PUBLIC_ENV=development
  EXPO_PUBLIC_AUTH_STORAGE_KEY=ta_driver_auth
  ```
  > Replace `192.168.1.x` with LAN IP of dev machine. Use `localhost` for simulators only.

---

### 3-C  Foundation

- [ ] **3-C-1** `src/services/api/client.ts`
  - Axios instance, `baseURL = EXPO_PUBLIC_API_BASE_URL`
  - Request interceptor: attach Bearer token from auth store
  - Response interceptor: on 401 → refresh → retry; on failure → logout

- [ ] **3-C-2** `src/services/api/endpoints.ts` — same endpoint constants as dashboard, adapted for mobile paths

- [ ] **3-C-3** `src/store/auth.store.ts` (Zustand)
  - State: `accessToken`, `refreshToken`, `driver: DriverProfile | null`, `isLoading`
  - Actions: `login(phone, password)`, `logout()`, `refresh()`, `hydrate()`
  - Persist using `expo-secure-store` (NOT AsyncStorage)
  - Custom storage adapter: `{ getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync }`

- [ ] **3-C-4** `src/services/api/realtime-client.ts`
  - Class `MobileRealtimeClient` with: `connect(token)`, `sendLocation(payload)`, `onAlert(cb)`, `disconnect()`, `isConnected()`
  - Uses `socket.io-client`
  - Export singleton `realtimeClient`

- [ ] **3-C-5** `src/services/connectivity/connectivity.service.ts`
  - Watch online/offline state via `@react-native-community/netinfo`
  - Export `useIsOnline()` hook
  - Manage `offlineQueue: LocationPayload[]`
  - `flushQueue()` → send buffered locations to backend in order on reconnect

---

### 3-D  Location Service

- [ ] **3-D-1** `src/services/location/location.service.ts`
  - `requestPermissions()` → `expo-location` foreground + background permissions; return `boolean`
  - `getCurrentPosition()` → return `{ lat, lng, accuracy }`
  - `startWatching(callback, intervalMs = 10_000)` → `Location.watchPositionAsync`
  - `stopWatching()` → remove subscription

- [ ] **3-D-2** `src/services/location/background-task.ts`
  - Define task: `TaskManager.defineTask(LOCATION_TASK_NAME, handler)`
  - `handler` reads latest position → `realtimeClient.sendLocation()` or push to `offlineQueue`
  - Export `startBackgroundTracking()` and `stopBackgroundTracking()`

---

### 3-E  Auth Feature (Mobile)

- [ ] **3-E-1** `src/features/auth/auth.api.ts` — `loginDriver(phone, password)`, `refreshTokens(refreshToken)`
- [ ] **3-E-2** `src/app/_layout.tsx` — call `authStore.hydrate()` before rendering, show `SplashScreen` while loading
- [ ] **3-E-3** `src/app/index.tsx` — redirect to `/(app)/home` if authenticated, else `/(auth)/sign-in`
- [ ] **3-E-4** `src/app/(auth)/sign-in.tsx`
  - Phone + password form with `react-hook-form` + `zod`
  - Shows validation errors inline
  - On success → navigate to `/(app)/home`
  - On error → show error message below form

---

### 3-F  Trip Feature (Mobile)

- [ ] **3-F-1** `src/features/trip/trip.api.ts` — `getMyTrips()`, `getTripById(id)`, `updateTripStatus(id, status)`
- [ ] **3-F-2** `src/features/trip/components/TripCard.tsx`
  - Shows: status badge, origin → destination, scheduled time
  - Tappable → navigates to `/(app)/trip/[id]`
- [ ] **3-F-3** `src/app/(app)/trip/index.tsx` — list of driver's trips, filtered by active/upcoming tabs
- [ ] **3-F-4** `src/app/(app)/trip/[id].tsx`
  - Trip details: driver, truck, origin, destination, status, notes
  - Action buttons based on status:
    - PENDING → "Start Trip" button → `updateTripStatus(id, IN_PROGRESS)` → start location tracking
    - IN_PROGRESS → "Complete Trip" → `updateTripStatus(id, COMPLETED)` → stop tracking
    - COMPLETED/CANCELLED → read-only view

---

### 3-G  Tracking Feature (Mobile)

- [ ] **3-G-1** `src/features/tracking/hooks/useLocationTracking.ts`
  - Accepts `tripId`, `isActive: boolean`
  - When `isActive` becomes true: request permissions → start background task → `realtimeClient.connect(token)`
  - Each position update → if online: `realtimeClient.sendLocation(payload)`, else: push to `offlineQueue`
  - When `isActive` becomes false: stop background task, `realtimeClient.disconnect()`, flush offline queue

- [ ] **3-G-2** `src/app/(app)/tracking/index.tsx`
  - `MapView` (react-native-maps) centered on current driver position
  - Blue dot for current position, polyline for route traveled during trip
  - Shows speed, accuracy in overlay
  - Uses `useLocationTracking` when a trip is `IN_PROGRESS`

---

### 3-H  Driver Profile Feature

- [ ] **3-H-1** `src/features/driver/driver.api.ts` — `getProfile()`, `updateProfile(dto)`
- [ ] **3-H-2** `src/app/(app)/profile/index.tsx` — display driver info, editable fields with form + save button

---

### 3-I  Settings + Navigation

- [ ] **3-I-1** `src/app/(app)/_layout.tsx`
  - Tab navigator with 4 tabs: Home, Trips, Map, Profile
  - Icons from `lucide-react-native` or `@expo/vector-icons`
  - Protected: if no token → redirect to sign-in

- [ ] **3-I-2** `src/app/(app)/home/index.tsx`
  - Active trip card (if any trip is `IN_PROGRESS`)
  - Quick stats: completed trips this week
  - Quick action: view all trips button

- [ ] **3-I-3** `src/app/(app)/settings/index.tsx`
  - App version, logout button, clear cache option

---

### 3-J  Offline Buffering

- [ ] **3-J-1** In `connectivity.service.ts`: implement `offlineQueue` as array in module scope, persisted to `AsyncStorage` with key `ta_offline_queue`
- [ ] **3-J-2** On network reconnect: `flushQueue()` → iterate queue, POST each location to `POST /tracking/location`, clear queue on success

---

### 3-K  Mobile Verification

- [ ] **3-K-1** `npm run typecheck` — zero TypeScript errors
- [ ] **3-K-2** `npm run start` — Expo dev server starts
- [ ] **3-K-3** Sign-in with valid driver phone/password → navigates to home
- [ ] **3-K-4** View trips list → tap a trip → start trip → location updates appear in dashboard map

---

## Phase 4 — End-to-End Integration & Polish

### 4-A  Full Flow Test

- [ ] **4-A-1** Driver logs in on mobile → token stored in SecureStore
- [ ] **4-A-2** Driver starts a trip → status changes to `IN_PROGRESS` in backend
- [ ] **4-A-3** Mobile sends location every 10 seconds via WebSocket
- [ ] **4-A-4** Dashboard tracking page shows driver marker moving in real time
- [ ] **4-A-5** Driver speed exceeds 120 km/h → alert appears in dashboard alerts page
- [ ] **4-A-6** Dashboard marks alert as read → `isRead` updated in DB

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

### 4-D  Final Build Check

- [ ] **4-D-1** `cd backend-trans-allal && npm run build` — passes
- [ ] **4-D-2** `cd dashboard-trans-allal && npm run build` — passes
- [ ] **4-D-3** `cd app-trans-allal && npm run typecheck` — passes

---

*Last updated: 2026-04-12 | Version 2.0 — Checklist Format*
