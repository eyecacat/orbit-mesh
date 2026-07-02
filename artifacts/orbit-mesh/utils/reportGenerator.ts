export interface ObservationRecord {
  id: string;
  timestamp: number;
  type?: string;
  notes?: string;
  metrics?: {
    zValue?: number;
    activityIndex?: number;
    spaceState?: string;
    [key: string]: unknown;
  };
  nodeId?: string;
  vlf_hz?: number;
  vlf_amplitude?: number;
  activity_index?: number;
  signal_quality?: number;
  space_state?: string;
  trend?: string;
  ai_confidence?: number;
  confidence_score?: number;
  anomaly?: boolean;
  mag?: { x: number; y: number; z: number };
  accel?: { x: number; y: number; z: number };
  ble_connected?: boolean;
}

// index parametresi opsiyonel - sıfır argümanla da çağrılabilir
export function makeObservationId(index = 0, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(index).padStart(4, "0");
  return `OBS-${y}${m}${d}-${seq}`;
}

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(records: ObservationRecord[]): string {
  const headers = ["id","timestamp","type","notes","vlf_hz","activity_index","signal_quality","space_state","trend","ai_confidence","confidence_score","anomaly","ble_connected"];
  const rows = records.map(r => [
    r.id,
    r.timestamp ? new Date(r.timestamp).toISOString() : "",
    r.type ?? r.space_state ?? "",
    r.notes ?? "",
    r.vlf_hz ?? r.metrics?.activityIndex ?? "",
    r.activity_index ?? r.metrics?.activityIndex ?? "",
    r.signal_quality ?? "",
    r.space_state ?? r.metrics?.spaceState ?? "",
    r.trend ?? "",
    r.ai_confidence ?? "",
    r.confidence_score ?? "",
    r.anomaly ?? "",
    r.ble_connected ?? "",
  ].map(csvEscape).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function qualityColor(score: number): string {
  if (score >= 80) return "#00C896";
  if (score >= 50) return "#F5A524";
  return "#F31260";
}

export function buildReportHtml(records: ObservationRecord[], meta?: { school?: string; city?: string }): string {
  const now = new Date();
  const total = records.length;
  const avgConf = total > 0
    ? Math.round(records.reduce((s, r) => s + (r.confidence_score ?? r.metrics?.activityIndex ?? 0), 0) / total)
    : 0;
  const anomalyCount = records.filter(r => r.anomaly).length;

  const rowsHtml = records.slice().reverse().map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.timestamp ? new Date(r.timestamp).toLocaleString("tr-TR") : "—"}</td>
      <td>${r.type ?? "VLF_OBS"}</td>
      <td>${r.vlf_hz?.toFixed(2) ?? r.metrics?.activityIndex?.toFixed(1) ?? "—"}</td>
      <td>${r.space_state ?? r.metrics?.spaceState ?? "—"}</td>
      <td>${r.trend ?? "—"}</td>
      <td style="color:${qualityColor(r.confidence_score ?? 0)};font-weight:bold;">%${r.confidence_score ?? "—"}</td>
      <td>${r.anomaly ? "EVET" : "Hayır"}</td>
      <td>${r.notes ?? ""}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/>
<style>
body{font-family:Arial,sans-serif;color:#0f172a;padding:24px;font-size:12px;}
h1{font-size:20px;color:#1e3a8a;margin-bottom:4px;}
.sub{color:#64748b;font-size:11px;margin-bottom:16px;}
.summary{display:flex;gap:12px;margin-bottom:20px;}
.box{flex:1;background:#f1f5f9;border-radius:6px;padding:10px;text-align:center;}
.box .lbl{font-size:9px;color:#64748b;text-transform:uppercase;}
.box .val{font-size:18px;font-weight:bold;margin-top:2px;}
table{width:100%;border-collapse:collapse;}
th{background:#1e3a8a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;}
td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;}
tr:nth-child(even){background:#f8fafc;}
.footer{margin-top:20px;font-size:9px;color:#94a3b8;text-align:center;}
</style></head><body>
<h1>ORBIT-MESH Bilimsel Gözlem Raporu</h1>
<div class="sub">${meta?.school ?? "ORBIT School"}${meta?.city ? " · " + meta.city : ""} · ${now.toLocaleString("tr-TR")}</div>
<div class="summary">
  <div class="box"><div class="lbl">Toplam Gözlem</div><div class="val">${total}</div></div>
  <div class="box"><div class="lbl">Ort. Aktivite</div><div class="val" style="color:${qualityColor(avgConf)}">%${avgConf}</div></div>
  <div class="box"><div class="lbl">Anomali</div><div class="val">${anomalyCount}</div></div>
</div>
<table><thead><tr>
  <th>Obs. ID</th><th>Zaman</th><th>Tip</th><th>VLF/Aktivite</th>
  <th>Durum</th><th>Eğilim</th><th>Güven</th><th>Anomali</th><th>Not</th>
</tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="footer">ORBIT-MESH — Türkiye Okul Bilim Gözlem Ağı · TEKNOFEST 2026</div>
</body></html>`;
}
