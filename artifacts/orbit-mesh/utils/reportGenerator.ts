export interface ObservationRecord {
  id: string;
  timestamp: string;
  nodeId?: string;
  school?: string;
  city?: string;
  vlf_hz?: number;
  vlf_amplitude?: number;
  activity_index?: number;
  signal_quality?: number;
  space_state?: string;
  trend?: string;
  ai_confidence?: number;
  confidence_score?: number;
  data_quality_label?: string;
  mag?: { x: number; y: number; z: number };
  accel?: { x: number; y: number; z: number };
  ble_connected?: boolean;
  anomaly?: boolean;
}

export function makeObservationId(index: number, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(index).padStart(4, "0");
  return `OBS-${y}${m}${d}-${seq}`;
}

const CSV_COLUMNS: (keyof ObservationRecord)[] = [
  "id","timestamp","nodeId","school","city",
  "vlf_hz","vlf_amplitude","activity_index","signal_quality",
  "space_state","trend","ai_confidence","confidence_score",
  "data_quality_label","ble_connected","anomaly",
];

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(records: ObservationRecord[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = records.map(r => CSV_COLUMNS.map(c => csvEscape(r[c])).join(","));
  return [header, ...rows].join("\n");
}

function qualityColor(score: number): string {
  if (score >= 80) return "#00C896";
  if (score >= 50) return "#F5A524";
  return "#F31260";
}

export function buildReportHtml(records: ObservationRecord[], meta: { school?: string; city?: string }): string {
  const now = new Date();
  const generatedAt = now.toLocaleString("tr-TR");
  const total = records.length;
  const avgConfidence = total > 0
    ? Math.round(records.reduce((s, r) => s + (r.confidence_score ?? 0), 0) / total)
    : 0;
  const anomalyCount = records.filter(r => r.anomaly).length;

  const rowsHtml = records.slice().reverse().map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${new Date(r.timestamp).toLocaleString("tr-TR")}</td>
      <td>${r.vlf_hz?.toFixed(2) ?? "—"} Hz</td>
      <td>${r.vlf_amplitude?.toFixed(1) ?? "—"}</td>
      <td>${r.space_state ?? "—"}</td>
      <td>${r.trend ?? "—"}</td>
      <td style="color:${qualityColor(r.confidence_score ?? 0)};font-weight:bold;">%${r.confidence_score ?? "—"}</td>
      <td>${r.anomaly ? "EVET" : "Hayır"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/>
<style>
body{font-family:Arial,sans-serif;color:#0f172a;padding:24px;}
h1{font-size:22px;color:#1e3a8a;margin-bottom:4px;}
.sub{color:#64748b;font-size:12px;margin-bottom:20px;}
.summary{display:flex;gap:16px;margin-bottom:24px;}
.box{flex:1;background:#f1f5f9;border-radius:8px;padding:12px;text-align:center;}
.box .lbl{font-size:10px;color:#64748b;text-transform:uppercase;}
.box .val{font-size:20px;font-weight:bold;margin-top:4px;}
table{width:100%;border-collapse:collapse;font-size:11px;}
th{background:#1e3a8a;color:#fff;padding:8px;text-align:left;}
td{padding:6px 8px;border-bottom:1px solid #e2e8f0;}
tr:nth-child(even){background:#f8fafc;}
.footer{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;}
</style></head><body>
<h1>ORBIT-MESH Bilimsel Gözlem Raporu</h1>
<div class="sub">${meta.school ?? "ORBIT School"}${meta.city ? " · " + meta.city : ""} · ${generatedAt}</div>
<div class="summary">
  <div class="box"><div class="lbl">Toplam Gözlem</div><div class="val">${total}</div></div>
  <div class="box"><div class="lbl">Ort. Güven</div><div class="val" style="color:${qualityColor(avgConfidence)}">%${avgConfidence}</div></div>
  <div class="box"><div class="lbl">Anomali</div><div class="val">${anomalyCount}</div></div>
</div>
<table><thead><tr>
  <th>Observation ID</th><th>Zaman</th><th>VLF Hz</th><th>Amplitüd</th>
  <th>Durum</th><th>Eğilim</th><th>Güven</th><th>Anomali</th>
</tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="footer">ORBIT-MESH — Türkiye Okul Bilim Gözlem Ağı · TEKNOFEST 2026</div>
</body></html>`;
}
