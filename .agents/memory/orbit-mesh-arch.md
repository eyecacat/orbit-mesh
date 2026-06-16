---
name: ORBIT-MESH architecture
description: Key architectural decisions for the ORBIT-MESH Expo app (TEKNOFEST project).
---

## Rules

- **Auth**: Client-side only via AsyncStorage (`@orbit-mesh/users`, `@orbit-mesh/current-user`). No backend DB for auth.
- **AI chat**: Proxied through `api-server` at `POST /api/ai/chat` using OpenRouter (`OPENROUTER_API_KEY`). Model: `anthropic/claude-3.5-sonnet`. System prompt in Turkish.
- **NASA DONKI**: Called directly from Expo using `DEMO_KEY` (public API, no backend needed).
- **Earthquake detection**: `expo-sensors` Accelerometer at 200ms interval, threshold 3.0G, 30s cooldown. Web platform skipped (native-only). SMS via `expo-sms`, calls 112 via `Linking`.
- **API base URL in Expo**: `https://${EXPO_PUBLIC_DOMAIN}/api` — set from `REPLIT_DEV_DOMAIN` by workflow env vars.
- **Tab routing**: Expo Router file-based. `app/(tabs)/` for 5 main tabs, detail screens at top level (`app/ble/index.tsx` etc.).
- **AuthGate**: Lives inside `RootLayoutNav` using `useSegments` + `useRouter`, NOT wrapping the Stack. Redirects unauthenticated users to `/auth`.
- **BLE**: `react-native-ble-plx` requires a **development build** (EAS), NOT Expo Go. `newArchEnabled` must be `false` because `react-native-ble-plx` is not stable on the new Fabric architecture. BLE permissions in `app.json` include `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_FINE_LOCATION`.
- **EAS**: `eas.json` exists with `developmentClient: true` + `distribution: "internal"` + `android.buildType: "apk"` for testing BLE on physical devices.
- **EarthquakeOverlay**: Rendered in `RootLayoutNav` before `<Stack />` as a sibling, using a Modal — avoids navigation tree issues.

**Why:** Keeping auth client-side avoids a backend DB dependency for the TEKNOFEST demo. Proxying AI through api-server hides the OpenRouter API key from the mobile client.

**How to apply:** Any new screen needing auth should rely on the AuthGate redirect — no per-screen auth checks needed. For new API calls that need secrets, proxy through api-server.
