// services/satelliteTracker.ts
// ORBIT-MESH — Uydu takip motoru (çok kaynaklı TLE + gömülü yedek)

import * as satellite from "satellite.js";

export interface TleData {
  name: string;
  line1: string;
  line2: string;
  fromFallback?: boolean; // gömülü yedek TLE kullanıldı mı?
}

export interface GeoPos { lat: number; lon: number; altKm: number; }
export interface LookAngles { azDeg: number; elDeg: number; rangeKm: number; }
export interface PassInfo { startMs: number; peakMs: number; endMs: number; maxEl: number; azAtPeak: number; }

// ── Gömülü yedek TLE'ler (CelesTrak, epok 26253 ≈ 2026-09-10) ──────────────
export const EMBEDDED_TLES: Record<number, TleData> = {
  25544: { name: "ISS (ZARYA)", line1: "1 25544U 98067A   26253.72411234  .00004958  00000+0  97859-4 0  9999", line2: "2 25544  51.6302 236.7477 0004996 126.7110 233.4338 15.49071701585011" },
  41875: { name: "GOKTURK 1A", line1: "1 41875U 16073A   26253.95569970  .00000192  00000+0  46786-4 0  9996", line2: "2 41875  98.1551 147.3822 0001588  77.0181 283.1198 14.62746933521363" },
  39030: { name: "GOKTURK 2", line1: "1 39030U 12073A   26253.92999237  .00000622  00000+0  98079-4 0  9992", line2: "2 39030  97.6790  87.0618 0002196  76.4601 283.6854 14.75611811737151" },
  56178: { name: "IMECE", line1: "1 56178U 23054A   26253.95656659  .00000198  00000+0  45090-4 0  9999", line2: "2 56178  98.1119 157.7813 0008254 259.0846 100.9429 14.65894309182974" },
  37791: { name: "RASAT", line1: "1 37791U 11044D   26253.97878288  .00000560  00000+0  10551-3 0  9997", line2: "2 37791  98.0566 344.0616 0019186 281.7459 133.2301 14.68234682805772" },
  27943: { name: "BILSAT 1", line1: "1 27943U 03042E   26253.45351728  .00000202  00000+0  45088-4 0  9999", line2: "2 27943  98.4052  65.7591 0012093  84.3249 275.9333 14.67107597226620" },
  33056: { name: "TURKSAT 3A", line1: "1 33056U 08030B   26253.74670090  .00000127  00000+0  00000-0 0  9997", line2: "2 33056   0.0435  83.7555 0004478  71.6503 145.1624  1.00271695 53214" },
  39522: { name: "TURKSAT 4A", line1: "1 39522U 14007A   26253.94830287  .00000127  00000+0  00000-0 0  9990", line2: "2 39522   0.0833 285.3331 0003738 318.0849 129.9686  1.00273312 45825" },
  40984: { name: "TURKSAT 4B", line1: "1 40984U 15060A   26253.94986287  .00000096  00000+0  00000-0 0  9991", line2: "2 40984   0.0257 251.6044 0002215 294.2696 196.0679  1.00274035 39957" },
  47306: { name: "TURKSAT 5A", line1: "1 47306U 21001A   26253.73791294  .00000135  00000+0  00000-0 0  9991", line2: "2 47306   0.0160 106.4584 0000145 219.2874 320.6032  1.00272325 20820" },
  50212: { name: "TURKSAT 5B", line1: "1 50212U 21126A   26253.94821620  .00000127  00000+0  00000-0 0  9990", line2: "2 50212   0.0728 335.3132 0001829 324.7774  73.2158  1.00270760 17156" },
  60233: { name: "TURKSAT 6A", line1: "1 60233U 24127A   26253.94821620  .00000128  00000+0  00000-0 0  9999", line2: "2 60233   0.0322 220.4684 0004202 337.1590 175.6760  1.00270340  7876" },
};

const CELESTRAK_SOURCES = [
  "https://celestrak.org/NORAD/elements/gp.php",
  "https://www.celestrak.org/NORAD/elements/gp.php",
];
const cache = new Map<string, { data: any; at: number }>();
const CACHE_MS = 30 * 60 * 1000;

// 12 sn'de yanıt gelmezse kaynağı atla (RN fetch'in kendi timeout'u yok)
async function fetchWithTimeout(url: string, ms = 12000): Promise<Response | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return r;
  } catch {
    return null;
  }
}

function parseTleText(text: string): TleData[] {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const out: TleData[] = [];
  for (let i = 0; i < lines.length - 2; i++) {
    if (lines[i + 1]?.startsWith("1 ") && lines[i + 2]?.startsWith("2 ")) {
      out.push({ name: lines[i].trim(), line1: lines[i + 1], line2: lines[i + 2] });
      i += 2;
    }
  }
  return out;
}

/** CATNR ile TLE getirir: 2 canlı kaynak dener, olmazsa gömülü yedeğe düşer */
export async function fetchTleByCatnr(catnr: number): Promise<TleData | null> {
  const key = `cat:${catnr}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data as TleData;

  for (const base of CELESTRAK_SOURCES) {
    const r = await fetchWithTimeout(`${base}?CATNR=${catnr}&FORMAT=tle`);
    if (r && r.ok) {
      const list = parseTleText(await r.text());
      if (list.length > 0) {
        cache.set(key, { data: list[0], at: Date.now() });
        return list[0];
      }
    }
  }
  // Gömülü yedek
  const fb = EMBEDDED_TLES[catnr];
  if (fb) return { ...fb, fromFallback: true };
  return null;
}

/** GEO grubundan isim filtresine uyan TLE'ler (Türksat vb.) */
export async function fetchTlesFromGroup(group: string, nameFilter: RegExp): Promise<TleData[]> {
  const key = `group:${group}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return (hit.data as TleData[]).filter((t) => nameFilter.test(t.name));
  }
  for (const base of CELESTRAK_SOURCES) {
    const r = await fetchWithTimeout(`${base}?GROUP=${group}&FORMAT=tle`);
    if (r && r.ok) {
      const list = parseTleText(await r.text());
      cache.set(key, { data: list, at: Date.now() });
      return list.filter((t) => nameFilter.test(t.name));
    }
  }
  // Gömülü yedekten GEO filtrele
  return Object.values(EMBEDDED_TLES).filter(
    (t) => nameFilter.test(t.name) && t.line2.includes("  1.00")
  ).map((t) => ({ ...t, fromFallback: true }));
}

function makeSatrec(tle: TleData) {
  try { return satellite.twoline2satrec(tle.line1, tle.line2); } catch { return null; }
}

export function getPosition(tle: TleData, date = new Date()): GeoPos | null {
  const satrec = makeSatrec(tle);
  if (!satrec) return null;
  const pv = satellite.propagate(satrec, date);
  if (!pv || typeof pv === "boolean" || !pv.position || typeof pv.position === "boolean") return null;
  const gmst = satellite.gstime(date);
  const geo = satellite.eciToGeodetic(pv.position, gmst);
  return { lat: satellite.degreesLat(geo.latitude), lon: satellite.degreesLong(geo.longitude), altKm: geo.height };
}

export function getLookAngles(tle: TleData, obsLat: number, obsLon: number, obsAltKm = 0, date = new Date()): LookAngles | null {
  const satrec = makeSatrec(tle);
  if (!satrec) return null;
  const pv = satellite.propagate(satrec, date);
  if (!pv || typeof pv === "boolean" || !pv.position || typeof pv.position === "boolean") return null;
  const gmst = satellite.gstime(date);
  const observerGd = {
    latitude: satellite.degreesToRadians(obsLat),
    longitude: satellite.degreesToRadians(obsLon),
    height: obsAltKm,
  };
  const look = satellite.ecfToLookAngles(observerGd, satellite.eciToEcf(pv.position, gmst));
  return { azDeg: (look.azimuth * 180) / Math.PI, elDeg: (look.elevation * 180) / Math.PI, rangeKm: look.rangeSat };
}

export function computePasses(tle: TleData, obsLat: number, obsLon: number, opts: { hours?: number; stepSec?: number; minEl?: number } = {}): PassInfo[] {
  const { hours = 72, stepSec = 30, minEl = 10 } = opts;
  const satrec = makeSatrec(tle);
  if (!satrec) return [];
  const observerGd = {
    latitude: satellite.degreesToRadians(obsLat),
    longitude: satellite.degreesToRadians(obsLon),
    height: 0,
  };
  const passes: PassInfo[] = [];
  const start = Date.now();
  const end = start + hours * 3600 * 1000;
  const stepMs = stepSec * 1000;
  let inPass = false;
  let cur: PassInfo | null = null;

  for (let t = start; t <= end; t += stepMs) {
    const date = new Date(t);
    const pv = satellite.propagate(satrec, date);
    let el = -90, az = 0;
     if (pv && typeof pv !== "boolean" && pv.position && typeof pv.position !== "boolean") {
      const gmst = satellite.gstime(date);
       const look = satellite.ecfToLookAngles(observerGd, satellite.eciToEcf(pv.position, gmst));
      el = (look.elevation * 180) / Math.PI;
      az = (look.azimuth * 180) / Math.PI;
    }
    if (el >= minEl) {
      if (!inPass) { inPass = true; cur = { startMs: t, peakMs: t, endMs: t, maxEl: el, azAtPeak: az }; }
      else if (cur && el > cur.maxEl) { cur.maxEl = el; cur.peakMs = t; cur.azAtPeak = az; cur.endMs = t; }
      else if (cur) cur.endMs = t;
    } else if (inPass && cur) {
      if (cur.endMs - cur.startMs >= 60000) passes.push(cur);
      cur = null; inPass = false;
      if (passes.length >= 12) break;
    }
  }
  return passes;
}
