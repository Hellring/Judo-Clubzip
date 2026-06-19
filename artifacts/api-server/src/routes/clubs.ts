import { Router } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { clubsTable, clubMembersTable, usersTable, athletesTable, competitionsTable, paymentsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const clubs = await db.select().from(clubsTable);

  const result = await Promise.all(clubs.map(async (club) => {
    const [memberCount] = await db.select({ count: count() }).from(clubMembersTable).where(eq(clubMembersTable.clubId, club.id));
    const [athleteCount] = await db.select({ count: count() }).from(athletesTable).where(eq(athletesTable.clubId, club.id));
    return {
      ...club,
      createdAt: club.createdAt.toISOString(),
      memberCount: Number(memberCount?.count ?? 0),
      athleteCount: Number(athleteCount?.count ?? 0),
    };
  }));

  return res.json(result);
});

router.post("/", requireAuth(), async (req, res) => {
  const { name, city, country, description, logoUrl } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const [club] = await db.insert(clubsTable).values({ name, city, country, description, logoUrl }).returning();
  return res.status(201).json({ ...club, createdAt: club.createdAt.toISOString(), memberCount: 0, athleteCount: 0 });
});

router.get("/:clubId", async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  const club = await db.query.clubsTable.findFirst({ where: eq(clubsTable.id, clubId) });
  if (!club) return res.status(404).json({ error: "Club not found" });

  const [memberCount] = await db.select({ count: count() }).from(clubMembersTable).where(eq(clubMembersTable.clubId, clubId));
  const [athleteCount] = await db.select({ count: count() }).from(athletesTable).where(eq(athletesTable.clubId, clubId));

  return res.json({
    ...club,
    createdAt: club.createdAt.toISOString(),
    memberCount: Number(memberCount?.count ?? 0),
    athleteCount: Number(athleteCount?.count ?? 0),
  });
});

router.patch("/:clubId", requireAuth(), async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  const { name, city, country, description, logoUrl } = req.body;

  const [updated] = await db.update(clubsTable)
    .set({ name, city, country, description, logoUrl })
    .where(eq(clubsTable.id, clubId))
    .returning();

  if (!updated) return res.status(404).json({ error: "Club not found" });

  const [memberCount] = await db.select({ count: count() }).from(clubMembersTable).where(eq(clubMembersTable.clubId, clubId));
  const [athleteCount] = await db.select({ count: count() }).from(athletesTable).where(eq(athletesTable.clubId, clubId));

  return res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    memberCount: Number(memberCount?.count ?? 0),
    athleteCount: Number(athleteCount?.count ?? 0),
  });
});

router.delete("/:clubId", requireAuth(), async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  await db.delete(clubsTable).where(eq(clubsTable.id, clubId));
  return res.status(204).send();
});

router.get("/:clubId/stats", async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  const club = await db.query.clubsTable.findFirst({ where: eq(clubsTable.id, clubId) });
  if (!club) return res.status(404).json({ error: "Club not found" });

  const [athleteCount] = await db.select({ count: count() }).from(athletesTable).where(eq(athletesTable.clubId, clubId));
  const [coachCount] = await db.select({ count: count() }).from(clubMembersTable).where(eq(clubMembersTable.clubId, clubId));
  const [compCount] = await db.select({ count: count() }).from(competitionsTable).where(eq(competitionsTable.clubId, clubId));

  const athleteIds = (await db.select({ id: athletesTable.id }).from(athletesTable).where(eq(athletesTable.clubId, clubId))).map(a => a.id);

  let pendingPayments = 0, paidPayments = 0, overduePayments = 0;
  if (athleteIds.length > 0) {
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.clubId, clubId));
    pendingPayments = payments.filter(p => p.status === "pending").length;
    paidPayments = payments.filter(p => p.status === "paid").length;
    overduePayments = payments.filter(p => p.status === "overdue").length;
  }

  const recentComps = await db.select().from(competitionsTable)
    .where(eq(competitionsTable.clubId, clubId))
    .orderBy(sql`${competitionsTable.createdAt} desc`)
    .limit(5);

  const recentCompetitions = await Promise.all(recentComps.map(async (comp) => {
    const [pCount] = await db.select({ count: count() }).from(athletesTable).where(eq(athletesTable.clubId, clubId));
    return { ...comp, createdAt: comp.createdAt.toISOString(), participantCount: 0 };
  }));

  return res.json({
    clubId,
    totalAthletes: Number(athleteCount?.count ?? 0),
    totalCoaches: Number(coachCount?.count ?? 0),
    totalCompetitions: Number(compCount?.count ?? 0),
    totalFights: 0,
    pendingPayments,
    paidPayments,
    overduePayments,
    recentCompetitions,
  });
});

router.get("/:clubId/members", async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  const members = await db.select().from(clubMembersTable).where(eq(clubMembersTable.clubId, clubId));

  const result = await Promise.all(members.map(async (m) => {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, m.userId) });
    return {
      ...m,
      joinedAt: m.joinedAt.toISOString(),
      user: user ? { ...user, createdAt: user.createdAt.toISOString() } : null,
    };
  }));

  return res.json(result);
});

router.post("/:clubId/members", requireAuth(), async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  const { email, role, firstName, lastName } = req.body;
  if (!email || !role) return res.status(400).json({ error: "email and role are required" });

  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  if (!user) {
    const [created] = await db.insert(usersTable).values({
      clerkId: `invited_${Date.now()}`,
      email,
      role: "coach",
      firstName: firstName ?? null,
      lastName: lastName ?? null,
    }).returning();
    user = created;
  } else if (firstName || lastName) {
    const [updated] = await db.update(usersTable)
      .set({
        firstName: firstName ?? user.firstName,
        lastName: lastName ?? user.lastName,
      })
      .where(eq(usersTable.id, user.id))
      .returning();
    user = updated;
  }

  const [member] = await db.insert(clubMembersTable).values({ userId: user.id, clubId, role }).returning();
  return res.status(201).json({
    ...member,
    joinedAt: member.joinedAt.toISOString(),
    user: { ...user, createdAt: user.createdAt.toISOString() },
  });
});

router.delete("/:clubId/members/:memberId", requireAuth(), async (req, res) => {
  const memberId = parseInt(req.params.memberId as string);
  await db.delete(clubMembersTable).where(eq(clubMembersTable.id, memberId));
  return res.status(204).send();
});

router.get("/:clubId/athletes", async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  const athletes = await db.select().from(athletesTable).where(eq(athletesTable.clubId, clubId));
  return res.json(athletes.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

router.get("/:clubId/coaches", async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  const coaches = await db.select({
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
    .where(eq(usersTable.clubId, clubId));
  return res.json(coaches.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

router.get("/:clubId/payment-summary", async (req, res) => {
  const clubId = parseInt(req.params.clubId as string);
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.clubId, clubId));

  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const paidPayments = payments.filter(p => p.status === "paid");
  const pendingPayments = payments.filter(p => p.status === "pending");
  const overduePayments = payments.filter(p => p.status === "overdue");

  return res.json({
    clubId,
    totalAmount,
    paidAmount: paidPayments.reduce((s, p) => s + p.amount, 0),
    pendingAmount: pendingPayments.reduce((s, p) => s + p.amount, 0),
    overdueAmount: overduePayments.reduce((s, p) => s + p.amount, 0),
    paidCount: paidPayments.length,
    pendingCount: pendingPayments.length,
    overdueCount: overduePayments.length,
  });
});

export default router;
