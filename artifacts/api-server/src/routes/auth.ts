import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, signToken, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { name, email, password, city } = req.body as { name: string; email: string; password: string; city?: string };
  if (!name || !email || !password) {
    res.status(400).json({ error: "Bad Request", message: "Ad, email ve şifre zorunlu" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Bu email zaten kullanımda" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, city }).returning();
  const token = signToken(user.id);
  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, city: user.city, photoUrl: user.photoUrl, nabizScore: user.nabizScore, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "Bad Request", message: "Email ve şifre zorunlu" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Geçersiz email veya şifre" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Geçersiz email veya şifre" });
    return;
  }
  const token = signToken(user.id);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, city: user.city, photoUrl: user.photoUrl, nabizScore: user.nabizScore, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true, message: "Çıkış yapıldı" });
});

router.get("/auth/me", authMiddleware, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Kullanıcı bulunamadı" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, city: user.city, photoUrl: user.photoUrl, nabizScore: user.nabizScore, createdAt: user.createdAt });
});

router.put("/auth/profile", authMiddleware, async (req: AuthRequest, res) => {
  const { name, city, photoUrl } = req.body as { name?: string; city?: string; photoUrl?: string };
  const [user] = await db.update(usersTable)
    .set({ name, city, photoUrl, updatedAt: new Date() })
    .where(eq(usersTable.id, req.userId!))
    .returning();
  res.json({ id: user.id, name: user.name, email: user.email, city: user.city, photoUrl: user.photoUrl, nabizScore: user.nabizScore, createdAt: user.createdAt });
});

router.get("/auth/contacts", authMiddleware, async (req: AuthRequest, res) => {
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.userId, req.userId!));
  res.json(contacts);
});

router.post("/auth/contacts", authMiddleware, async (req: AuthRequest, res) => {
  const { name, phone, relationship } = req.body as { name: string; phone: string; relationship: string };
  const existingContacts = await db.select().from(contactsTable).where(eq(contactsTable.userId, req.userId!));
  if (existingContacts.length >= 5) {
    res.status(400).json({ error: "Bad Request", message: "En fazla 5 acil kişi ekleyebilirsiniz" });
    return;
  }
  const [contact] = await db.insert(contactsTable).values({ userId: req.userId!, name, phone, relationship }).returning();
  res.status(201).json(contact);
});

router.delete("/auth/contacts/:id", authMiddleware, async (req: AuthRequest, res) => {
  const id = parseInt(req.params["id"]!);
  await db.delete(contactsTable).where(eq(contactsTable.id, id));
  res.json({ success: true, message: "Kişi silindi" });
});

export default router;
