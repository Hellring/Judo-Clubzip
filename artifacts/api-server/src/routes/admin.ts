import { Router } from "express";
import { requireAuth, getAuth, clerkClient } from "@clerk/express";
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

router.post("/users", async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const { email, password, firstName, lastName, role = "coach", clubId } =
    req.body as { email?: string; password?: string; firstName?: string; lastName?: string; role?: string; clubId?: number | null };

  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  try {
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      skipPasswordChecks: false,
    });

    const [dbUser] = await db.insert(usersTable).values({
      clerkId: clerkUser.id,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      role: role as "super_admin" | "club_admin" | "coach" | "athlete" | "parent",
      clubId: clubId ?? null,
    }).returning();

    const club = dbUser.clubId
      ? await db.query.clubsTable.findFirst({ where: eq(clubsTable.id, dbUser.clubId) })
      : null;

    return res.status(201).json({
      ...dbUser,
      clubName: club?.name ?? null,
      createdAt: dbUser.createdAt.toISOString(),
    });
  } catch (err: any) {
    const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Failed to create user";
    return res.status(400).json({ error: msg });
  }
});

router.post("/invitations", async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const { emailAddress } = req.body as { emailAddress?: string };
  if (!emailAddress) return res.status(400).json({ error: "emailAddress is required" });

  try {
    await clerkClient.invitations.createInvitation({ emailAddress });
    return res.status(201).json({ success: true, message: `Invitation sent to ${emailAddress}` });
  } catch (err: any) {
    const msg = err?.errors?.[0]?.message ?? err?.message ?? "Failed to send invitation";
    return res.status(400).json({ success: false, message: msg });
  }
});

export default router;
