---
name: Expo hoisted CLI workflow
description: Artifact Expo workflows use a hoisted pnpm install where package-local Expo binary links may point to a missing path.
---

The ORBIT-MESH Expo workflow must resolve the Expo CLI from the workspace root when the repository uses pnpm's hoisted node linker.

**Why:** The package-local `.bin/expo` launcher can resolve to `artifacts/orbit-mesh/node_modules/expo/bin/cli` even though Expo is installed at the workspace root, causing a misleading workflow failure.

**How to apply:** Keep the artifact package name aligned with its managed workflow filter and invoke the root CLI with a workspace-relative path from the artifact scripts.