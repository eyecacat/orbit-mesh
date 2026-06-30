// ============================================================
// ORBIT-MESH — NASA DONKI Proxy (Vercel Serverless Function)
// ------------------------------------------------------------
// Ayni mantik: NASA_API_KEY, Vercel Dashboard'da EXPO_PUBLIC_
// ONEKI OLMADAN tanimlanir. Bu fonksiyon Expo'nun build modundan
// bagimsiz olarak Vercel tarafindan otomatik tanindigi icin
// garanti calisir.
//
// Kullanim: GET /api/nasa?type=FLR&start=YYYY-MM-DD&end=YYYY-MM-DD
// type: FLR | GST | CME
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

  const { type, start, end } = req.query ?? {};

  if (type !== "FLR" && type !== "GST" && type !== "CME") {
    res.status(400).json({ error: "'type' parametresi FLR, GST veya CME olmali." });
    return;
  }
  if (!start || !end) {
    res.status(400).json({ error: "'start' ve 'end' parametreleri zorunlu." });
    return;
  }

  try {
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