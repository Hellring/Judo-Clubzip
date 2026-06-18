import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const athletesTable = pgTable("athletes", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  birthDate: text("birth_date"),
  gender: text("gender", { enum: ["male", "female"] }).notNull(),
  weightKg: real("weight_kg"),
  belt: text("belt"),
  phone: text("phone"),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAthleteSchema = createInsertSchema(athletesTable).omit({ id: true, createdAt: true });
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type Athlete = typeof athletesTable.$inferSelect;
