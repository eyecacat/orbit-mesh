import { useState, useEffect, useCallback } from "react";

export interface SolarWindData {
  speed: number;
  density: number;
  temperature: number;
  bt: number;
  bz: number;
}

export interface XRayData {
  flux: number;
  class: string;
  status: "normal" | "active" | "storm";
}

export interface ProtonData {
  flux: number;
  energy: string;
  status: "normal" | "warning" | "critical";
}

export interface SpaceWeatherFull {
  kpIndex: number;
  kpStatus: string;
  kpColor: string;
  solarWind: SolarWindData | null;
  xray: XRayData | null;
  proton: ProtonData | null;
  timestamp: string;
}

function kpToMeta(kp: number) {
  if (kp >= 9) return { status: "Ekstrem", color: "#7f1d1d" };
  if (kp >= 8) return { status: "Şiddetli", color: "#991b1b" };
  if (kp >= 7) return { status: "Güçlü Fırtına", color: "#b91c1c" };
  if (kp >= 6) return { status: "Orta Fırtına", color: "#dc2626" };
  if (kp >= 5) return { status: "Küçük Fırtına", color: "#f59e0b" };
  if (kp >= 4) return { status: "Aktif", color: "#fbbf24" };
  if (kp >= 3) return { status: "Hafif", color: "#34d399" };
  return { status: "Sakin", color: "#10b981" };
}

export function useSpaceWeather() {
  const [data, setData] = useState<SpaceWeatherFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      // Kp-Index (NOAA SWPC)
      const kpRes = await fetch(
        "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-1-minute.json"
      );
      const kpJson = await kpRes.json();
      const kpLast = kpJson[kpJson.length - 1];
      const kp = parseFloat(kpLast[1]);
      const kpMeta = kpToMeta(kp);

      // Solar Wind (DSCOVR real-time)
      let solarWind: SolarWindData | null = null;
      try {
        const swRes = await fetch(
          "https://services.swpc.noaa.gov/products/solar-wind/dscovr-1-hour.json"
        );
        const swJson = await swRes.json();
        const swLast = swJson[swJson.length - 1];
        solarWind = {
          speed: parseFloat(swLast[1]) || 0,
          density: parseFloat(swLast[2]) || 0,
          temperature: parseFloat(swLast[3]) || 0,
          bt: parseFloat(swLast[6]) || 0,
          bz: parseFloat(swLast[7]) || 0,
        };
      } catch (e) {
        // DSCOVR verisi opsiyonel
      }

      // X-Ray Flux (GOES)
      let xray: XRayData | null = null;
      try {
        const xrRes = await fetch(
          "https://services.swpc.noaa.gov/products/goes-xray-flux-primary-1-minute.json"
        );
        const xrJson = await xrRes.json();
        const xrLast = xrJson[xrJson.length - 1];
        const flux = parseFloat(xrLast[1]);
        let cls = "A";
        let status: "normal" | "active" | "storm" = "normal";
        if (flux >= 1e-4) { cls = "X"; status = "storm"; }
        else if (flux >= 1e-5) { cls = "M"; status = "active"; }
        else if (flux >= 1e-6) { cls = "C"; status = "active"; }
        else if (flux >= 1e-7) { cls = "B"; }
        xray = { flux, class: cls, status };
      } catch (e) {
        // X-ray verisi opsiyonel
      }

      // Proton Flux (ACE)
      let proton: ProtonData | null = null;
      try {
        const prRes = await fetch(
          "https://services.swpc.noaa.gov/products/ace-proton-flux-1-hour.json"
        );
        const prJson = await prRes.json();
        const prLast = prJson[prJson.length - 1];
        const pFlux = parseFloat(prLast[1]);
        proton = {
          flux: pFlux,
          energy: prLast[2] || ">10 MeV",
          status: pFlux > 10 ? "warning" : "normal",
        };
      } catch (e) {
        // Proton verisi opsiyonel
      }

      setData({
        kpIndex: kp,
        kpStatus: kpMeta.status,
        kpColor: kpMeta.color,
        solarWind,
        xray,
        proton,
        timestamp: kpLast[0],
      });
      setError(null);
    } catch (e: any) {
      setError("NASA SWPC bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 3 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}