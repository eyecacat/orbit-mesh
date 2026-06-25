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

export function base64ToUtf8(base64: string): string {
  try {
    const binary = atob(base64.replace(/\s/g, ""));
    return binary;
  } catch {
    return "";
  }
}

function createEmptyTelemetry(): NodeTelemetry {
  return {
    nodeId: "ORBIT-MESH",
    timestamp: Date.now(),
    vlf_hz: 0,
    vlf_amplitude: 0,
    battery: 0,
    temp_c: 0,
    mx: 0,
    my: 0,
    mz: 0,
    ax: 0,
    ay: 0,
    az: 0,
    anomaly: false,
    receivedAt: Date.now(),
  };
}

function parseTextTelemetry(raw: string): NodeTelemetry {
  const t = createEmptyTelemetry();

  t.anomaly =
    raw.includes("FAULT") || raw.includes("ALERT") || raw.includes("ANOMALY");

  const lvl = raw.match(/LVL=([A-Z_]+)/);
  if (lvl?.[1] === "FAULT") {
    t.anomaly = true;
  }

  const ai = raw.match(/AI=[A-Z_]+\(([0-9.]+)\)/);

  if (ai) {
    t.vlf_amplitude = Number(ai[1]) * 100;
  }

  return t;
}

function parseJsonTelemetry(raw: string): NodeTelemetry {
  const p = JSON.parse(raw);

  return {
    nodeId: String(p.nodeId ?? p.id ?? "ORBIT-MESH"),
    timestamp: Number(p.timestamp ?? Date.now()),
    vlf_hz: Number(p.vlf_hz ?? 0),
    vlf_amplitude: Number(p.vlf_amplitude ?? 0),
    battery: Number(p.battery ?? 0),
    temp_c: Number(p.temp_c ?? 0),
    mx: Number(p.mx ?? 0),
    my: Number(p.my ?? 0),
    mz: Number(p.mz ?? 0),
    ax: Number(p.ax ?? 0),
    ay: Number(p.ay ?? 0),
    az: Number(p.az ?? 0),
    anomaly: Boolean(p.anomaly),
    receivedAt: Date.now(),
  };
}

export function parseTelemetry(base64Value: string) {
  try {
    const raw = base64ToUtf8(base64Value).trim();

    if (!raw) {
      return {
        data: null,
        raw,
        error: "Boş payload",
      };
    }

    if (raw.startsWith("{")) {
      return {
        data: parseJsonTelemetry(raw),
        raw,
      };
    }

    return {
      data: parseTextTelemetry(raw),
      raw,
    };
  } catch (err: any) {
    return {
      data: null,
      raw: "",
      error: err?.message ?? "Parse error",
    };
  }
}

export function magneticMagnitude(t: NodeTelemetry) {
  return Math.sqrt(t.mx * t.mx + t.my * t.my + t.mz * t.mz);
}

export function motionMagnitude(t: NodeTelemetry) {
  return Math.sqrt(t.ax * t.ax + t.ay * t.ay + t.az * t.az);
}

export function isNodeMoving(t: NodeTelemetry, threshold = 0.3) {
  const mag = motionMagnitude(t);
  return Math.abs(mag - 1) > threshold;
}
