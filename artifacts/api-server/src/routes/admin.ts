import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db, usersTable, clubsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.use(requireAuth());

async function isSuperAdmin(req: Parameters<typeof getAuth>[0]): Promise<boolean> {
  const { userId } = getAuth(req);
  if (!userId) return false;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, userId) });
  return user?.role === "super_admin";
}

router.get("/users", async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const users = await db.select({
    id: usersTable.id,
    clerkId: usersTable.clerkId,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    role: usersTable.role,
    clubId: usersTable.clubId,
    clubName: clubsTable.name,
    createdAt: usersTable.createdAt,
  })
    .from(usersTable)
    .leftJoin(clubsTable, eq(usersTable.clubId, clubsTable.id))
    .orderBy(usersTable.createdAt);

  return res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

router.patch("/users/:userId", async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const userId = parseInt(req.params.userId as string);
  const { role, clubId } = req.body as { role?: string; clubId?: number | null };

  const updateData: Record<string, unknown> = {};
  if (role !== undefined) updateData.role = role;
  if (clubId !== undefined) updateData.clubId = clubId;

  const [updated] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) return res.status(404).json({ error: "User not found" });

  const club = updated.clubId
    ? await db.query.clubsTable.findFirst({ where: eq(clubsTable.id, updated.clubId) })
    : null;

  return res.json({
    ...updated,
    clubName: club?.name ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
