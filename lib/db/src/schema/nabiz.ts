import { pgTable, serial, integer, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const nabizLogsTable = pgTable("nabiz_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNabizLogSchema = createInsertSchema(nabizLogsTable).omit({ id: true, createdAt: true });
export type InsertNabizLog = z.infer<typeof insertNabizLogSchema>;
export type NabizLog = typeof nabizLogsTable.$inferSelect;
