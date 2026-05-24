import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const magnetometerLogsTable = pgTable("magnetometer_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  x: real("x").notNull(),
  y: real("y").notNull(),
  z: real("z").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMagnetometerLogSchema = createInsertSchema(magnetometerLogsTable).omit({ id: true, createdAt: true });
export type InsertMagnetometerLog = z.infer<typeof insertMagnetometerLogSchema>;
export type MagnetometerLog = typeof magnetometerLogsTable.$inferSelect;
