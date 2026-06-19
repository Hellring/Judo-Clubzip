import { pgTable, serial, integer, real, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weightLogsTable = pgTable("weight_logs", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull(),
  weightKg: real("weight_kg").notNull(),
  note: text("note"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const insertWeightLogSchema = createInsertSchema(weightLogsTable).omit({ id: true, recordedAt: true });
export type InsertWeightLog = z.infer<typeof insertWeightLogSchema>;
export type WeightLog = typeof weightLogsTable.$inferSelect;
