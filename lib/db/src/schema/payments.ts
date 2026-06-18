import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull(),
  clubId: integer("club_id").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("RUB"),
  description: text("description").notNull(),
  dueDate: text("due_date"),
  paidAt: text("paid_at"),
  status: text("status", { enum: ["pending", "paid", "overdue"] }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
