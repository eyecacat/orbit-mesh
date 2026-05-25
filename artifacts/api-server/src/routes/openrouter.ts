import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages, insertConversationSchema, insertMessageSchema } from "@workspace/db";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { eq, asc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.post("/openrouter/conversations", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = insertConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  const [conv] = await db.insert(conversations).values(parsed.data).returning();
  res.status(201).json(conv);
});

router.get("/openrouter/conversations", authMiddleware, async (_req: AuthRequest, res) => {
  const convs = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(convs);
});

router.get("/openrouter/conversations/:id", authMiddleware, async (req: AuthRequest, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Bulunamadı" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.post("/openrouter/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Konuşma bulunamadı" }); return; }

  const parsed = insertMessageSchema.safeParse({ conversationId: id, role: "user", content: req.body.content });
  if (!parsed.success || !req.body.content) {
    res.status(400).json({ error: "İçerik gerekli" });
    return;
  }

  await db.insert(messages).values({ conversationId: id, role: "user", content: req.body.content });

  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let fullContent = "";
  try {
    const stream = await openrouter.chat.completions.create({
      model: "openai/gpt-oss-120b:free",
      stream: true,
      messages: [
        {
          role: "system",
          content: "Sen ORBIT-MESH'in yapay zeka asistanısın. Uzay, astronomi, gökyüzü gözlemi ve Türkiye'deki bilim konularında uzman, meraklı ve teşvik edici bir Türkçe rehbersin. Her zaman Türkçe yanıt ver. Kısa, net ve ilham verici ol."
        },
        ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullContent });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI yanıt veremedi" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
