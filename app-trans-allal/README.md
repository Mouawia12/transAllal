# app-trans-allal

## Purpose

`app-trans-allal` is the future driver mobile application for the Trans Allal platform. In this phase it has been reorganized into a clean Expo/React Native structure with route boundaries, services, theme primitives, API readiness, tracking placeholders, and offline/sync preparation points.

## Stack

- Expo
- React Native
- Expo Router
- TypeScript

## Folder Structure

```text
src/
  app/
  navigation/
  screens/
    auth/
    home/
    trip/
    tracking/
    profile/
    settings/
  components/
    ui/
    shared/
    forms/
    maps/
  features/
    auth/
    driver/
    trip/
    tracking/
    sync/
  services/
    api/
    storage/
    permissions/
    location/
    connectivity/
  store/
  hooks/
  utils/
  constants/
  types/
  theme/
  assets/
```

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Make sure `EXPO_PUBLIC_API_BASE_URL` points to the backend API prefix.
3. Set `EXPO_PUBLIC_WS_URL` for future realtime tracking and trip updates.

Key variables:

- `EXPO_PUBLIC_APP_NAME`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_WS_URL`
- `EXPO_PUBLIC_MAP_PROVIDER`
- `EXPO_PUBLIC_MAPBOX_TOKEN`
- `EXPO_PUBLIC_ENV`

## Run Instructions

```bash
npm install
npm run start
```

Useful commands:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
```

## API Readiness

- Central fetch wrapper lives in `src/services/api/client.ts`.
- Backend endpoint naming lives in `src/services/api/endpoints.ts`.
- Auth token storage placeholder lives in `src/services/storage/token-storage.ts`.
- Runtime env access is centralized in `src/constants/env.ts`.

## Tracking Readiness

- Tracking screens are isolated from auth and trip concerns.
- Realtime websocket placeholder lives in `src/services/api/realtime-client.ts`.
- Background/location placeholders live in `src/services/location/` and `src/services/permissions/`.
- Offline/sync preparation lives in `src/features/sync/`.

## Next Phase Notes

- Implement secure auth and token persistence
- Connect driver home, trip, and tracking screens to backend APIs
- Add foreground/background location permissions and telemetry streaming
- Introduce offline queueing and sync conflict handling
- Replace placeholders with real trip lifecycle and driver workflows
