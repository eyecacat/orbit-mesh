import { Router, type Request, type Response } from "express";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OpenRouter API key not configured" });
    return;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://orbit-mesh.replit.app",
        "X-Title": "ORBIT-MESH",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content:
              "Sen ORBIT-MESH'in yapay zeka asistanısın. Türkçe yanıt ver. Astronomi, uzay bilimi, Deneyap Kart, BLE ağları, VLF sinyalleri, jeomanyetik fırtınalar ve güvenlik ağları konularında bilgili ve yardımcısın. ORBIT-MESH, öğrenci tabanlı bir astronomi gözlem ve iletişim ağı platformudur. Cevaplarını kısa, açık ve bilimsel tut.",
          },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      req.log.error({ status: response.status, body: errText }, "OpenRouter error");
      res.status(502).json({ error: "AI servisine ulaşılamadı" });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "AI chat error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
