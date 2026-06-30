// ============================================================
// ORBIT-MESH — OpenRouter Proxy (Vercel Serverless Function)
// ------------------------------------------------------------
// Bu dosya Vercel'in kendi native Node.js Serverless Functions
// mekanizmasini kullanir (Expo build pipeline'indan BAGIMSIZ).
// Vercel, proje kokunde /api/*.ts gordugunde bunlari otomatik
// olarak serverless function'a cevirir — Expo'nun statik export
// modunda olup olmamasindan etkilenmez, garanti calisir.
//
// OPENROUTER_API_KEY, Vercel Dashboard > Settings > Environment
// Variables icinde (EXPO_PUBLIC_ ONEKI OLMADAN) tanimlanmali.
// ============================================================

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Sadece POST destekleniyor." });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "Sunucu yapilandirma hatasi: OPENROUTER_API_KEY tanimli degil." });
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
        "HTTP-Referer": "https://orbit-eta-orpin.vercel.app",
        "X-Title": "ORBIT-MESH",
      },
      body: JSON.stringify({
        model: model || "openai/gpt-4o-mini",
        messages,
        temperature: typeof temperature === "number" ? temperature : 0.4,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || `OpenRouter HTTP ${upstream.status}` });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    res.status(502).json({ error: message });
  }
}