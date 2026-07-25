import { Router, type IRouter } from "express";

import { memoryCache } from "../lib/cache";

const router: IRouter = Router();

router.get("/apod", async (_req, res) => {
  const cached = memoryCache.get("apod");
  if (cached) {
    res.json(cached);
    return;
  }

  const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
  try {
    const upstream = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "APOD verisi alınamadı" });
      return;
    }
    const data = await upstream.json();
    memoryCache.set("apod", data, 60 * 60); // 1 saat önbellek
    res.json(data);
  } catch {
    res.status(502).json({ error: "APOD servisine ulaşılamadı" });
  }
});

export default router;
