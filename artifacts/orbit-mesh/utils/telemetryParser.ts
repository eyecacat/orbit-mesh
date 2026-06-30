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
 
  // ── Bilimsel güvenilirlik alanları (opsiyonel) ─────────────────────────
  // Bu alanlar firmware'in genişletilmiş (tam) JSON'unda bulunur. APK'nın
  // kısa BLE JSON'unda olmayabilir (MTU/boyut kısıtı), bu yüzden hepsi
  // opsiyonel ve makul varsayılanlarla doldurulur. Sensör Sağlık Skoru,
  // Self-Test ve Confidence Index ekranları bunları kullanır.
  input_fault?: boolean;
  mains_noise?: boolean;
  signal_quality?: number; // 0-100, firmware SNR(dB)'den hesaplar
  noise_floor?: number;
  activity_index?: number; // 0-100
  space_state?: string; // QUIET | WATCH | ACTIVE | DISTURBED | BURST | INPUT_FAULT | MAINS_NOISE
  ai_state?: string;
  ai_confidence?: number; // 0-1
  trend?: string; // RISING | FALLING | STABLE
  battery_pct?: number;
  education_message?: string;
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
 
    // Sağlık/güvenilirlik alanları — firmware gönderiyorsa yakala,
    // göndermiyorsa undefined kalır (UI bunu "veri yok" olarak yorumlar).
    input_fault: p.input_fault !== undefined ? Boolean(p.input_fault) : undefined,
    mains_noise: p.mains_noise !== undefined ? Boolean(p.mains_noise) : undefined,
    signal_quality: p.signal_quality !== undefined ? Number(p.signal_quality) : undefined,
    noise_floor: p.noise_floor !== undefined ? Number(p.noise_floor) : undefined,
    activity_index: p.activity_index !== undefined ? Number(p.activity_index) : undefined,
    space_state: typeof p.space_state === "string" ? p.space_state : undefined,
    ai_state: typeof p.ai_state === "string" ? p.ai_state : undefined,
    ai_confidence: p.ai_confidence !== undefined ? Number(p.ai_confidence) : undefined,
    trend: typeof p.trend === "string" ? p.trend : undefined,
    battery_pct: p.battery_pct !== undefined ? Number(p.battery_pct) : undefined,
    education_message: typeof p.education_message === "string" ? p.education_message : undefined,
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
 
