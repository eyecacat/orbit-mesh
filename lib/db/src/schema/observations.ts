import { pgTable, serial, text, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const observationsTable = pgTable("observations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // meteor, planet, star, nebula, anomaly, other
  title: text("title").notNull(),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  photoUrl: text("photo_url"),
  isPublic: boolean("is_public").notNull().default(true),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertObservationSchema = createInsertSchema(observationsTable).omit({ id: true, createdAt: true, likeCount: true, commentCount: true });
export type InsertObservation = z.infer<typeof insertObservationSchema>;
export type Observation = typeof observationsTable.$inferSelect;
