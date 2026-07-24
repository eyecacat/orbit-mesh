// ============================================================
// ORBIT-MESH — Türk Uydu TLE Proxy (Vercel Serverless Function)
// ------------------------------------------------------------
// Celestrak/NORAD üzerinden gerçek TLE verisini çeker.
// Kullanım: GET /api/satellites/tle?norad=25544
// ============================================================

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Sadece GET destekleniyor." });
    return;
  }

  const { norad } = req.query ?? {};

  if (!norad || typeof norad !== "string" || !/^\d{1,6}$/.test(norad)) {
    res.status(400).json({ error: "Gecerli NORAD ID gerekli (ornegin 25544)." });
    return;
  }

  try {
    let text = "";
    let name: string | undefined;

    const direct = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${norad}&FORMAT=TLE`);
    if (direct.ok) {
      text = await direct.text();
    }

    const directLines = text.split("\n").map(s => s.trim()).filter(Boolean);

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

    res.status(200).json({
      norad,
      name: name ?? (lines.length >= 3 ? lines[0] : undefined),
      line1,
      line2,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    res.status(502).json({ error: message });
  }
}
