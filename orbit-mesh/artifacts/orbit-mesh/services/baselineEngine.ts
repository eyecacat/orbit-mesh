// services/baselineEngine.ts
// ORBIT-MESH PRO V2.1 ULTRA: IMU verisi gelmediği için baseline engine devre dışı.
// Tüm fonksiyonlar boş döner veya dummy değerler üretir.

import type { OrbitMeshTelemetry } from "@/utils/telemetryParser";

export interface BaselineStats {
  vlfMean: number;
  vlfStd: number;
  magMean: number;
  magStd: number;
  tempMean: number;
  tempStd: number;
  seismicMean: number;
  seismicStd: number;
  count: number;
}

export function ingestBaseline(nodeId: string, t: OrbitMeshTelemetry): BaselineStats {
  return {
    vlfMean: 0,
    vlfStd: 0,
    magMean: 0,
    magStd: 0,
    tempMean: 0,
    tempStd: 0,
    seismicMean: 0,
    seismicStd: 0,
    count: 0,
  };
}

export function getBaseline(nodeId: string): BaselineStats | null {
  return null;
}

export function resetBaseline(nodeId: string): void {
  // no-op
}

export function getAllNodeIds(): string[] {
  return [];
}
