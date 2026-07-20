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

async function getUsersWithParent() {
  const allUsers = await db.select({
    id: usersTable.id,
    clerkId: usersTable.clerkId,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    role: usersTable.role,
    clubId: usersTable.clubId,
    clubName: clubsTable.name,
    parentId: usersTable.parentId,
    createdAt: usersTable.createdAt,
  })
    .from(usersTable)
    .leftJoin(clubsTable, eq(usersTable.clubId, clubsTable.id))
    .orderBy(usersTable.createdAt);

  // Build a map for parent name lookup
  const idToName: Record<number, string> = {};
  for (const u of allUsers) {
    if (u.firstName || u.lastName) {
      idToName[u.id] = [u.firstName, u.lastName].filter(Boolean).join(" ");
    }
  }

  return allUsers.map(u => ({
    ...u,
    parentName: u.parentId ? (idToName[u.parentId] ?? null) : null,
    createdAt: u.createdAt.toISOString(),
  }));
}

router.get("/users", async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  return res.json(await getUsersWithParent());
});

router.patch("/users/:userId", async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const userId = parseInt(req.params.userId as string);
  const { role, clubId, parentId } = req.body as { role?: string; clubId?: number | null; parentId?: number | null };

  const updateData: Record<string, unknown> = {};
  if (role !== undefined) updateData.role = role;
  if (clubId !== undefined) updateData.clubId = clubId;
  if (parentId !== undefined) updateData.parentId = parentId;

  const [updated] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) return res.status(404).json({ error: "User not found" });

  // Fetch all users to build name map for parentName
  const allUsers = await getUsersWithParent();
  const result = allUsers.find(u => u.id === updated.id);

  return res.json(result ?? { ...updated, parentName: null, createdAt: updated.createdAt.toISOString() });
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

router.delete("/users/:userId", async (req, res) => {
  if (!(await isSuperAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const userId = parseInt(req.params.userId as string);
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Only attempt Clerk deletion for real Clerk users (not invited_ or placeholder IDs)
  if (user.clerkId && !user.clerkId.startsWith("invited_")) {
    try {
      await clerkClient.users.deleteUser(user.clerkId);
    } catch (err: any) {
      const status = err?.status ?? err?.clerkError ? err.errors?.[0]?.code : null;
      // If user not found in Clerk (already deleted or never registered), continue with DB deletion
      if (status !== 404 && err?.errors?.[0]?.code !== "resource_not_found") {
        const msg = err?.errors?.[0]?.message ?? err?.message ?? "Failed to delete user in Clerk";
        return res.status(400).json({ error: msg });
      }
    }
  }

  await db.delete(usersTable).where(eq(usersTable.id, userId));

  return res.status(200).json({ success: true });
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
