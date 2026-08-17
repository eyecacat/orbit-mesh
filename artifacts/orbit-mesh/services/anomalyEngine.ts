// services/anomalyEngine.ts
// ORBIT-MESH PRO V2.1 ULTRA FIRMWARE İLE TAM UYUMLU
// IMU verisi (gx/gy/gz, ax/ay/az, temp_c) KULLANILMAZ.
// Anomali skoru sadece VLF, Schumann, hareket ve gürültü üzerinden hesaplanır.

import type { OrbitMeshTelemetry } from "@/utils/telemetryParser";

export interface AnomalyScore {
  nodeId: string;
  total: number;                // 0-100 arası skor
  vlfScore: number;             // VLF genlik ve frekans bazlı
  schumannScore: number;        // Schumann sapması ve oran
  motionScore: number;          // iyonosferik hız ve güven
  noiseScore: number;           // fault / mains / anomaly flag'leri
  level: "Normal" | "Şüpheli" | "Yüksek" | "Kritik";
  motionFiltered: boolean;      // her zaman false (IMU yok)
}

/**
 * Skor hesaplama – tüm girdiler firmware'den gelir.
 */
export function computeAnomalyScore(t: OrbitMeshTelemetry): AnomalyScore {
  // 1. VLF skoru: vlf_amp ve vlf_hz bazında
  let vlfScore = 0;
  if (t.vlf_amp > 5000) vlfScore += 40;
  else if (t.vlf_amp > 2000) vlfScore += 20;
  else if (t.vlf_amp > 500) vlfScore += 10;
  // Frekans anormalliği (1 Hz civarı ise düşük kalite)
  if (t.vlf_hz < 2 || t.vlf_hz > 15) vlfScore += 10;

  // 2. Schumann skoru
  let schumannScore = 0;
  if (t.sch_active) {
    // 7.83 Hz'den sapma
    const diff = Math.abs(t.sch_hz - 7.83);
    if (diff > 0.5) schumannScore += 20;
    else if (diff > 0.2) schumannScore += 10;
    // oran düşükse gürültü
    if (t.sch_ratio < 1.0) schumannScore += 15;
  } else {
    // Schumann aktif değilse anomali
    schumannScore += 25;
  }

  // 3. Hareket skoru (iyonosferik)
  let motionScore = 0;
  if (t.mot_vel > 5) motionScore += 30;
  else if (t.mot_vel > 2) motionScore += 15;
  else if (t.mot_vel > 0.5) motionScore += 5;
  // Güven yüksekse ve trend yaklaşıyorsa
  if (t.mot_conf > 80 && t.mot_trend === "APPROACHING") motionScore += 10;

  // 4. Gürültü / hata skoru
  let noiseScore = 0;
  if (t.fault) noiseScore += 30;
  if (t.mains) noiseScore += 20;
  if (t.anomaly) noiseScore += 25;

  // Toplam skor (0-100 arası normalize)
  let total = vlfScore + schumannScore + motionScore + noiseScore;
  total = Math.min(100, Math.max(0, total));

  // Seviye belirleme
  let level: AnomalyScore["level"];
  if (total >= 70) level = "Kritik";
  else if (total >= 50) level = "Yüksek";
  else if (total >= 30) level = "Şüpheli";
  else level = "Normal";

  return {
    nodeId: t.nodeId,
    total,
    vlfScore: Math.min(100, vlfScore),
    schumannScore: Math.min(100, schumannScore),
    motionScore: Math.min(100, motionScore),
    noiseScore: Math.min(100, noiseScore),
    level,
    motionFiltered: false, // IMU olmadığı için her zaman false
  };
}

/**
 * Basitleştirilmiş anomali kontrolü (boolean)
 */
export function isAnomalous(t: OrbitMeshTelemetry): boolean {
  const score = computeAnomalyScore(t);
  return score.total >= 50;
}
