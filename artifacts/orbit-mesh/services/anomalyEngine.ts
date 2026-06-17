/**
 * Anomaly Engine
 * Multi-sensor fusion anomaly scoring per node.
 * Weights:
 *   0.40 * vlfScore
 *   0.30 * magneticScore
 *   0.20 * thermalScore
 *   0.10 * seismicScore
 *
 * Scores computed from z-scores against baseline.
 */

import type { NodeTelemetry } from "@/utils/telemetryParser";
import { getBaseline, ingestBaseline } from "./baselineEngine";

export interface AnomalyScore {
  nodeId: string;
  total: number;
  vlfScore: number;
  magneticScore: number;
  thermalScore: number;
  seismicScore: number;
  level: "Normal" | "Şüpheli" | "Yüksek" | "Kritik";
  motionFiltered: boolean;
}

function zscore(value: number, mean: number, std: number): number {
  if (std === 0 || mean === 0) return 0;
  const z = Math.abs(value - mean) / std;
  // Cap at 3 to avoid single outlier dominating
  return Math.min(z, 3.0);
}

function zscoreToScore(z: number): number {
  // Map z-score to 0-100 scale
  // z=0 => 0, z=1 => 20, z=2 => 50, z=3 => 100
  return Math.min(100, Math.max(0, z * z * 11.1));
}

function magMag(t: NodeTelemetry): number {
  return Math.sqrt(t.mx * t.mx + t.my * t.my + t.mz * t.mz);
}

function motionMag(t: NodeTelemetry): number {
  return Math.sqrt(t.ax * t.ax + t.ay * t.ay + t.az * t.az);
}

/**
 * Compute anomaly score for a single node.
 * If motion is high, the score is still computed but `motionFiltered` is true
 * (so MeshConsensus can decide to ignore it).
 */
export function computeAnomalyScore(t: NodeTelemetry): AnomalyScore {
  const baseline = ingestBaseline(t.nodeId, t);
  const motion = motionMag(t);
  const motionFiltered = Math.abs(motion - 1.0) > 1.5;

  const vlfScore = zscoreToScore(
    zscore(t.vlf_hz, baseline.vlfMean, baseline.vlfStd),
  );
  const magneticScore = zscoreToScore(
    zscore(magMag(t), baseline.magMean, baseline.magStd),
  );
  const thermalScore = zscoreToScore(
    zscore(t.temp_c, baseline.tempMean, baseline.tempStd),
  );
  const seismicScore = zscoreToScore(
    zscore(motion, baseline.seismicMean, baseline.seismicStd),
  );

  const total =
    vlfScore * 0.40 +
    magneticScore * 0.30 +
    thermalScore * 0.20 +
    seismicScore * 0.10;

  let level: AnomalyScore["level"];
  if (total >= 80) level = "Kritik";
  else if (total >= 60) level = "Yüksek";
  else if (total >= 30) level = "Şüpheli";
  else level = "Normal";

  return {
    nodeId: t.nodeId,
    total,
    vlfScore,
    magneticScore,
    thermalScore,
    seismicScore,
    level,
    motionFiltered,
  };
}

/**
 * Get current anomaly score for a nodeId without ingesting a new point.
 */
export function getCurrentScore(nodeId: string): AnomalyScore | null {
  const baseline = getBaseline(nodeId);
  if (!baseline || baseline.count === 0) return null;
  // Reconstruct a dummy score based on baseline
  return {
    nodeId,
    total: 0,
    vlfScore: 0,
    magneticScore: 0,
    thermalScore: 0,
    seismicScore: 0,
    level: "Normal",
    motionFiltered: false,
  };
}
