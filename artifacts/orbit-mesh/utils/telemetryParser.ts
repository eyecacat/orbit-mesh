/**
 * Telemetry parser for ORBIT-MESH BLE node notifications.
 *
 * BLE characteristic values arrive as base64-encoded UTF-8 strings.
 * Decode: base64 → byte array → UTF-8 string → JSON.parse
 */

export interface NodeTelemetry {
  nodeId: string;
  timestamp: number;
  vlf_hz: number;
  vlf_amplitude: number;
  battery: number;
  temp_c: number;
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
      vlf_hz: parseFloat(parsed.vlf_hz ?? parsed.vlf ?? parsed.frequency ?? 0),
      vlf_amplitude: parseFloat(parsed.vlf_amplitude ?? parsed.amplitude ?? parsed.amp ?? 0),
      battery: parseFloat(parsed.battery ?? parsed.bat ?? parsed.batt ?? 0),
      temp_c: parseFloat(parsed.temp_c ?? parsed.temp ?? parsed.temperature ?? 0),
      anomaly: Boolean(parsed.anomaly ?? parsed.alert ?? false),
      receivedAt: Date.now(),
    };

    // Validate — if all numerics are exactly 0 AND we have a raw JSON, warn but still return
    return { data: telemetry, raw };
  } catch (err: any) {
    return { data: null, raw, error: `Parse hatası: ${err?.message ?? err}` };
  }
}
