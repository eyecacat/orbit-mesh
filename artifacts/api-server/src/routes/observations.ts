import { Router } from "express";
import { db } from "@workspace/db";
import { observationsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/observations", authMiddleware, async (req: AuthRequest, res) => {
  const isPublic = req.query["public"] === "true";
  const rows = await db.select({
    id: observationsTable.id,
    userId: observationsTable.userId,
    userName: usersTable.name,
    type: observationsTable.type,
    title: observationsTable.title,
    description: observationsTable.description,
    latitude: observationsTable.latitude,
    longitude: observationsTable.longitude,
    photoUrl: observationsTable.photoUrl,
    isPublic: observationsTable.isPublic,
    likeCount: observationsTable.likeCount,
    commentCount: observationsTable.commentCount,
    createdAt: observationsTable.createdAt,
  })
    .from(observationsTable)
    .leftJoin(usersTable, eq(observationsTable.userId, usersTable.id))
    .orderBy(desc(observationsTable.createdAt))
    .limit(50);

  const filtered = isPublic ? rows.filter(r => r.isPublic) : rows.filter(r => r.userId === req.userId);
  res.json(filtered.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), userName: r.userName ?? "Anonim" })));
});

router.post("/observations", authMiddleware, async (req: AuthRequest, res) => {
  const { type, title, description, latitude, longitude, photoUrl, isPublic } = req.body as {
    type: string; title: string; description?: string; latitude?: number; longitude?: number; photoUrl?: string; isPublic?: boolean;
  };
  const [obs] = await db.insert(observationsTable).values({
    userId: req.userId!,
    type,
    title,
    description: description ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    photoUrl: photoUrl ?? null,
    isPublic: isPublic ?? true,
  }).returning();
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
  res.status(201).json({ ...obs, userName: user?.name ?? "Anonim", likeCount: 0, commentCount: 0, createdAt: obs.createdAt.toISOString() });
});

router.put("/observations/:id", authMiddleware, async (req: AuthRequest, res) => {
  const id = parseInt(req.params["id"]!);
  const { type, title, description, latitude, longitude, photoUrl, isPublic } = req.body as {
    type?: string; title?: string; description?: string; latitude?: number; longitude?: number; photoUrl?: string; isPublic?: boolean;
  };
  const [obs] = await db.update(observationsTable)
    .set({ type, title, description, latitude, longitude, photoUrl, isPublic })
    .where(eq(observationsTable.id, id))
    .returning();
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
  res.json({ ...obs, userName: user?.name ?? "Anonim", createdAt: obs.createdAt.toISOString() });
});

router.delete("/observations/:id", authMiddleware, async (req: AuthRequest, res) => {
  const id = parseInt(req.params["id"]!);
  await db.delete(observationsTable).where(eq(observationsTable.id, id));
  res.json({ success: true, message: "Gözlem silindi" });
});

export default router;
