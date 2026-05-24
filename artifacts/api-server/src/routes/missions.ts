import { Router } from "express";
import { db } from "@workspace/db";
import { missionsTable, missionCompletionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();

async function seedMissions() {
  const existing = await db.select().from(missionsTable).limit(1);
  if (existing.length > 0) return;
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(missionsTable).values([
    {
      title: "Meteor Yağmuru Gözlemi",
      description: "Bu hafta şehrinizde görünen meteor yağmurunu gözlemleyin ve kaydedin. Minimum 3 meteor gözlemi yapın.",
      type: "observation",
      badge: "silver",
      startDate: now,
      endDate: nextWeek,
      isActive: true,
      participantCount: 142,
    },
    {
      title: "Manyetik Anomali Taraması",
      description: "Şehrinizde manyetometre okumalarını 24 saat boyunca izleyin ve anormal değerleri raporlayın.",
      type: "magnetometer",
      badge: "gold",
      startDate: now,
      endDate: nextWeek,
      isActive: true,
      participantCount: 67,
    },
    {
      title: "Komşu Ağı Büyütme",
      description: "HayatAğı grubunuza bu hafta en az 3 yeni üye ekleyin ve hepsinin günlük check-in yapmasını sağlayın.",
      type: "community",
      badge: "bronze",
      startDate: now,
      endDate: nextWeek,
      isActive: true,
      participantCount: 389,
    },
  ]);
}

router.get("/missions", authMiddleware, async (req: AuthRequest, res) => {
  await seedMissions();
  const missions = await db.select().from(missionsTable).where(eq(missionsTable.isActive, true));
  const completions = await db.select().from(missionCompletionsTable).where(eq(missionCompletionsTable.userId, req.userId!));
  const completedIds = new Set(completions.map(c => c.missionId));

  res.json(missions.map(m => ({
    ...m,
    isCompleted: completedIds.has(m.id),
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
  })));
});

router.post("/missions/:id/complete", authMiddleware, async (req: AuthRequest, res) => {
  const missionId = parseInt(req.params["id"]!);
  const { notes } = req.body as { notes: string };

  const existing = await db.select().from(missionCompletionsTable)
    .where(and(eq(missionCompletionsTable.missionId, missionId), eq(missionCompletionsTable.userId, req.userId!)));

  if (existing.length > 0) {
    res.json({ success: true, message: "Görev zaten tamamlandı" });
    return;
  }

  await db.insert(missionCompletionsTable).values({ missionId, userId: req.userId!, notes });
  await db.update(missionsTable)
    .set({ participantCount: (await db.select().from(missionsTable).where(eq(missionsTable.id, missionId)))[0]!.participantCount! + 1 })
    .where(eq(missionsTable.id, missionId));

  res.json({ success: true, message: "Görev tamamlandı! Rozet kazandınız!" });
});

export default router;
