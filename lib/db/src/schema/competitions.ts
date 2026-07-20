import { pgTable, serial, text, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const competitionsTable = pgTable("competitions", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  name: text("name").notNull(),
  location: text("location"),
  lat: real("lat"),
  lng: real("lng"),
  date: text("date").notNull(),
  format: text("format", { enum: ["olympic", "round_robin"] }).notNull(),
  fightDurationSeconds: integer("fight_duration_seconds").notNull().default(240),
  status: text("status", { enum: ["draft", "active", "finished"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const weightCategoriesTable = pgTable("weight_categories", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull(),
  name: text("name").notNull(),
  gender: text("gender", { enum: ["male", "female", "mixed"] }).notNull(),
  minWeightKg: real("min_weight_kg"),
  maxWeightKg: real("max_weight_kg"),
  durationSeconds: integer("duration_seconds"),
  wazaAriForIppon: integer("waza_ari_for_ippon").notNull().default(2),
});

export const participantsTable = pgTable("participants", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull(),
  athleteId: integer("athlete_id").notNull(),
  categoryId: integer("category_id").notNull(),
  seed: integer("seed"),
});

export const weighInsTable = pgTable("weigh_ins", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull(),
  participantId: integer("participant_id").notNull(),
  athleteId: integer("athlete_id").notNull(),
  actualWeightKg: real("actual_weight_kg"),
  passed: boolean("passed").notNull().default(false),
  weighedAt: timestamp("weighed_at"),
});

export const insertWeighInSchema = createInsertSchema(weighInsTable).omit({ id: true });
export type InsertWeighIn = z.infer<typeof insertWeighInSchema>;
export type WeighIn = typeof weighInsTable.$inferSelect;

export const insertCompetitionSchema = createInsertSchema(competitionsTable).omit({ id: true, createdAt: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitionsTable.$inferSelect;

export const insertWeightCategorySchema = createInsertSchema(weightCategoriesTable).omit({ id: true });
export type InsertWeightCategory = z.infer<typeof insertWeightCategorySchema>;
export type WeightCategory = typeof weightCategoriesTable.$inferSelect;

export const insertParticipantSchema = createInsertSchema(participantsTable).omit({ id: true });
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participantsTable.$inferSelect;
