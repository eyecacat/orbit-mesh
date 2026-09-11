import { Router, type IRouter } from "express";
import { memoryCache } from "../lib/cache";

const router: IRouter = Router();

router.get("/satellites/tle", async (req, res) => {
  const norad = typeof req.query?.norad === "string" ? req.query.norad : "";
  if (!/^\d{1,6}$/.test(norad)) {
    res.status(400).json({ error: "Gecerli NORAD ID gerekli (ornegin 25544)." });
    return;
  }

  const cacheKey = `satellite:tle:${norad}`;

  const cached = memoryCache.get(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  try {
    let text = "";
    let name: string | undefined;

    // 1) Direkt NORAD sorgusu
    const direct = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${norad}&FORMAT=TLE`);
    if (direct.ok) {
      text = await direct.text();
    }

    const directLines = text.split("\n").map(s => s.trim()).filter(Boolean);

    // 2) Direkt sorgu bos veya basarisizsa, geo/resource gruplarindan ara
    if (directLines.length < 2) {
      const [geoRes, resourceRes] = await Promise.all([
        fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=TLE"),
        fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=TLE"),
      ]);

      const candidateTexts = [];
      if (geoRes.ok) candidateTexts.push(await geoRes.text());
      if (resourceRes.ok) candidateTexts.push(await resourceRes.text());

      if (candidateTexts.length === 0) {
        res.status(502).json({ error: "Celestrak grup verisi alinamadi." });
        return;
      }

      for (const groupText of candidateTexts) {
        const groupLines = groupText.split("\n").map(s => s.trim()).filter(Boolean);
        for (let i = 0; i < groupLines.length - 2; i++) {
          const possibleName = groupLines[i];
          const line1Candidate = groupLines[i + 1];
          const line2Candidate = groupLines[i + 2];
          if (!line1Candidate.startsWith("1 ") || !line2Candidate.startsWith("2 ")) continue;
          const catalogNo = line1Candidate.substring(2, 7).trim();
          if (catalogNo === norad) {
            name = possibleName;
            text = [possibleName, line1Candidate, line2Candidate].join("\n");
            break;
          }
        }
        if (text) break;
      }
    }

    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
    if (lines.length < 2) {
      res.status(404).json({ error: "TLE verisi bulunamadi." });
      return;
    }

    const line1 = lines.length >= 3 ? lines[1] : lines[0];
    const line2 = lines.length >= 3 ? lines[2] : lines[1];

    const result = {
      norad,
      name: name ?? (lines.length >= 3 ? lines[0] : undefined),
      line1,
      line2,
      fetchedAt: new Date().toISOString(),
    };
    memoryCache.set(cacheKey, result, 600); // 10 dakika
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    res.status(502).json({ error: message });
  }
});

export default router;
