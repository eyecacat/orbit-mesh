import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/openrouter", async (req, res) => {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "OpenRouter API key not configured on server" });
    return;
  }

  const { messages, model, temperature } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "'messages' alani zorunlu ve bos olamaz." });
    return;
  }

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://orbit-mesh.replit.app",
        "X-Title": "ORBIT-MESH",
      },
      body: JSON.stringify({
        model: model || "openai/gpt-4o-mini",
        messages,
        temperature: typeof temperature === "number" ? temperature : 0.4,
      }),
    });

    const data = (await upstream.json()) as any;

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || `OpenRouter HTTP ${upstream.status}` });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    res.status(502).json({ error: message });
  }
});

export default router;
