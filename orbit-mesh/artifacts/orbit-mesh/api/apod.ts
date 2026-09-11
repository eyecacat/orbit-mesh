export default async function handler(_req: any, res: any) {
  const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
  try {
    const upstream = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "APOD verisi alınamadı" });
    }
    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: "APOD servisine ulaşılamadı" });
  }
}
