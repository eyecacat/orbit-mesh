import { Router } from "express";
import { db } from "@workspace/db";
import { magnetometerLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/magnetometer/logs", authMiddleware, async (req: AuthRequest, res) => {
  const logs = await db.select().from(magnetometerLogsTable)
    .where(eq(magnetometerLogsTable.userId, req.userId!))
    .orderBy(desc(magnetometerLogsTable.createdAt))
    .limit(50);
  res.json(logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })));
});

router.post("/magnetometer/logs", authMiddleware, async (req: AuthRequest, res) => {
  const { x, y, z, notes } = req.body as { x: number; y: number; z: number; notes?: string };
  const [log] = await db.insert(magnetometerLogsTable).values({
    userId: req.userId!,
    x,
    y,
    z,
    notes: notes ?? null,
  }).returning();
  res.status(201).json({ ...log, createdAt: log.createdAt.toISOString() });
});

export default router;
