import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { athletesTable, fightsTable, paymentsTable } from "@workspace/db";
import { eq, or, and, sql } from "drizzle-orm";

const router = Router();

function formatAthlete(a: typeof athletesTable.$inferSelect) {
  return { ...a, createdAt: a.createdAt.toISOString() };
}

router.get("/", async (req, res) => {
  const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
  const athletes = clubId
    ? await db.select().from(athletesTable).where(eq(athletesTable.clubId, clubId))
    : await db.select().from(athletesTable);
  return res.json(athletes.map(formatAthlete));
});

router.post("/", requireAuth(), async (req, res) => {
  const { clubId, firstName, lastName, birthDate, gender, weightKg, belt, phone, parentName, parentPhone, notes } = req.body;
  if (!clubId || !firstName || !lastName || !gender) {
    return res.status(400).json({ error: "clubId, firstName, lastName, gender are required" });
  }
  const [athlete] = await db.insert(athletesTable)
    .values({ clubId, firstName, lastName, birthDate, gender, weightKg, belt, phone, parentName, parentPhone, notes })
    .returning();
  return res.status(201).json(formatAthlete(athlete));
});

router.get("/:athleteId", async (req, res) => {
  const athleteId = parseInt(req.params.athleteId as string);
  const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, athleteId) });
  if (!athlete) return res.status(404).json({ error: "Athlete not found" });
  return res.json(formatAthlete(athlete));
});

router.patch("/:athleteId", requireAuth(), async (req, res) => {
  const athleteId = parseInt(req.params.athleteId as string);
  const { firstName, lastName, birthDate, gender, weightKg, belt, phone, parentName, parentPhone, notes } = req.body;
  const [updated] = await db.update(athletesTable)
    .set({ firstName, lastName, birthDate, gender, weightKg, belt, phone, parentName, parentPhone, notes })
    .where(eq(athletesTable.id, athleteId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Athlete not found" });
  return res.json(formatAthlete(updated));
});

router.delete("/:athleteId", requireAuth(), async (req, res) => {
  const athleteId = parseInt(req.params.athleteId as string);
  await db.delete(athletesTable).where(eq(athletesTable.id, athleteId));
  return res.status(204).send();
});

router.get("/:athleteId/stats", async (req, res) => {
  const athleteId = parseInt(req.params.athleteId as string);

  const fights = await db.select().from(fightsTable).where(
    and(
      eq(fightsTable.status, "finished"),
      or(eq(fightsTable.athlete1Id, athleteId), eq(fightsTable.athlete2Id, athleteId))
    )
  );

  const totalFights = fights.length;
  const wins = fights.filter(f => f.winnerId === athleteId).length;
  const losses = fights.filter(f => f.winnerId !== null && f.winnerId !== athleteId).length;
  const draws = fights.filter(f => f.winnerId === null).length;

  let ipponWins = 0, wazaAriWins = 0, shidoReceived = 0;
  fights.forEach(f => {
    if (f.winnerId === athleteId) {
      if (f.athlete1Id === athleteId) {
        ipponWins += f.athlete1Ippon;
        wazaAriWins += f.athlete1WazaAri;
      } else {
        ipponWins += f.athlete2Ippon;
        wazaAriWins += f.athlete2WazaAri;
      }
    }
    if (f.athlete1Id === athleteId) {
      shidoReceived += f.athlete1Shido;
    } else {
      shidoReceived += f.athlete2Shido;
    }
  });

  const lastFight = fights.sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))[0];

  return res.json({
    athleteId,
    totalFights,
    wins,
    losses,
    draws,
    ipponWins,
    wazaAriWins,
    shidoReceived,
    winRate: totalFights > 0 ? wins / totalFights : 0,
    lastFightDate: lastFight?.finishedAt ?? null,
  });
});

router.get("/:athleteId/fights", async (req, res) => {
  const athleteId = parseInt(req.params.athleteId as string);

  const fights = await db.select().from(fightsTable).where(
    or(eq(fightsTable.athlete1Id, athleteId), eq(fightsTable.athlete2Id, athleteId))
  );

  const result = await Promise.all(fights.map(async (f) => {
    const opponentId = f.athlete1Id === athleteId ? f.athlete2Id : f.athlete1Id;
    const opponent = opponentId
      ? await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, opponentId) })
      : null;

    return {
      id: f.id,
      competitionId: f.competitionId,
      categoryId: f.categoryId,
      competitionName: "",
      competitionDate: "",
      opponentId,
      opponent: opponent ? formatAthlete(opponent) : null,
      isWinner: f.winnerId === athleteId,
      status: f.status,
      athlete1Ippon: f.athlete1Ippon,
      athlete1WazaAri: f.athlete1WazaAri,
      athlete1Shido: f.athlete1Shido,
      athlete2Ippon: f.athlete2Ippon,
      athlete2WazaAri: f.athlete2WazaAri,
      athlete2Shido: f.athlete2Shido,
      finishedAt: f.finishedAt,
    };
  }));

  return res.json(result);
});

router.get("/:athleteId/payments", async (req, res) => {
  const athleteId = parseInt(req.params.athleteId as string);
  const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, athleteId) });
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.athleteId, athleteId));
  return res.json(payments.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    athlete: athlete ? formatAthlete(athlete) : null,
  })));
});

export default router;
