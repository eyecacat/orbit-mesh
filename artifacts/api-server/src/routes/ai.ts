import { Router, type Request, type Response } from "express";

const router = Router();

router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body;

  // 1. Gelen veri doğrulaması (Validation)
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  // 2. Replit Secrets'tan API key kontrolü (Her iki ihtimali de tarar)
  const apiKey =
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    // TypeScript'in tipi tanımama ihtimaline karşı güvenli logger kontrolü
    const logError = (req as any).log?.error
      ? (req as any).log.error.bind((req as any).log)
      : console.error;
    logError(
      "HATA: OpenRouter API anahtarı Replit Secrets üzerinde tanımlanmamış!",
    );

    res
      .status(500)
      .json({ error: "OpenRouter API key not configured on server" });
    return;
  }

  try {
    // 3. OpenRouter API'sine Güvenli Arka Plan İsteği
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://orbit-mesh.replit.app",
          "X-Title": "ORBIT-MESH",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash", // Kota dostu, hızlı ve kararlı Teknofest/Proje modeli
          messages: [
            {
              role: "system",
              content:
                "Sen ORBIT-MESH'in yapay zeka asistanısın. Türkçe yanıt ver. Astronomi, uzay bilimi, Deneyap Kart, BLE ağları, VLF sinyalleri, jeomanyetik fırtınalar ve güvenlik ağları konularında bilgili ve yardımcısın. ORBIT-MESH, öğrenci tabanlı bir astronomi gözlem ve iletişim ağı platformudur. Cevaplarını kısa, açık ve bilimsel tut.",
            },
            ...messages, // Kullanıcıdan gelen geçmiş mesaj dizisi
          ],
        }),
      },
    );

    // 4. API Yanıt Durumu Kontrolü
    if (!response.ok) {
      const errText = await response.text();
      const logError = (req as any).log?.error
        ? (req as any).log.error.bind((req as any).log)
        : console.error;
      logError(
        { status: response.status, body: errText },
        "OpenRouter API baglanti hatasi",
      );

      res.status(502).json({ error: "AI servisine ulaşılamadı" });
      return;
    }

    // 5. Başarılı veriyi frontend'e (APK'ya) paslama
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    // 6. Kritik Sistem Çökme Koruması (Catch-all)
    const logError = (req as any).log?.error
      ? (req as any).log.error.bind((req as any).log)
      : console.error;
    logError({ err: err?.message || err }, "Sunucu ici AI route hatasi");

    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
