import { Router, type IRouter } from "express";
import { memoryCache } from "../lib/cache";

const router: IRouter = Router();

router.get("/nasa", async (req, res) => {
  const type = req.query?.type;
  const start = req.query?.start || req.query?.startDate;
  const end = req.query?.end || req.query?.endDate;

  if (type !== "FLR" && type !== "GST" && type !== "CME") {
    res.status(400).json({ error: "'type' parametresi FLR, GST veya CME olmali." });
    return;
  }

  if (!start || !end) {
    res.status(400).json({
      error: "Tarih parametreleri eksik! 'start'/'startDate' ve 'end'/'endDate' alanlarindan biri zorunludur.",
    });
    return;
  }

  const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
  const cacheKey = `nasa:${type}:${start}:${end}`;

  const cached = memoryCache.get(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  try {
    let upstream: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      upstream = await fetch(
        `https://api.nasa.gov/DONKI/${type}?startDate=${start}&endDate=${end}&api_key=${apiKey}`,
      );
      if (upstream.ok) break;
      if (upstream.status === 429 && attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      break;
    }

    if (!upstream || !upstream.ok) {
      const status = upstream?.status || 502;
      res.status(status).json({ error: `NASA DONKI HTTP ${status}` });
      return;
    }

    const data = await upstream.json();
    memoryCache.set(cacheKey, data, 900); // 15 dakika
    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    res.status(502).json({ error: message });
  }
});

export default router;
