import { Router } from "express";
import { db } from "@workspace/db";
import { checkinsTable, contactsTable, usersTable, groupsTable, groupMembersTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.post("/hayat-agi/checkin", authMiddleware, async (req: AuthRequest, res) => {
  const { status, latitude, longitude } = req.body as { status: string; latitude?: number; longitude?: number };
  const [checkin] = await db.insert(checkinsTable).values({
    userId: req.userId!,
    status,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  }).returning();
  res.json(checkin);
});

router.get("/hayat-agi/network", authMiddleware, async (req: AuthRequest, res) => {
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.userId, req.userId!));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const myCheckins = await db.select().from(checkinsTable)
    .where(and(eq(checkinsTable.userId, req.userId!), gte(checkinsTable.createdAt, today)))
    .orderBy(desc(checkinsTable.createdAt)).limit(1);

  const members = await Promise.all(contacts.map(async (contact) => {
    const users = await db.select().from(usersTable).where(eq(usersTable.email, contact.phone));
    const contactUser = users[0];
    if (!contactUser) {
      return {
        id: contact.id,
        name: contact.name,
        city: null,
        todayStatus: null,
        lastCheckin: null,
        relationship: contact.relationship,
      };
    }
    const lastCheckins = await db.select().from(checkinsTable)
      .where(and(eq(checkinsTable.userId, contactUser.id), gte(checkinsTable.createdAt, today)))
      .orderBy(desc(checkinsTable.createdAt)).limit(1);
    return {
      id: contactUser.id,
      name: contact.name,
      city: contactUser.city,
      todayStatus: lastCheckins[0]?.status ?? null,
      lastCheckin: lastCheckins[0]?.createdAt?.toISOString() ?? null,
      relationship: contact.relationship,
    };
  }));

  const okCount = members.filter(m => m.todayStatus === "ok").length;
  const alertCount = members.filter(m => m.todayStatus === "alert").length;
  const pendingCount = members.filter(m => m.todayStatus === null).length;

  res.json({
    myStatus: myCheckins[0]?.status ?? null,
    members,
    totalCount: members.length,
    okCount,
    alertCount,
    pendingCount,
  });
});

router.get("/hayat-agi/history", authMiddleware, async (req: AuthRequest, res) => {
  const checkins = await db.select().from(checkinsTable)
    .where(eq(checkinsTable.userId, req.userId!))
    .orderBy(desc(checkinsTable.createdAt))
    .limit(30);
  res.json(checkins);
});

router.get("/hayat-agi/streak", authMiddleware, async (req: AuthRequest, res) => {
  const checkins = await db.select().from(checkinsTable)
    .where(eq(checkinsTable.userId, req.userId!))
    .orderBy(desc(checkinsTable.createdAt))
    .limit(365);

  let streak = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  const today = new Date();

  const dateSet = new Set<string>();
  checkins.forEach(c => {
    dateSet.add(c.createdAt.toISOString().split("T")[0]!);
  });

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0]!;
    if (dateSet.has(key)) {
      currentStreak++;
      if (i === 0 || i === 1) streak = currentStreak;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      if (i > 1) break;
      currentStreak = 0;
    }
  }

  res.json({
    streak,
    longestStreak,
    lastCheckin: checkins[0]?.createdAt?.toISOString() ?? null,
    message: streak > 0 ? `Ağınız ${streak} gündür güvende!` : "Bugün henüz check-in yapmadınız",
  });
});

router.get("/hayat-agi/groups", authMiddleware, async (req: AuthRequest, res) => {
  const memberships = await db.select().from(groupMembersTable).where(eq(groupMembersTable.userId, req.userId!));
  const adminGroups = await db.select().from(groupsTable).where(eq(groupsTable.adminId, req.userId!));

  const allGroupIds = new Set([...memberships.map(m => m.groupId), ...adminGroups.map(g => g.id)]);
  const result = [];
  for (const groupId of allGroupIds) {
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    if (!group) continue;
    const memberCount = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
    result.push({ ...group, memberCount: memberCount.length + 1 });
  }
  res.json(result);
});

router.post("/hayat-agi/groups", authMiddleware, async (req: AuthRequest, res) => {
  const { name, checkInTime } = req.body as { name: string; checkInTime: string };
  const [group] = await db.insert(groupsTable).values({
    name,
    adminId: req.userId!,
    checkInTime: checkInTime ?? "21:00",
  }).returning();
  res.status(201).json({ ...group, memberCount: 1 });
});

export default router;
