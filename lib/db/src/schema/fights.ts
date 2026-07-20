import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fightsTable = pgTable("fights", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull(),
  categoryId: integer("category_id").notNull(),
  athlete1Id: integer("athlete1_id"),
  athlete2Id: integer("athlete2_id"),
  winnerId: integer("winner_id"),
  athlete1Ippon: integer("athlete1_ippon").notNull().default(0),
  athlete1WazaAri: integer("athlete1_waza_ari").notNull().default(0),
  athlete1Yuko: integer("athlete1_yuko").notNull().default(0),
  athlete1Shido: integer("athlete1_shido").notNull().default(0),
  athlete2Ippon: integer("athlete2_ippon").notNull().default(0),
  athlete2WazaAri: integer("athlete2_waza_ari").notNull().default(0),
  athlete2Yuko: integer("athlete2_yuko").notNull().default(0),
  athlete2Shido: integer("athlete2_shido").notNull().default(0),
  athlete1NoShow: boolean("athlete1_no_show").notNull().default(false),
  athlete2NoShow: boolean("athlete2_no_show").notNull().default(false),
  winMethod: text("win_method", { enum: ["ippon", "waza_ari", "yuko", "hansoku_make", "no_show", "points"] }),
  status: text("status", { enum: ["pending", "in_progress", "finished"] }).notNull().default("pending"),
  round: integer("round"),
  position: integer("position"),
  tatami: integer("tatami"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fightEventsTable = pgTable("fight_events", {
  id: serial("id").primaryKey(),
  fightId: integer("fight_id").notNull(),
  athleteId: integer("athlete_id").notNull(),
  eventType: text("event_type", { enum: ["ippon", "waza_ari", "yuko", "shido", "hansoku"] }).notNull(),
  timestampSeconds: integer("timestamp_seconds").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFightSchema = createInsertSchema(fightsTable).omit({ id: true, createdAt: true });
export type InsertFight = z.infer<typeof insertFightSchema>;
export type Fight = typeof fightsTable.$inferSelect;

export const insertFightEventSchema = createInsertSchema(fightEventsTable).omit({ id: true, createdAt: true });
export type InsertFightEvent = z.infer<typeof insertFightEventSchema>;
export type FightEvent = typeof fightEventsTable.$inferSelect;
