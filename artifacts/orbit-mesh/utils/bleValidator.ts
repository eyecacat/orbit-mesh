const MAX_PACKET_AGE_MS = 30_000; // 30 saniye

export function validateTelemetryPacket(data: {
  nodeId?: string;
  timestamp?: number;
}): { valid: boolean; reason?: string } {
  if (!data.nodeId || !String(data.nodeId).startsWith("ORBIT-")) {
    return { valid: false, reason: "Geçersiz nodeId formatı" };
  }

  if (data.timestamp) {
    const age = Date.now() - data.timestamp;
    if (age > MAX_PACKET_AGE_MS) {
      return { valid: false, reason: `Replay saldırısı: paket ${Math.round(age/1000)}s eski` };
    }
    if (age < -5000) {
      return { valid: false, reason: "Gelecek zaman damgası — sahte paket" };
    }
  }

  return { valid: true };
}
