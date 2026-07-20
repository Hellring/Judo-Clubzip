import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { fightsTable, fightEventsTable, athletesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function formatFight(f: typeof fightsTable.$inferSelect) {
  const a1 = f.athlete1Id
    ? await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, f.athlete1Id) })
    : null;
  const a2 = f.athlete2Id
    ? await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, f.athlete2Id) })
    : null;
  return {
    ...f,
    athlete1: a1 ? { ...a1, createdAt: a1.createdAt.toISOString() } : null,
    athlete2: a2 ? { ...a2, createdAt: a2.createdAt.toISOString() } : null,
  };
}

// GET /api/competitions/:competitionId/fights — mounted in index.ts
export async function listFightsHandler(req: any, res: any) {
  const competitionId = parseInt(req.params.competitionId as string);
  const fights = await db
    .select()
    .from(fightsTable)
    .where(eq(fightsTable.competitionId, competitionId));
  const result = await Promise.all(fights.map(formatFight));
  return res.json(result);
}

// Fight router — mounted at /api/fights
router.get("/:fightId", async (req, res) => {
  const fightId = parseInt(req.params.fightId as string);
  const fight = await db.query.fightsTable.findFirst({ where: eq(fightsTable.id, fightId) });
  if (!fight) return res.status(404).json({ error: "Fight not found" });

  const events = await db
    .select()
    .from(fightEventsTable)
    .where(eq(fightEventsTable.fightId, fightId));

  const formatted = await formatFight(fight);
  return res.json({
    ...formatted,
    events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
  });
});

router.patch("/:fightId", requireAuth(), async (req, res) => {
  const fightId = parseInt(req.params.fightId as string);
  const {
    athlete1Ippon, athlete1WazaAri, athlete1Yuko, athlete1Shido,
    athlete2Ippon, athlete2WazaAri, athlete2Yuko, athlete2Shido,
    athlete1NoShow, athlete2NoShow, winMethod,
    winnerId, status,
  } = req.body;
  const updateFields: Record<string, unknown> = {};
  if (athlete1Ippon !== undefined) updateFields.athlete1Ippon = athlete1Ippon;
  if (athlete1WazaAri !== undefined) updateFields.athlete1WazaAri = athlete1WazaAri;
  if (athlete1Yuko !== undefined) updateFields.athlete1Yuko = athlete1Yuko;
  if (athlete1Shido !== undefined) updateFields.athlete1Shido = athlete1Shido;
  if (athlete2Ippon !== undefined) updateFields.athlete2Ippon = athlete2Ippon;
  if (athlete2WazaAri !== undefined) updateFields.athlete2WazaAri = athlete2WazaAri;
  if (athlete2Yuko !== undefined) updateFields.athlete2Yuko = athlete2Yuko;
  if (athlete2Shido !== undefined) updateFields.athlete2Shido = athlete2Shido;
  if (athlete1NoShow !== undefined) updateFields.athlete1NoShow = athlete1NoShow;
  if (athlete2NoShow !== undefined) updateFields.athlete2NoShow = athlete2NoShow;
  if (winMethod !== undefined) updateFields.winMethod = winMethod;
  if (winnerId !== undefined) updateFields.winnerId = winnerId;
  if (status !== undefined) {
    updateFields.status = status;
    if (status === "finished") updateFields.finishedAt = new Date().toISOString();
  }
  const [updated] = await db
    .update(fightsTable)
    .set(updateFields)
    .where(eq(fightsTable.id, fightId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Fight not found" });
  return res.json(await formatFight(updated));
});

router.post("/:fightId/start", requireAuth(), async (req, res) => {
  const fightId = parseInt(req.params.fightId as string);
  const [updated] = await db
    .update(fightsTable)
    .set({ status: "in_progress", startedAt: new Date().toISOString() })
    .where(eq(fightsTable.id, fightId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Fight not found" });
  return res.json(await formatFight(updated));
});

router.post("/:fightId/finish", requireAuth(), async (req, res) => {
  const fightId = parseInt(req.params.fightId as string);
  const { winnerId, durationSeconds } = req.body;
  const [updated] = await db
    .update(fightsTable)
    .set({
      status: "finished",
      winnerId: winnerId ?? null,
      finishedAt: new Date().toISOString(),
      durationSeconds,
    })
    .where(eq(fightsTable.id, fightId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Fight not found" });
  return res.json(await formatFight(updated));
});

router.get("/:fightId/events", async (req, res) => {
  const fightId = parseInt(req.params.fightId as string);
  const events = await db
    .select()
    .from(fightEventsTable)
    .where(eq(fightEventsTable.fightId, fightId));
  return res.json(events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })));
});

router.post("/:fightId/events", requireAuth(), async (req, res) => {
  const fightId = parseInt(req.params.fightId as string);
  const { athleteId, eventType, timestampSeconds } = req.body;
  if (!athleteId || !eventType || timestampSeconds === undefined) {
    return res.status(400).json({ error: "athleteId, eventType, timestampSeconds are required" });
  }

  const [event] = await db
    .insert(fightEventsTable)
    .values({ fightId, athleteId, eventType, timestampSeconds })
    .returning();

  // Recalculate scores from events
  const allEvents = await db
    .select()
    .from(fightEventsTable)
    .where(eq(fightEventsTable.fightId, fightId));

  const fight = await db.query.fightsTable.findFirst({ where: eq(fightsTable.id, fightId) });
  if (fight) {
    const a1Id = fight.athlete1Id;
    const a2Id = fight.athlete2Id;

    const a1Events = allEvents.filter((e) => e.athleteId === a1Id);
    const a2Events = allEvents.filter((e) => e.athleteId === a2Id);

    const count = (events: typeof allEvents, type: string) =>
      events.filter((e) => e.eventType === type).length;

    const a1Ippon = count(a1Events, "ippon");
    const a1WazaAri = count(a1Events, "waza_ari");
    const a1Yuko = count(a1Events, "yuko");
    const a1Shido = count(a1Events, "shido");
    const a2Ippon = count(a2Events, "ippon");
    const a2WazaAri = count(a2Events, "waza_ari");
    const a2Yuko = count(a2Events, "yuko");
    const a2Shido = count(a2Events, "shido");

    // Auto-finish on ippon or hansoku
    const a1Hansoku = count(a1Events, "hansoku");
    const a2Hansoku = count(a2Events, "hansoku");

    let winnerId: number | null = fight.winnerId;
    let status = fight.status;

    if (eventType === "ippon") {
      winnerId = athleteId;
      status = "finished";
    } else if (eventType === "hansoku") {
      // Hansoku disqualifies the athlete — opponent wins
      winnerId = athleteId === a1Id ? a2Id : a1Id;
      status = "finished";
    }

    await db
      .update(fightsTable)
      .set({
        athlete1Ippon: a1Ippon,
        athlete1WazaAri: a1WazaAri,
        athlete1Yuko: a1Yuko,
        athlete1Shido: a1Shido,
        athlete2Ippon: a2Ippon,
        athlete2WazaAri: a2WazaAri,
        athlete2Yuko: a2Yuko,
        athlete2Shido: a2Shido,
        winnerId,
        status,
        ...(status === "finished" ? { finishedAt: new Date().toISOString() } : {}),
      })
      .where(eq(fightsTable.id, fightId));
  }

  return res.status(201).json({ ...event, createdAt: event.createdAt.toISOString() });
});

router.delete("/:fightId/events/:eventId", requireAuth(), async (req, res) => {
  const fightId = parseInt(req.params.fightId as string);
  const eventId = parseInt(req.params.eventId as string);
  await db.delete(fightEventsTable).where(eq(fightEventsTable.id, eventId));

  // Recalculate scores after deletion
  const allEvents = await db
    .select()
    .from(fightEventsTable)
    .where(eq(fightEventsTable.fightId, fightId));
  const fight = await db.query.fightsTable.findFirst({ where: eq(fightsTable.id, fightId) });
  if (fight) {
    const a1Id = fight.athlete1Id;
    const a2Id = fight.athlete2Id;
    const a1Events = allEvents.filter((e) => e.athleteId === a1Id);
    const a2Events = allEvents.filter((e) => e.athleteId === a2Id);
    const cnt = (evts: typeof allEvents, type: string) => evts.filter((e) => e.eventType === type).length;
    await db.update(fightsTable).set({
      athlete1Ippon: cnt(a1Events, "ippon"),
      athlete1WazaAri: cnt(a1Events, "waza_ari"),
      athlete1Yuko: cnt(a1Events, "yuko"),
      athlete1Shido: cnt(a1Events, "shido"),
      athlete2Ippon: cnt(a2Events, "ippon"),
      athlete2WazaAri: cnt(a2Events, "waza_ari"),
      athlete2Yuko: cnt(a2Events, "yuko"),
      athlete2Shido: cnt(a2Events, "shido"),
    }).where(eq(fightsTable.id, fightId));
  }

  return res.status(204).send();
});

export default router;
