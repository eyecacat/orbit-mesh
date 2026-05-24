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

router.get("/hayat-agi/contacts", authMiddleware, async (req: AuthRequest, res) => {
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.userId, req.userId!));
  res.json(contacts);
});

router.post("/hayat-agi/contacts", authMiddleware, async (req: AuthRequest, res) => {
  const { name, phone, relationship } = req.body as { name: string; phone: string; relationship: string };
  const [contact] = await db.insert(contactsTable).values({
    userId: req.userId!,
    name,
    phone,
    relationship,
  }).returning();
  res.status(201).json(contact);
});

router.delete("/hayat-agi/contacts/:id", authMiddleware, async (req: AuthRequest, res) => {
  await db.delete(contactsTable).where(
    and(eq(contactsTable.id, parseInt(req.params.id!)), eq(contactsTable.userId, req.userId!))
  );
  res.json({ success: true });
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
    const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
    const admin = await db.select().from(usersTable).where(eq(usersTable.id, group.adminId)).then(r => r[0]);
    result.push({
      ...group,
      memberCount: members.length + 1,
      adminName: admin?.name ?? "Bilinmiyor",
      isAdmin: group.adminId === req.userId,
    });
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
  const admin = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).then(r => r[0]);
  res.status(201).json({
    ...group,
    memberCount: 1,
    adminName: admin?.name ?? "Bilinmiyor",
    isAdmin: true,
  });
});

router.get("/hayat-agi/groups/:groupId/members", authMiddleware, async (req: AuthRequest, res) => {
  const groupId = parseInt(req.params.groupId!);
  const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).then(r => r[0]);
  if (!group) return res.status(404).json({ message: "Grup bulunamadı" });

  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
  const result = await Promise.all(members.map(async m => {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).then(r => r[0]);
    return {
      id: m.id,
      groupId: m.groupId,
      userId: m.userId,
      userName: user?.name ?? "Bilinmiyor",
      userEmail: user?.email ?? "",
      userCity: user?.city ?? null,
      joinedAt: m.joinedAt.toISOString(),
    };
  }));

  const admin = await db.select().from(usersTable).where(eq(usersTable.id, group.adminId)).then(r => r[0]);
  const adminMember = {
    id: 0,
    groupId,
    userId: group.adminId,
    userName: (admin?.name ?? "Bilinmiyor") + " (Yönetici)",
    userEmail: admin?.email ?? "",
    userCity: admin?.city ?? null,
    joinedAt: group.createdAt.toISOString(),
  };

  res.json([adminMember, ...result]);
});

router.post("/hayat-agi/groups/:groupId/members", authMiddleware, async (req: AuthRequest, res) => {
  const groupId = parseInt(req.params.groupId!);
  const { email } = req.body as { email: string };

  const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).then(r => r[0]);
  if (!group) return res.status(404).json({ message: "Grup bulunamadı" });
  if (group.adminId !== req.userId) return res.status(403).json({ message: "Sadece yönetici üye ekleyebilir" });

  const targetUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).then(r => r[0]);
  if (!targetUser) return res.status(404).json({ message: "Bu email'e sahip kullanıcı bulunamadı" });

  const existing = await db.select().from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUser.id)))
    .then(r => r[0]);
  if (existing) return res.status(400).json({ message: "Kullanıcı zaten grupta" });

  const [member] = await db.insert(groupMembersTable).values({
    groupId,
    userId: targetUser.id,
  }).returning();

  res.status(201).json({
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    userName: targetUser.name,
    userEmail: targetUser.email,
    userCity: targetUser.city ?? null,
    joinedAt: member.joinedAt.toISOString(),
  });
});

router.delete("/hayat-agi/groups/:groupId/members/:userId", authMiddleware, async (req: AuthRequest, res) => {
  const groupId = parseInt(req.params.groupId!);
  const userId = parseInt(req.params.userId!);

  const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).then(r => r[0]);
  if (!group) return res.status(404).json({ message: "Grup bulunamadı" });
  if (group.adminId !== req.userId) return res.status(403).json({ message: "Sadece yönetici üye çıkarabilir" });

  await db.delete(groupMembersTable).where(
    and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId))
  );
  res.json({ success: true });
});

export default router;
