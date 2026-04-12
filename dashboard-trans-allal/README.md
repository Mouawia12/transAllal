# dashboard-trans-allal

## Purpose

`dashboard-trans-allal` is the operations and administration dashboard for the Trans Allal platform. In this phase it is prepared as a structured Next.js workspace with route groups, shared layout boundaries, API communication scaffolding, and clear feature folders for later implementation.

## Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4

## Folder Structure

```text
src/
  app/
    (auth)/
    (dashboard)/
    api/
  components/
    ui/
    shared/
    layout/
    maps/
    charts/
    tables/
  features/
    auth/
    overview/
    companies/
    drivers/
    trucks/
    trips/
    tracking/
    alerts/
    reports/
    settings/
  lib/
    api/
    auth/
    constants/
    utils/
  hooks/
  types/
  styles/
```

## Route Structure

- `/` -> dashboard overview workspace
- `/sign-in` -> auth placeholder
- `/companies`
- `/drivers`
- `/trucks`
- `/trips`
- `/tracking`
- `/alerts`
- `/reports`
- `/settings`
- `/api/health` -> local readiness route for frontend diagnostics

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Point `NEXT_PUBLIC_API_BASE_URL` to the backend base API.
3. Point `NEXT_PUBLIC_WS_URL` to the future realtime websocket endpoint.

Key variables:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_MAP_PROVIDER`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_AUTH_STORAGE_KEY`

## Backend Integration Readiness

- Centralized API configuration lives in `src/lib/api/config.ts`.
- Fetch wrapper and request shaping live in `src/lib/api/client.ts`.
- Backend endpoint naming is centralized in `src/lib/api/endpoints.ts`.
- Auth token handling placeholder lives in `src/lib/auth/token-store.ts`.
- Future websocket client setup lives in `src/lib/api/realtime-client.ts`.

## Next Phase Notes

- Replace placeholder feature views with real queries and mutations
- Implement auth/session flow
- Connect dashboard widgets to backend metrics endpoints
- Add actual map rendering and realtime event subscriptions
- Introduce domain tables, filters, charts, and role-based access
