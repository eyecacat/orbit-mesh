---
name: ORBIT-MESH backend URL strategy
description: How to keep mobile preview and backend on the same origin during local development.
---

- `lib/env.ts` sets `BACKEND_URL` to `https://${process.env.EXPO_PUBLIC_DOMAIN}` when available, falling back to `https://orbit-mesh.vercel.app` in production.
- This makes local dev use the Replit API server artifact instead of Vercel, avoiding CORS errors in the Expo web preview.
- The workflow already sets `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN`, so the change is automatic for all developers.

**Why:** Web preview runs on the Expo dev domain (`*.expo.pike.replit.dev`) while the API server is exposed through the same Replit domain. Calling `orbit-mesh.vercel.app` cross-origin triggered `Access-Control-Allow-Origin` errors and the local Vercel functions did not exist.

**How to apply:** Any new backend proxy added to Vercel (`artifacts/orbit-mesh/api/*.ts`) should also be added to `artifacts/api-server/src/routes` so local dev has parity.
