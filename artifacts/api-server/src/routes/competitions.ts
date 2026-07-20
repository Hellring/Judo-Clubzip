import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  competitionsTable,
  weightCategoriesTable,
  participantsTable,
  athletesTable,
  fightsTable,
  weighInsTable,
} from "@workspace/db";
import { eq, count, and, sql } from "drizzle-orm";

const router = Router();

async function getParticipantCount(competitionId: number) {
  const [r] = await db
    .select({ count: count() })
    .from(participantsTable)
    .where(eq(participantsTable.competitionId, competitionId));
  return Number(r?.count ?? 0);
}

function formatComp(c: typeof competitionsTable.$inferSelect, participantCount: number) {
  return { ...c, createdAt: c.createdAt.toISOString(), participantCount };
}

router.get("/", async (req, res) => {
  const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
  const comps = clubId
    ? await db.select().from(competitionsTable).where(eq(competitionsTable.clubId, clubId))
    : await db.select().from(competitionsTable);
  const result = await Promise.all(
    comps.map(async (c) => formatComp(c, await getParticipantCount(c.id)))
  );
  return res.json(result);
});

router.post("/", requireAuth(), async (req, res) => {
  const { clubId, name, location, lat, lng, date, format, fightDurationSeconds } = req.body;
  if (!clubId || !name || !date || !format) {
    return res.status(400).json({ error: "clubId, name, date, format are required" });
  }
  const [comp] = await db
    .insert(competitionsTable)
    .values({ clubId, name, location, lat, lng, date, format, fightDurationSeconds: fightDurationSeconds ?? 240 })
    .returning();
  return res.status(201).json(formatComp(comp, 0));
});

router.get("/:competitionId", async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const comp = await db.query.competitionsTable.findFirst({
    where: eq(competitionsTable.id, competitionId),
  });
  if (!comp) return res.status(404).json({ error: "Competition not found" });

  const categories = await db
    .select()
    .from(weightCategoriesTable)
    .where(eq(weightCategoriesTable.competitionId, competitionId));

  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const [r] = await db
        .select({ count: count() })
        .from(participantsTable)
        .where(
          and(
            eq(participantsTable.competitionId, competitionId),
            eq(participantsTable.categoryId, cat.id)
          )
        );
      return { ...cat, participantCount: Number(r?.count ?? 0) };
    })
  );

  return res.json({
    ...formatComp(comp, await getParticipantCount(competitionId)),
    categories: categoriesWithCount,
  });
});

router.patch("/:competitionId", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { name, location, lat, lng, date, format, fightDurationSeconds, status } = req.body;
  const [updated] = await db
    .update(competitionsTable)
    .set({ name, location, lat, lng, date, format, fightDurationSeconds, status })
    .where(eq(competitionsTable.id, competitionId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Competition not found" });
  return res.json(formatComp(updated, await getParticipantCount(competitionId)));
});

router.delete("/:competitionId", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  await db.delete(competitionsTable).where(eq(competitionsTable.id, competitionId));
  return res.status(204).send();
});

// Weight categories
router.get("/:competitionId/categories", async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const cats = await db
    .select()
    .from(weightCategoriesTable)
    .where(eq(weightCategoriesTable.competitionId, competitionId));
  const result = await Promise.all(
    cats.map(async (cat) => {
      const [r] = await db
        .select({ count: count() })
        .from(participantsTable)
        .where(
          and(
            eq(participantsTable.competitionId, competitionId),
            eq(participantsTable.categoryId, cat.id)
          )
        );
      return { ...cat, participantCount: Number(r?.count ?? 0) };
    })
  );
  return res.json(result);
});

router.post("/:competitionId/categories", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { name, gender, maxWeightKg, minWeightKg } = req.body;
  if (!name || !gender) return res.status(400).json({ error: "name, gender are required" });
  const [cat] = await db
    .insert(weightCategoriesTable)
    .values({ competitionId, name, gender, minWeightKg, maxWeightKg })
    .returning();
  return res.status(201).json({ ...cat, participantCount: 0 });
});

router.patch("/:competitionId/categories/:categoryId", requireAuth(), async (req, res) => {
  const categoryId = parseInt(req.params.categoryId as string);
  const competitionId = parseInt(req.params.competitionId as string);
  const { durationSeconds, wazaAriForIppon, minWeightKg, maxWeightKg } = req.body as { durationSeconds?: number | null; wazaAriForIppon?: number; minWeightKg?: number | null; maxWeightKg?: number | null };
  const updateData: Record<string, unknown> = {};
  if (durationSeconds !== undefined) updateData.durationSeconds = durationSeconds;
  if (wazaAriForIppon !== undefined) updateData.wazaAriForIppon = wazaAriForIppon;
  if (minWeightKg !== undefined) updateData.minWeightKg = minWeightKg;
  if (maxWeightKg !== undefined) updateData.maxWeightKg = maxWeightKg;
  const [updated] = await db.update(weightCategoriesTable).set(updateData).where(eq(weightCategoriesTable.id, categoryId)).returning();
  if (!updated) return res.status(404).json({ error: "Category not found" });
  const [r] = await db.select({ count: count() }).from(participantsTable).where(and(eq(participantsTable.competitionId, competitionId), eq(participantsTable.categoryId, categoryId)));
  return res.json({ ...updated, participantCount: Number(r?.count ?? 0) });
});

router.delete("/:competitionId/categories/:categoryId", requireAuth(), async (req, res) => {
  const categoryId = parseInt(req.params.categoryId as string);
  await db.delete(weightCategoriesTable).where(eq(weightCategoriesTable.id, categoryId));
  return res.status(204).send();
});

// Participants
router.get("/:competitionId/participants", async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const participants = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.competitionId, competitionId));
  const result = await Promise.all(
    participants.map(async (p) => {
      const athlete = await db.query.athletesTable.findFirst({
        where: eq(athletesTable.id, p.athleteId),
      });
      return {
        ...p,
        athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null,
      };
    })
  );
  return res.json(result);
});

router.post("/:competitionId/participants", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { athleteId, categoryId, seed } = req.body;
  if (!athleteId || !categoryId) {
    return res.status(400).json({ error: "athleteId, categoryId are required" });
  }
  const [p] = await db
    .insert(participantsTable)
    .values({ competitionId, athleteId, categoryId, seed })
    .returning();
  const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, athleteId) });
  return res.status(201).json({
    ...p,
    athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null,
  });
});

router.delete("/:competitionId/participants/:participantId", requireAuth(), async (req, res) => {
  const participantId = parseInt(req.params.participantId as string);
  await db.delete(participantsTable).where(eq(participantsTable.id, participantId));
  return res.status(204).send();
});

// Generate bracket
router.post("/:competitionId/generate-bracket", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { categoryId, separateClubs = false, tatamiCount = 1 } = req.body as {
    categoryId?: number;
    separateClubs?: boolean;
    tatamiCount?: number;
  };
  if (!categoryId) return res.status(400).json({ error: "categoryId is required" });

  const comp = await db.query.competitionsTable.findFirst({
    where: eq(competitionsTable.id, competitionId),
  });
  if (!comp) return res.status(404).json({ error: "Competition not found" });

  const participants = await db
    .select()
    .from(participantsTable)
    .where(
      and(
        eq(participantsTable.competitionId, competitionId),
        eq(participantsTable.categoryId, categoryId)
      )
    );

  // Delete existing fights for this category
  await db
    .delete(fightsTable)
    .where(
      and(
        eq(fightsTable.competitionId, competitionId),
        eq(fightsTable.categoryId, categoryId)
      )
    );

  // Load athletes to get club info for separation
  const athleteData = await Promise.all(
    participants.map(async (p) => {
      const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, p.athleteId) });
      return { athleteId: p.athleteId, seed: p.seed, clubId: athlete?.clubId ?? null };
    })
  );

  // Sort by seed (seeded athletes first, then randomize unseeded)
  const seeded = athleteData.filter(a => a.seed != null).sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
  const unseeded = athleteData.filter(a => a.seed == null).sort(() => Math.random() - 0.5);
  const ordered = [...seeded, ...unseeded];

  // Club separation: shuffle so same-club athletes are spread across bracket
  function separateByClub(athletes: typeof ordered): typeof ordered {
    if (!separateClubs) return athletes;
    // Place athletes alternating clubs to minimize first-round same-club matchups
    const result: typeof ordered = [];
    const remaining = [...athletes];
    while (remaining.length > 0) {
      const lastClub = result.length > 0 ? result[result.length - 1].clubId : null;
      const diffClubIdx = remaining.findIndex(a => a.clubId !== lastClub);
      if (diffClubIdx >= 0) {
        result.push(...remaining.splice(diffClubIdx, 1));
      } else {
        result.push(...remaining.splice(0, 1));
      }
    }
    return result;
  }

  const arranged = separateByClub(ordered);
  const athleteIds = arranged.map(a => a.athleteId);
  const numTatami = Math.max(1, Math.min(tatamiCount, 10));
  const fights: (typeof fightsTable.$inferSelect)[] = [];

  if (comp.format === "olympic") {
    // Single elimination bracket
    const rounds: number[][][] = [];
    let current = athleteIds;
    while (current.length > 1) {
      const roundFights: number[][] = [];
      for (let i = 0; i < current.length - 1; i += 2) {
        roundFights.push([current[i], current[i + 1]]);
      }
      if (current.length % 2 === 1) {
        roundFights.push([current[current.length - 1], -1]);
      }
      rounds.push(roundFights);
      current = roundFights.map(() => -1);
    }

    let position = 1;
    let tatamiCounter = 1;
    for (let r = 0; r < rounds.length; r++) {
      for (const [a1, a2] of rounds[r]) {
        const [fight] = await db
          .insert(fightsTable)
          .values({
            competitionId,
            categoryId,
            athlete1Id: a1 > 0 ? a1 : null,
            athlete2Id: a2 > 0 ? a2 : null,
            round: r + 1,
            position: position++,
            tatami: ((tatamiCounter++ - 1) % numTatami) + 1,
          })
          .returning();
        fights.push(fight);
      }
    }
  } else {
    // Round robin — every athlete fights every other athlete
    let position = 1;
    let tatamiCounter = 1;
    for (let i = 0; i < athleteIds.length; i++) {
      for (let j = i + 1; j < athleteIds.length; j++) {
        const [fight] = await db
          .insert(fightsTable)
          .values({
            competitionId,
            categoryId,
            athlete1Id: athleteIds[i],
            athlete2Id: athleteIds[j],
            round: 1,
            position: position++,
            tatami: ((tatamiCounter++ - 1) % numTatami) + 1,
          })
          .returning();
        fights.push(fight);
      }
    }
  }

  // Load athletes for response
  const result = await Promise.all(
    fights.map(async (f) => {
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
    })
  );

  return res.json(result);
});

// ---------- Weigh-ins ----------
router.get("/:competitionId/weigh-ins", async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const records = await db.select().from(weighInsTable).where(eq(weighInsTable.competitionId, competitionId));
  const result = await Promise.all(records.map(async (wi) => {
    const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, wi.athleteId) });
    return {
      ...wi,
      weighedAt: wi.weighedAt ? wi.weighedAt.toISOString() : null,
      athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null,
    };
  }));
  return res.json(result);
});

router.post("/:competitionId/weigh-ins", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { participantId, athleteId, actualWeightKg, passed } = req.body;
  if (!participantId || !athleteId) return res.status(400).json({ error: "participantId and athleteId are required" });

  const existing = await db.query.weighInsTable.findFirst({
    where: and(eq(weighInsTable.competitionId, competitionId), eq(weighInsTable.participantId, participantId)),
  });

  if (existing) {
    const [updated] = await db.update(weighInsTable)
      .set({ actualWeightKg, passed: passed ?? existing.passed, weighedAt: new Date() })
      .where(eq(weighInsTable.id, existing.id))
      .returning();
    const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, updated.athleteId) });
    return res.json({ ...updated, weighedAt: updated.weighedAt?.toISOString() ?? null, athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null });
  } else {
    const [created] = await db.insert(weighInsTable)
      .values({ competitionId, participantId, athleteId, actualWeightKg, passed: passed ?? false, weighedAt: new Date() })
      .returning();
    const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, created.athleteId) });
    return res.status(201).json({ ...created, weighedAt: created.weighedAt?.toISOString() ?? null, athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null });
  }
});

// ---------- Auto-assign categories by actual weigh-in weight ----------
router.post("/:competitionId/auto-assign", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const categories = await db.select().from(weightCategoriesTable).where(eq(weightCategoriesTable.competitionId, competitionId));
  const passedWeighIns = await db.select().from(weighInsTable).where(
    and(eq(weighInsTable.competitionId, competitionId), eq(weighInsTable.passed, true))
  );

  let assigned = 0, skipped = 0;
  for (const wi of passedWeighIns) {
    if (wi.actualWeightKg == null) { skipped++; continue; }
    const cat = categories.find(c => {
      const minOk = c.minWeightKg == null || wi.actualWeightKg! >= c.minWeightKg;
      const maxOk = c.maxWeightKg == null || wi.actualWeightKg! <= c.maxWeightKg;
      return minOk && maxOk;
    });
    if (!cat) { skipped++; continue; }

    const existingP = await db.query.participantsTable.findFirst({
      where: and(eq(participantsTable.competitionId, competitionId), eq(participantsTable.athleteId, wi.athleteId)),
    });

    if (existingP) {
      await db.update(participantsTable).set({ categoryId: cat.id }).where(eq(participantsTable.id, existingP.id));
    } else {
      await db.insert(participantsTable).values({ competitionId, athleteId: wi.athleteId, categoryId: cat.id });
    }
    assigned++;
  }
  return res.json({ assigned, skipped });
});

// ---------- Protocol (round-robin standings) ----------
router.get("/:competitionId/protocol/:categoryId", async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const categoryId = parseInt(req.params.categoryId as string);

  const finishedFights = await db.select().from(fightsTable).where(
    and(eq(fightsTable.competitionId, competitionId), eq(fightsTable.categoryId, categoryId), eq(fightsTable.status, "finished"))
  );
  const catParticipants = await db.select().from(participantsTable).where(
    and(eq(participantsTable.competitionId, competitionId), eq(participantsTable.categoryId, categoryId))
  );

  const standings = await Promise.all(catParticipants.map(async (p) => {
    const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, p.athleteId) });
    const myFights = finishedFights.filter(f => f.athlete1Id === p.athleteId || f.athlete2Id === p.athleteId);
    let wins = 0, losses = 0, totalIppons = 0, totalWazaAri = 0, totalYuko = 0;
    for (const f of myFights) {
      const isA1 = f.athlete1Id === p.athleteId;
      totalIppons += isA1 ? f.athlete1Ippon : f.athlete2Ippon;
      totalWazaAri += isA1 ? f.athlete1WazaAri : f.athlete2WazaAri;
      totalYuko += isA1 ? f.athlete1Yuko : f.athlete2Yuko;
      if (f.winnerId === p.athleteId) wins++;
      else if (f.winnerId !== null) losses++;
    }
    return {
      athleteId: p.athleteId, participantId: p.id,
      athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null,
      wins, losses, fightCount: myFights.length, points: wins * 2,
      totalIppons, totalWazaAri, totalYuko,
    };
  }));

  standings.sort((a, b) => b.points - a.points || b.totalIppons - a.totalIppons || b.totalWazaAri - a.totalWazaAri);
  return res.json(standings.map((s, i) => ({ ...s, place: i + 1 })));
});

export default router;
