// ============================================================
// ORBIT-MESH — Uzay Hava Durumu Proxy (Vercel Serverless Function)
// ------------------------------------------------------------
// NOAA SWPC verisini çeker: Kp indeksi, manyetik fırtına uyarıları,
// ve güneş radyasyonu verisi. Demo/simülasyon yok; tamamen gerçek veri.
// Kullanım: GET /api/space-weather
// ============================================================

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Sadece GET destekleniyor." });
    return;
  }

  try {
    const [kpRes, alertRes] = await Promise.all([
      fetch("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"),
      fetch("https://services.swpc.noaa.gov/products/alerts.json"),
    ]);

    if (!kpRes.ok || !alertRes.ok) {
      res.status(502).json({ error: "NOAA SWPC verisi alinamadi." });
      return;
    }

    const kpData = await kpRes.json();
    const alerts = await alertRes.json();

    const rows = Array.isArray(kpData) ? kpData : [];
    const latest = rows[rows.length - 1];
    const kp =
      latest && typeof latest === "object"
        ? typeof latest.estimated_kp === "number"
          ? latest.estimated_kp
          : typeof latest.kp_index === "number"
            ? latest.kp_index
            : null
        : null;

    const now = new Date().toISOString();

    res.status(200).json({
      kp: kp ?? null,
      kpTime: latest && typeof latest === "object" && typeof latest.time_tag === "string" ? latest.time_tag : null,
      alerts: Array.isArray(alerts) ? alerts.slice(0, 5) : [],
      fetchedAt: now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    res.status(502).json({ error: message });
  }
}
