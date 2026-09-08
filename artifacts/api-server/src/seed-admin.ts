import { clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "hellring92@gmail.com";
const ADMIN_FIRST_NAME = "Admin";
const ADMIN_LAST_NAME = "User";

export async function seedAdminUser() {
  try {
    const clerkUsers = await clerkClient.users.getUserList({
      emailAddress: [ADMIN_EMAIL],
    });

    let clerkId: string;

    if (clerkUsers.totalCount === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        throw new Error(
          "ADMIN_PASSWORD must be set before creating the predefined admin user",
        );
      }
      const created = await clerkClient.users.createUser({
        emailAddress: [ADMIN_EMAIL],
        password: adminPassword,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        skipPasswordChecks: false,
      });
      clerkId = created.id;
    } else {
      clerkId = clerkUsers.data[0].id;
    }

    const existing = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });

    if (!existing) {
      await db.insert(usersTable).values({
        clerkId,
        email: ADMIN_EMAIL,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        role: "super_admin",
      });
    } else if (existing.role !== "super_admin") {
      await db.update(usersTable)
        .set({ role: "super_admin" })
        .where(eq(usersTable.clerkId, clerkId));
    }

    const dbByEmail = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, ADMIN_EMAIL),
    });
    if (dbByEmail && dbByEmail.clerkId !== clerkId) {
      await db.update(usersTable)
        .set({ clerkId, role: "super_admin" })
        .where(eq(usersTable.email, ADMIN_EMAIL));
    }

  } catch (err: any) {
    const msg = err?.errors?.[0]?.message ?? err?.message ?? String(err);
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists") || msg.toLowerCase().includes("duplicate")) {
      return;
    }
    console.warn("[seed-admin] Warning during admin seed:", msg);
  }
}
