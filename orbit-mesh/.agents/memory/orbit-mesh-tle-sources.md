---
name: ORBIT-MESH Turkish satellite TLE sources
description: Where real TLE data comes from and why NORAD IDs must be verified against Celestrak groups.
---

- Celestrak `gp.php?CATNR=<norad>&FORMAT=TLE` works for some satellites but returns 404 for others, even when the satellite is real.
- Fallback: scan the `geo` and `resource` group TLEs (`gp.php?GROUP=geo|resource&FORMAT=TLE`) and match by the NORAD catalog number in TLE line 1 (columns 3–7).
- Verified Turkish satellites from those groups:
  - TÜRKSAT 5A: 47306
  - TÜRKSAT 5B: 50212
  - TÜRKSAT 6A: 60233
  - GÖKTÜRK-1A: 41875
  - GÖKTÜRK-2: 39030
  - RASAT: 37791
- İMECE was not found in the public Celestrak groups at the time of lookup, so it was not added to the tracker.

**Why:** The original NORAD IDs (e.g., 47421 for TÜRKSAT 5A, 42082 for GÖKTÜRK) resolved to unrelated objects (Starlink debris, Delta 1 debris). Using the correct IDs keeps the tracker truthful and avoids silent bad data.

**How to apply:** When adding more national satellites, verify the NORAD ID against the Celestrak group TLEs rather than relying on catalog databases alone. If a satellite is not in the public groups, do not include it.
