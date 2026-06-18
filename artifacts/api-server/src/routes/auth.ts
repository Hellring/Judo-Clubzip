import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/me", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });

  if (!user) {
    const [created] = await db.insert(usersTable).values({
      clerkId,
      email: "",
      role: "coach",
    }).returning();
    user = created;
  }

  return res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    clubId: user.clubId,
    createdAt: user.createdAt.toISOString(),
  });
});

router.patch("/me", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const { firstName, lastName, role } = req.body;

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!existing) return res.status(404).json({ error: "User not found" });

  const [updated] = await db.update(usersTable)
    .set({ firstName, lastName, role })
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  return res.json({
    id: updated.id,
    clerkId: updated.clerkId,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.role,
    clubId: updated.clubId,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
