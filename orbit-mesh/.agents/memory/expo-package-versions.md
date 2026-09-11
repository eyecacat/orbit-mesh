---
name: Expo package versions
description: Known version mismatches that cause Metro bundler failures in the orbit-mesh workspace.
---

## Rule

Always install `expo-sensors` and `expo-sms` at the Expo SDK-expected versions, not latest:
- `expo-sensors@~15.0.8` (Expo 53 SDK expects this; 56.x causes "unexpected version" warning and may cause resolution failures)
- `expo-sms@~14.0.8` (same reason)

Install in the `artifacts/orbit-mesh` package, not workspace root:
```
cd artifacts/orbit-mesh && pnpm add expo-sensors@~15.0.8 expo-sms@~14.0.8
```

**Why:** Metro resolved the wrong version (56.x from workspace root) when installed there, causing "Unable to resolve expo-sms" bundler error even though the package appeared installed.

**How to apply:** Any new Expo native package — check `expo install <pkg>` recommended version first (or cross-check `npx expo install --check`), then install with the exact semver range in `artifacts/orbit-mesh/package.json`.
