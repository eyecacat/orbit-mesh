export interface NodeTelemetry {
  nodeId: string;
  timestamp: number;
  vlf_hz: number;
  vlf_amplitude: number;
  battery: number;
  temp_c: number;
  // [ŞEMA-PATCH] Önceden "mx/my/mz" (manyetometre çağrışımlı) idi. Cihazda
  // (MPU6050) manyetometre yok; veri her zaman jiroskoptu (deg/s cinsinden
  // açısal hız). Firmware ve buradaki isim artık eşleşiyor — bkz.
  // ORBIT_MESH_PRO_V2_FIXED.ino buildBleTelemetry() [ŞEMA-PATCH].
  gx: number;
  gy: number;
  gz: number;
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
    gx: 0,
    gy: 0,
    gz: 0,
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
    // [ŞEMA-PATCH] gx/gy/gz birincil; p.mx/my/mz fallback'i SADECE henüz eski
    // firmware'le çalışan (reflash edilmemiş) sahadaki cihazlarla geriye dönük
    // uyumluluk için var. Tüm node'lar güncellendiğinde bu fallback kaldırılabilir.
    gx: Number(p.gx ?? p.mx ?? 0),
    gy: Number(p.gy ?? p.my ?? 0),
    gz: Number(p.gz ?? p.mz ?? 0),
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
  // Güvenlik: 10KB'dan büyük BLE paketleri reddet (normal paket < 1KB)
  if (base64Value.length > 13000) {
    return { data: null, raw: "", error: "Paket boyutu aşıldı (max 10KB)" };
  }
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

/**
 * [ŞEMA-PATCH] İsim tarihsel nedenlerle "magneticMagnitude" kalmıştır (UI
 * ekranlarında bu isimle çağrılıyor olabilir — dosyaları görmediğimiz için
 * güvenli tarafta kalınıp isim değiştirilmedi). Ancak hesaplanan büyüklük
 * artık gerçek fiziğiyle örtüşüyor: jiroskop (açısal hız) normu, ‖ω‖ =
 * √(gx²+gy²+gz²), deg/s cinsinden. Manyetometre bu cihazda yok.
 */
export function magneticMagnitude(t: NodeTelemetry) {
  return Math.sqrt(t.gx * t.gx + t.gy * t.gy + t.gz * t.gz);
}

export function motionMagnitude(t: NodeTelemetry) {
  return Math.sqrt(t.ax * t.ax + t.ay * t.ay + t.az * t.az);
}

export function isNodeMoving(t: NodeTelemetry, threshold = 0.3) {
  const mag = motionMagnitude(t);
  return Math.abs(mag - 1) > threshold;
}

