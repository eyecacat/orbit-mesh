---
name: NASA DONKI rate-limit handling
description: DEMO_KEY is heavily rate-limited; production needs a real NASA_API_KEY.
---

- NASA DONKI with `api_key=DEMO_KEY` returns HTTP 429 after a few requests in local development.
- The API server route (`/api/nasa`) now retries up to 3 times with exponential backoff and caches successful responses for 15 minutes.
- For reliable local development and demos, set `NASA_API_KEY` in the environment (real key from api.nasa.gov).

**Why:** The new Uzay Hava Uyarıları screen and the existing home screen both call NASA DONKI for solar flares/CMEs. Without a key or cache, the screen fails with a generic “NASA verisi alınamadı” message.

**How to apply:** In production (Vercel), set `NASA_API_KEY`. In local dev, either set the same key or accept that DEMO_KEY may be rate-limited.
