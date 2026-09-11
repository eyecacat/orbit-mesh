import { Router, type IRouter } from "express";
import { memoryCache } from "../lib/cache";

const router: IRouter = Router();

router.get("/space-weather", async (_req, res) => {
  try {
    const cached = memoryCache.get("space-weather");
    if (cached) {
      res.status(200).json(cached);
      return;
    }

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

    const result = {
      kp: kp ?? null,
      kpTime: latest && typeof latest === "object" && typeof latest.time_tag === "string" ? latest.time_tag : null,
      alerts: Array.isArray(alerts) ? alerts.slice(0, 5) : [],
      fetchedAt: new Date().toISOString(),
    };
    memoryCache.set("space-weather", result, 60); // 1 dakika
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    res.status(502).json({ error: message });
  }
});

export default router;
