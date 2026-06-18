import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clubsTable = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city"),
  country: text("country"),
  description: text("description"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clubMembersTable = pgTable("club_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clubId: integer("club_id").notNull(),
  role: text("role", { enum: ["admin", "coach"] }).notNull().default("coach"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertClubSchema = createInsertSchema(clubsTable).omit({ id: true, createdAt: true });
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubsTable.$inferSelect;

export const insertClubMemberSchema = createInsertSchema(clubMembersTable).omit({ id: true, joinedAt: true });
export type InsertClubMember = z.infer<typeof insertClubMemberSchema>;
export type ClubMember = typeof clubMembersTable.$inferSelect;
