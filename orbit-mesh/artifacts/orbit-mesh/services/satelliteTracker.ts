// services/satelliteTracker.ts
// ORBIT-MESH — Uydu takip motoru.
// DÜZELTME: Eski kod TLE için çalışmayan bir backend proxy'sine bağımlıydı.
// Artık CelesTrak'a doğrudan bağlanıyoruz (React Native fetch'inde CORS
// kısıtı yoktur) ve package.json'da zaten bulunan satellite.js ile GERÇEK
// SGP4 yörünge hesabı yapıyoruz.

import * as satellite from "satellite.js";

export interface TleData {
  name: string;
  line1: string;
  line2: string;
}

export interface GeoPos {
  lat: number; // derece
  lon: number; // derece
  altKm: number;
}

export interface LookAngles {
  azDeg: number;
  elDeg: number;
  rangeKm: number;
}

export interface PassInfo {
  startMs: number;
  peakMs: number;
  endMs: number;
  maxEl: number; // derece
  azAtPeak: number; // derece
}

const TLE_BASE = "https://celestrak.org/NORAD/elements/gp.php";
const cache = new Map<string, { data: TleData; at: number }>();
const CACHE_MS = 30 * 60 * 1000; // 30 dk

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

export async function fetchTleByCatnr(catnr: number): Promise<TleData | null> {
  const key = `cat:${catnr}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  try {
    const r = await fetch(`${TLE_BASE}?CATNR=${catnr}&FORMAT=tle`);
    if (!r.ok) return null;
    const list = parseTleText(await r.text());
    if (list.length === 0) return null;
    cache.set(key, { data: list[0], at: Date.now() });
    return list[0];
  } catch {
    return null;
  }
}

/** Bir CelesTrak grubundan isim filtresine uyan tüm TLE'leri getirir */
export async function fetchTlesFromGroup(group: string, nameFilter: RegExp): Promise<TleData[]> {
  const key = `group:${group}`;
  const hit = cache.get(key);
  let list: TleData[];
  if (hit && Date.now() - hit.at < CACHE_MS) {
    list = [hit.data]; // grup cache'i tek kayıt olarak saklanamaz; her seferinde çek
  }
  try {
    const r = await fetch(`${TLE_BASE}?GROUP=${group}&FORMAT=tle`);
    if (!r.ok) return [];
    list = parseTleText(await r.text()).filter((t) => nameFilter.test(t.name));
    return list;
  } catch {
    return [];
  }
}

function makeSatrec(tle: TleData) {
  try {
    return satellite.twoline2satrec(tle.line1, tle.line2);
  } catch {
    return null;
  }
}

/** Belirli bir andaki enlem/boylam/yükseklik */
export function getPosition(tle: TleData, date = new Date()): GeoPos | null {
  const satrec = makeSatrec(tle);
  if (!satrec) return null;
  const pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position) return null;
  const gmst = satellite.gstime(date);
  const ecf = satellite.eciToEcf(pv.position, gmst);
  const geo = satellite.ecfToGeodetic(ecf, satellite.constants.wgs84);
  return {
    lat: satellite.degreesLat(geo.latitude),
    lon: satellite.degreesLong(geo.longitude),
    altKm: geo.height,
  };
}

/** Gözlemci için azimut/yükselis (derece) */
export function getLookAngles(tle: TleData, obsLat: number, obsLon: number, obsAltKm = 0, date = new Date()): LookAngles | null {
  const satrec = makeSatrec(tle);
  if (!satrec) return null;
  const pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position) return null;
  const gmst = satellite.gstime(date);
  const ecf = satellite.eciToEcf(pv.position, gmst);
  const observerGd = {
    latitude: satellite.degreesToRadians(obsLat),
    longitude: satellite.degreesToRadians(obsLon),
    height: obsAltKm,
  };
  const look = satellite.ecfToLookAngles(observerGd, ecf);
  return {
    azDeg: (look.azimuth * 180) / Math.PI,
    elDeg: (look.elevation * 180) / Math.PI,
    rangeKm: look.rangeSat,
  };
}

/**
 * Gelecek N saat içindeki görünür geçişleri hesaplar.
 * Varsayılan: 72 saat, 30 sn adım, min 10° yükselis.
 */
export function computePasses(
  tle: TleData,
  obsLat: number,
  obsLon: number,
  opts: { hours?: number; stepSec?: number; minEl?: number } = {}
): PassInfo[] {
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
  let cur: { startMs: number; peakMs: number; endMs: number; maxEl: number; azAtPeak: number } | null = null;

  for (let t = start; t <= end; t += stepMs) {
    const date = new Date(t);
    const pv = satellite.propagate(satrec, date);
    let el = -90;
    let az = 0;
    if (pv && pv.position) {
      const gmst = satellite.gstime(date);
      const ecf = satellite.eciToEcf(pv.position, gmst);
      const look = satellite.ecfToLookAngles(observerGd, ecf);
      el = (look.elevation * 180) / Math.PI;
      az = (look.azimuth * 180) / Math.PI;
    }
    if (el >= minEl) {
      if (!inPass) {
        inPass = true;
        cur = { startMs: t, peakMs: t, endMs: t, maxEl: el, azAtPeak: az };
      } else if (cur) {
        cur.endMs = t;
        if (el > cur.maxEl) {
          cur.maxEl = el;
          cur.peakMs = t;
          cur.azAtPeak = az;
        }
      }
    } else if (inPass && cur) {
      if (cur.endMs - cur.startMs >= 60000) passes.push(cur); // en az 1 dk süren geçişler
      cur = null;
      inPass = false;
      if (passes.length >= 12) break;
    }
  }
  return passes;
}
