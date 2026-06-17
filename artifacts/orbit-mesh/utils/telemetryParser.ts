/**
 * Telemetry parser for ORBIT-MESH BLE node notifications.
 *
 * BLE characteristic values arrive as base64-encoded UTF-8 strings.
 * Decode: base64 → byte array → UTF-8 string → JSON.parse
 *
 * Extended fields for seismic mesh network:
 *   vlf_hz, vlf_amplitude, battery, temp_c,
 *   mx, my, mz (magnetometer), ax, ay, az (accelerometer)
 */

export interface NodeTelemetry {
  nodeId: string;
  timestamp: number;
  vlf_hz: number;
  vlf_amplitude: number;
  battery: number;
  temp_c: number;
  mx: number;
  my: number;
  mz: number;
  ax: number;
  ay: number;
  az: number;
  anomaly: boolean;
  receivedAt: number;
}

/**
 * Decode a base64 string to a UTF-8 string using Hermes-safe approach.
 * React Native / Hermes has `atob` available since RN 0.71.
 */
export function base64ToUtf8(base64: string): string {
  // Use native atob if available (Hermes, modern RN)
  if (typeof atob !== "undefined") {
    try {
      const binary = atob(base64.replace(/\s/g, ""));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      // TextDecoder for correct UTF-8 handling
      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder("utf-8").decode(bytes);
      }
      // Fallback: latin1 is fine for ASCII JSON
      return binary;
    } catch {
      // fall through to manual decoder
    }
  }

  // Manual base64 decoder fallback (ASCII/Latin1 safe for JSON payloads)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  const str = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  let i = 0;
  while (i < str.length) {
    const a = chars.indexOf(str[i++]);
    const b = chars.indexOf(str[i++]);
    const c = chars.indexOf(str[i++]);
    const d = chars.indexOf(str[i++]);
    if (a < 0 || b < 0) break;
    out += String.fromCharCode((a << 2) | (b >> 4));
    if (c >= 0 && str[i - 2] !== "=") out += String.fromCharCode(((b & 0xf) << 4) | (c >> 2));
    if (d >= 0 && str[i - 1] !== "=") out += String.fromCharCode(((c & 0x3) << 6) | d);
  }
  return out;
}

/**
 * Parse BLE notification value (base64) into NodeTelemetry.
 * Returns null on any decode/parse error with a descriptive reason.
 */
export function parseTelemetry(
  base64Value: string
): { data: NodeTelemetry; raw: string } | { data: null; raw: string; error: string } {
  let raw = "";
  try {
    raw = base64ToUtf8(base64Value).trim();
    if (!raw) {
      return { data: null, raw, error: "Boş payload" };
    }

    // Some firmware may send bare numbers or CSV — handle JSON only
    if (!raw.startsWith("{")) {
      return { data: null, raw, error: `JSON değil: ${raw.slice(0, 40)}` };
    }

    const parsed = JSON.parse(raw);

    const telemetry: NodeTelemetry = {
      nodeId: String(parsed.nodeId ?? parsed.node_id ?? parsed.id ?? "unknown"),
      timestamp: Number(parsed.timestamp ?? parsed.ts ?? Date.now()),
      // VLF variants
      vlf_hz: parseFloat(parsed.vlf_hz ?? parsed.vlf ?? parsed.frequency ?? parsed.freq ?? 0),
      vlf_amplitude: parseFloat(parsed.vlf_amplitude ?? parsed.amplitude ?? parsed.amp ?? parsed.vlf_amp ?? 0),
      // Battery
      battery: parseFloat(parsed.battery ?? parsed.bat ?? parsed.batt ?? 0),
      // Temperature
      temp_c: parseFloat(parsed.temp_c ?? parsed.temp ?? parsed.temperature ?? 0),
      // Magnetometer
      mx: parseFloat(parsed.mx ?? parsed.mag_x ?? parsed.magx ?? parsed.magnetometerX ?? 0),
      my: parseFloat(parsed.my ?? parsed.mag_y ?? parsed.magy ?? parsed.magnetometerY ?? 0),
      mz: parseFloat(parsed.mz ?? parsed.mag_z ?? parsed.magz ?? parsed.magnetometerZ ?? 0),
      // Accelerometer
      ax: parseFloat(parsed.ax ?? parsed.acc_x ?? parsed.accx ?? parsed.accelerometerX ?? 0),
      ay: parseFloat(parsed.ay ?? parsed.acc_y ?? parsed.accy ?? parsed.accelerometerY ?? 0),
      az: parseFloat(parsed.az ?? parsed.acc_z ?? parsed.accz ?? parsed.accelerometerZ ?? 0),
      anomaly: Boolean(parsed.anomaly ?? parsed.alert ?? parsed.warn ?? false),
      receivedAt: Date.now(),
    };

    return { data: telemetry, raw };
  } catch (err: any) {
    return { data: null, raw, error: `Parse hatası: ${err?.message ?? err}` };
  }
}

/** Compute magnitude of the magnetic vector */
export function magneticMagnitude(t: NodeTelemetry): number {
  return Math.sqrt(t.mx * t.mx + t.my * t.my + t.mz * t.mz);
}

/** Compute motion magnitude from accelerometer */
export function motionMagnitude(t: NodeTelemetry): number {
  return Math.sqrt(t.ax * t.ax + t.ay * t.ay + t.az * t.az);
}

/** Check if node is likely moving (motion > 1.5 m/s²)
 *  At rest: ~9.8 m/s² (gravity). Small deviation is normal.
 *  Threshold: > 1.5 m/s² from expected gravity.
 */
export function isNodeMoving(t: NodeTelemetry, threshold: number = 1.5): boolean {
  const motion = motionMagnitude(t);
  // Gravity is roughly 1.0g = 9.8 m/s² if normalized, or 1.0 if raw
  // ESP32 LSM303 likely reports raw values; use threshold as absolute deviation
  return Math.abs(motion - 1.0) > threshold;
}
