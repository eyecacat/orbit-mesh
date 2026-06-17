/**
 * Baseline Engine
 * Rolling statistics per node for the last 24 hours.
 * Uses a simple windowed buffer — real data is stored in-memory.
 */

import type { NodeTelemetry } from "@/utils/telemetryParser";

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

// Window in milliseconds: 24 hours
const WINDOW_MS = 24 * 60 * 60 * 1000;

// In-memory store per node
const _buffers: Record<string, NodeTelemetry[]> = {};

function getBuffer(nodeId: string): NodeTelemetry[] {
  return (_buffers[nodeId] ??= []);
}

function prune(buffer: NodeTelemetry[]): NodeTelemetry[] {
  const cutoff = Date.now() - WINDOW_MS;
  return buffer.filter(t => t.receivedAt > cutoff);
}

function meanStd(arr: number[]): { mean: number; std: number } {
  if (arr.length === 0) return { mean: 0, std: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length;
  return { mean, std: Math.sqrt(variance) };
}

function magneticMag(t: NodeTelemetry): number {
  return Math.sqrt(t.mx * t.mx + t.my * t.my + t.mz * t.mz);
}

function seismicMag(t: NodeTelemetry): number {
  return Math.sqrt(t.ax * t.ax + t.ay * t.ay + t.az * t.az);
}

/**
 * Ingest a telemetry point and update the rolling baseline.
 */
export function ingestBaseline(nodeId: string, t: NodeTelemetry): BaselineStats {
  const buffer = prune(getBuffer(nodeId));
  buffer.push(t);
  // Keep buffer sorted by time
  buffer.sort((a, b) => a.receivedAt - b.receivedAt);
  _buffers[nodeId] = buffer;

  const vlfArr = buffer.map(x => x.vlf_hz);
  const magArr = buffer.map(magneticMag);
  const tempArr = buffer.map(x => x.temp_c);
  const seismicArr = buffer.map(seismicMag);

  const vlf = meanStd(vlfArr);
  const mag = meanStd(magArr);
  const temp = meanStd(tempArr);
  const seismic = meanStd(seismicArr);

  return {
    vlfMean: vlf.mean,
    vlfStd: vlf.std,
    magMean: mag.mean,
    magStd: mag.std,
    tempMean: temp.mean,
    tempStd: temp.std,
    seismicMean: seismic.mean,
    seismicStd: seismic.std,
    count: buffer.length,
  };
}

export function getBaseline(nodeId: string): BaselineStats | null {
  const buffer = prune(getBuffer(nodeId));
  if (buffer.length === 0) return null;
  return ingestBaseline(nodeId, buffer[buffer.length - 1]);
}

export function resetBaseline(nodeId: string): void {
  delete _buffers[nodeId];
}

export function getAllNodeIds(): string[] {
  return Object.keys(_buffers);
}
