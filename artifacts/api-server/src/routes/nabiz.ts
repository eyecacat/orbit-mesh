import { Router } from "express";
import { db } from "@workspace/db";
import { nabizLogsTable, contactsTable, usersTable } from "@workspace/db";
import { eq, desc, gte, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.post("/nabiz/pulse", authMiddleware, async (req: AuthRequest, res) => {
  const { city, latitude, longitude } = req.body as { city: string; latitude?: number; longitude?: number };
  await db.insert(nabizLogsTable).values({
    userId: req.userId!,
    city: city ?? "Bilinmiyor",
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  });
  res.json({ success: true, message: "Nabız güncellendi" });
});

router.get("/nabiz/score", authMiddleware, async (req: AuthRequest, res) => {
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.userId, req.userId!));
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const silentContacts: { name: string; daysSilent: number }[] = [];
  let activeContacts = 0;

  for (const contact of contacts) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, contact.phone));
    if (!user) continue;
    const recentLogs = await db.select().from(nabizLogsTable)
      .where(eq(nabizLogsTable.userId, user.id))
      .orderBy(desc(nabizLogsTable.createdAt))
      .limit(1);
    if (recentLogs.length === 0 || recentLogs[0]!.createdAt < fortyEightHoursAgo) {
      const daysSilent = recentLogs.length > 0
        ? Math.floor((Date.now() - recentLogs[0]!.createdAt.getTime()) / (24 * 60 * 60 * 1000))
        : 999;
      silentContacts.push({ name: contact.name, daysSilent });
    } else {
      activeContacts++;
    }
  }

  const score = contacts.length === 0 ? 100 : Math.round((activeContacts / contacts.length) * 100);

  res.json({
    score,
    networkSize: contacts.length,
    activeContacts,
    silentContacts,
    lastUpdated: new Date().toISOString(),
  });
});

router.get("/nabiz/global", async (_req, res) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeUsers = await db.select({ count: sql<number>`count(distinct ${nabizLogsTable.userId})` })
    .from(nabizLogsTable)
    .where(gte(nabizLogsTable.createdAt, oneDayAgo));

  const cityStats = await db.select({
    city: nabizLogsTable.city,
    count: sql<number>`count(distinct ${nabizLogsTable.userId})`,
  })
    .from(nabizLogsTable)
    .where(gte(nabizLogsTable.createdAt, oneDayAgo))
    .groupBy(nabizLogsTable.city)
    .limit(20);

  const cityCoords: Record<string, { lat: number; lng: number; country: string }> = {
    "Istanbul": { lat: 41.0082, lng: 28.9784, country: "Türkiye" },
    "Ankara": { lat: 39.9334, lng: 32.8597, country: "Türkiye" },
    "Izmir": { lat: 38.4189, lng: 27.1287, country: "Türkiye" },
    "Antalya": { lat: 36.8841, lng: 30.7056, country: "Türkiye" },
    "Bursa": { lat: 40.1885, lng: 29.0610, country: "Türkiye" },
    "London": { lat: 51.5074, lng: -0.1278, country: "UK" },
    "Berlin": { lat: 52.5200, lng: 13.4050, country: "Germany" },
    "New York": { lat: 40.7128, lng: -74.0060, country: "USA" },
  };

  const regions = cityStats.map(cs => {
    const coords = cityCoords[cs.city] ?? { lat: 0, lng: 0, country: "Bilinmiyor" };
    return {
      city: cs.city,
      country: coords.country,
      activeUsers: Number(cs.count),
      pulseScore: Math.min(100, Number(cs.count) * 10),
      latitude: coords.lat,
      longitude: coords.lng,
    };
  });

  res.json({
    totalActiveUsers: Number(activeUsers[0]?.count ?? 0),
    regions,
    globalScore: Math.min(100, Number(activeUsers[0]?.count ?? 0) * 2),
  });
});

export default router;
