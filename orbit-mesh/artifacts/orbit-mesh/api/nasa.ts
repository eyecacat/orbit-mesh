// ============================================================
// ORBIT-MESH — NASA DONKI Proxy (Vercel Serverless Function)
// ------------------------------------------------------------
// Geliştirilmiş Versiyon: Hem 'start/end' hem de 'startDate/endDate'
// parametrelerini esnek bir şekilde yakalar. Böylece mobil uygulamada
// hangi isimlendirme kullanılırsa kullanılsın backend çökmez.
//
// Kullanım: GET /api/nasa?type=FLR&start=YYYY-MM-DD&end=YYYY-MM-DD
// Veya:    GET /api/nasa?type=FLR&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ============================================================

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Sadece GET destekleniyor." });
    return;
  }

  const apiKey = process.env.NASA_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "Sunucu yapilandirma hatasi: NASA_API_KEY tanimli degil." });
    return;
  }

  // KRİTİK DÜZELTME: Hem kısa hem de uzun parametre adlarını yedekli (fallback) olarak kontrol ediyoruz.
  const type = req.query?.type;
  const start = req.query?.start || req.query?.startDate;
  const end = req.query?.end || req.query?.endDate;

  if (type !== "FLR" && type !== "GST" && type !== "CME") {
    res.status(400).json({ error: "'type' parametresi FLR, GST veya CME olmali." });
    return;
  }

  if (!start || !end) {
    res.status(400).json({ 
      error: "Tarih parametreleri eksik! 'start'/'startDate' ve 'end'/'endDate' alanlarından biri zorunludur." 
    });
    return;
  }

  try {
    // NASA upstream API'sine her halükarda doğru parametre adlarıyla (startDate/endDate) iletiyoruz
    const upstream = await fetch(
      `https://api.nasa.gov/DONKI/${type}?startDate=${start}&endDate=${end}&api_key=${apiKey}`
    );

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `NASA DONKI HTTP ${upstream.status}` });
      return;
    }

    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    res.status(502).json({ error: message });
  }
}