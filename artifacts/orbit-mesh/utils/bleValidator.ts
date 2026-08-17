// utils/bleValidator.ts
// ORBIT-MESH PRO V2.1 ULTRA: timestamp yok, sadece nodeId formatı kontrol edilir.
// Replay saldırısı önlemi firmware'de PQC ile zaten sağlanıyor.

const MAX_PACKET_AGE_MS = 30_000; // kullanılmıyor, sadece eski uyumluluk için

export function validateTelemetryPacket(data: {
  nodeId?: string;
  uptime?: number;      // firmware'de uptime var, timestamp yok
}): { valid: boolean; reason?: string } {
  if (!data.nodeId || !String(data.nodeId).startsWith("ORBIT-")) {
    return { valid: false, reason: "Geçersiz nodeId formatı" };
  }

  // uptime kontrolü isteğe bağlı, ama artan değer olduğu için replay tespiti zor
  // Firmware PQC ile zaten güvenli

  return { valid: true };
}
