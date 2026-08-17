// utils/telemetryParser.ts
// ORBIT-MESH PRO V2.1 ULTRA FIRMWARE İLE TAM UYUMLU
// Tüm alan adları firmware'in buildJson() çıktısıyla birebir eşleşir.

export interface OrbitMeshTelemetry {
  nodeId: string;
  uptime: number;               // saniye cinsinden çalışma süresi
  vlf_hz: number;
  vlf_amp: number;              // firmware'de "vlf_amp"
  bat: number;                  // firmware'de "bat"
  anomaly: boolean;
  fault: boolean;               // firmware'de "fault" (input_fault değil)
  mains: boolean;               // firmware'de "mains" (mains_noise değil)
  sq: number;                   // firmware'de "sq" (signal_quality değil)
  act: number;                  // firmware'de "act" (activity_index değil)
  state: string;                // firmware'de "state" (space_state değil)
  // ---- Yeni özellikler (firmware'den gelir) ----
  sch_active: boolean;
  sch_hz: number;
  sch_ratio: number;
  ads1: number;                 // 16-bit ADS1115 kanal 1 (volt)
  ads2: number;                 // 16-bit ADS1115 kanal 2 (volt)
  b6_10: number;                // 6-10 Hz bant enerjisi
  b17_25: number;               // 17-25 Hz bant enerjisi
  b45_55: number;               // 45-55 Hz şebeke gürültüsü
  wave_dir: number;             // yön (derece)
  wave_src: string;             // kaynak yönü (KUZEYDOGU, vs.)
  wave_coh: number;             // tutarlılık (0-1)
  mot_vel: number;              // iyonosferik hız (km/s)
  mot_head: number;             // hareket yönü (derece)
  mot_trend: string;            // STATIONARY / APPROACHING / RECEDING
  mot_conf: number;             // güven seviyesi (%)
  pqc_seed: string;             // 32 hex karakter PQC seed

  // ---- Mobil tarafından eklenen alanlar (firmware'den gelmez) ----
  receivedAt: number;           // alınma zamanı (Date.now())
}

/**
 * Base64'ü UTF-8 string'e çevirir (BLE karakteristik değeri genelde base64 olur)
 */
export function base64ToUtf8(base64: string): string {
  try {
    return atob(base64.replace(/\s/g, ""));
  } catch {
    return "";
  }
}

/**
 * Varsayılan (boş) telemetri nesnesi oluşturur
 */
function createEmptyTelemetry(): OrbitMeshTelemetry {
  return {
    nodeId: "ORBIT-MESH",
    uptime: 0,
    vlf_hz: 0,
    vlf_amp: 0,
    bat: 0,
    anomaly: false,
    fault: false,
    mains: false,
    sq: 0,
    act: 0,
    state: "INIT",
    sch_active: false,
    sch_hz: 7.83,
    sch_ratio: 0,
    ads1: 0,
    ads2: 0,
    b6_10: 0,
    b17_25: 0,
    b45_55: 0,
    wave_dir: 0,
    wave_src: "UNKNOWN",
    wave_coh: 0,
    mot_vel: 0,
    mot_head: 0,
    mot_trend: "STATIONARY",
    mot_conf: 0,
    pqc_seed: "0".repeat(32),
    receivedAt: Date.now(),
  };
}

/**
 * Firmware'den gelen JSON'u ayrıştırır ve OrbitMeshTelemetry nesnesine dönüştürür.
 * Tüm alanlar firmware'in buildJson() çıktısına göre eşlenir.
 */
function parseJsonTelemetry(raw: string): OrbitMeshTelemetry {
  const p = JSON.parse(raw);

  return {
    nodeId: String(p.nodeId ?? "ORBIT-MESH"),
    uptime: Number(p.uptime ?? 0),
    vlf_hz: Number(p.vlf_hz ?? 0),
    vlf_amp: Number(p.vlf_amp ?? 0),
    bat: Number(p.bat ?? 0),
    anomaly: Boolean(p.anomaly),
    fault: Boolean(p.fault),
    mains: Boolean(p.mains),
    sq: Number(p.sq ?? 0),
    act: Number(p.act ?? 0),
    state: String(p.state ?? "INIT"),
    sch_active: Boolean(p.sch_active),
    sch_hz: Number(p.sch_hz ?? 7.83),
    sch_ratio: Number(p.sch_ratio ?? 0),
    ads1: Number(p.ads1 ?? 0),
    ads2: Number(p.ads2 ?? 0),
    b6_10: Number(p.b6_10 ?? 0),
    b17_25: Number(p.b17_25 ?? 0),
    b45_55: Number(p.b45_55 ?? 0),
    wave_dir: Number(p.wave_dir ?? 0),
    wave_src: String(p.wave_src ?? "UNKNOWN"),
    wave_coh: Number(p.wave_coh ?? 0),
    mot_vel: Number(p.mot_vel ?? 0),
    mot_head: Number(p.mot_head ?? 0),
    mot_trend: String(p.mot_trend ?? "STATIONARY"),
    mot_conf: Number(p.mot_conf ?? 0),
    pqc_seed: String(p.pqc_seed ?? "0".repeat(32)),
    receivedAt: Date.now(),
  };
}

/**
 * Ana parse fonksiyonu – BLE'dan gelen base64 string'i işler.
 * @param base64Value - BLE characteristic'ten okunan base64 kodlu payload
 * @returns { data: OrbitMeshTelemetry | null, raw: string, error?: string }
 */
export function parseTelemetry(base64Value: string): {
  data: OrbitMeshTelemetry | null;
  raw: string;
  error?: string;
} {
  // Güvenlik: 10KB'dan büyük paketleri reddet
  if (base64Value.length > 13000) {
    return { data: null, raw: "", error: "Paket boyutu çok büyük (>10KB)" };
  }

  try {
    const raw = base64ToUtf8(base64Value).trim();
    if (!raw) {
      return { data: null, raw, error: "Boş payload" };
    }

    // JSON formatında mı?
    if (raw.startsWith("{")) {
      const data = parseJsonTelemetry(raw);
      return { data, raw };
    }

    // Düz metin formatı (eski veya hata durumu)
    // Bu durumda basitçe boş telemetri döndürüp ham metni ekleyelim
    const fallback = createEmptyTelemetry();
    fallback.state = "TEXT_MODE";
    fallback.receivedAt = Date.now();
    return { data: fallback, raw };
  } catch (err: any) {
    return {
      data: null,
      raw: "",
      error: err?.message ?? "Bilinmeyen parse hatası",
    };
  }
}

/**
 * Telemetri verisinin "anomalili" olup olmadığını kontrol eder (yardımcı)
 */
export function hasAnomaly(t: OrbitMeshTelemetry): boolean {
  return t.anomaly || t.fault || t.mains;
}

/**
 * Sinyal kalitesini metin olarak döndürür
 */
export function signalQualityLabel(sq: number): string {
  if (sq >= 60) return "İyi";
  if (sq >= 40) return "Orta";
  if (sq >= 20) return "Zayıf";
  return "Kötü";
}
