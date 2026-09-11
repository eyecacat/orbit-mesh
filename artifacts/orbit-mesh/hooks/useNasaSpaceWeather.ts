import { useState, useEffect, useCallback } from "react";

export type KpStatus =
  | "Sakin"
  | "Hafif"
  | "Aktif"
  | "Küçük Fırtına"
  | "Orta Fırtına"
  | "Güçlü Fırtına"
  | "Şiddetli"
  | "Ekstrem";

export interface SpaceWeatherData {
  kpIndex: number;
  timestamp: string;
  status: KpStatus;
  statusColor: string;
  auroraLikelihood: number; // 0-100
  gpsErrorRisk: string;
}

function kpToStatus(kp: number): { status: KpStatus; color: string; aurora: number; gps: string } {
  if (kp >= 9) return { status: "Ekstrem", color: "#7f1d1d", aurora: 100, gps: "GPS tamamen kaybolabilir" };
  if (kp >= 8) return { status: "Şiddetli", color: "#991b1b", aurora: 95, gps: "GPS hataları yaygın" };
  if (kp >= 7) return { status: "Güçlü Fırtına", color: "#b91c1c", aurora: 80, gps: "GPS sinyali zayıflar" };
  if (kp >= 6) return { status: "Orta Fırtına", color: "#dc2626", aurora: 60, gps: "GPS hata riski yüksek" };
  if (kp >= 5) return { status: "Küçük Fırtına", color: "#f59e0b", aurora: 35, gps: "GPS sapmaları olabilir" };
  if (kp >= 4) return { status: "Aktif", color: "#fbbf24", aurora: 15, gps: "GPS normal (hafif sapma)" };
  if (kp >= 3) return { status: "Hafif", color: "#34d399", aurora: 5, gps: "GPS normal" };
  return { status: "Sakin", color: "#10b981", aurora: 0, gps: "GPS mükemmel" };
}

export function useNasaSpaceWeather() {
  const [data, setData] = useState<SpaceWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKp = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-1-minute.json"
      );
      const json = await res.json();
      const last = json[json.length - 1];
      const kp = parseFloat(last[1]);
      const meta = kpToStatus(kp);

      setData({
        kpIndex: kp,
        timestamp: last[0],
        status: meta.status,
        statusColor: meta.color,
        auroraLikelihood: meta.aurora,
        gpsErrorRisk: meta.gps,
      });
      setError(null);
    } catch (e: any) {
      setError("NASA SWPC bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKp();
    const id = setInterval(fetchKp, 3 * 60 * 1000); // 3 dakika
    return () => clearInterval(id);
  }, [fetchKp]);

  return { data, loading, error, refetch: fetchKp };
}
